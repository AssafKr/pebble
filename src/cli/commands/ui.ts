import { Command } from 'commander';
import express, { Response } from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import net from 'net';
import open from 'open';
import chokidar from 'chokidar';
import {
  getIssue,
  resolveId,
  hasOpenChildren,
  detectCycle,
  computeState,
  getDescendants,
  getComputedState,
  getAncestryBlocker,
} from '../lib/state.js';
import {
  readEventsFromFile,
  getOrCreatePebbleDir,
  appendEvent,
  getConfig,
  getEventSource,
} from '../lib/storage.js';
import { generateId } from '../lib/id.js';
import { outputError } from '../lib/output.js';
import type {
  CreateEvent,
  UpdateEvent,
  CloseEvent,
  ReopenEvent,
  CommentEvent,
  DeleteEvent,
  RestoreEvent,
  IssueType,
  IssueEvent,
  Priority,
  Issue,
} from '../../shared/types.js';
import { ISSUE_TYPES, STATUSES, PRIORITIES } from '../../shared/types.js';

// Check if a port is available
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

// Find an available port starting from the given port
async function findAvailablePort(startPort: number, maxAttempts = 10): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found (tried ${startPort}-${startPort + maxAttempts - 1})`);
}

// Multi-worktree: Issue with source tracking
interface IssueWithSource extends Issue {
  _sources: string[]; // File paths where this issue exists
}

/**
 * Merge events from multiple files, deduplicating by (issueId, timestamp, type).
 * Same event appearing in multiple files = keep first occurrence.
 */
function mergeEventsFromFiles(filePaths: string[]): IssueEvent[] {
  const merged = new Map<string, IssueEvent>();

  for (const filePath of filePaths) {
    const events = readEventsFromFile(filePath);
    for (const event of events) {
      const key = `${event.issueId}-${event.timestamp}-${event.type}`;
      if (!merged.has(key)) {
        merged.set(key, event);
      }
    }
  }

  // Sort by timestamp ascending (chronological order)
  return Array.from(merged.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Merge issues from multiple files.
 * Same ID = same issue: keep the version with the latest updatedAt.
 * Tracks which file(s) contain each issue.
 */
function mergeIssuesFromFiles(filePaths: string[]): IssueWithSource[] {
  const merged = new Map<string, { issue: Issue; sources: Set<string> }>();

  for (const filePath of filePaths) {
    const events = readEventsFromFile(filePath);
    const state = computeState(events);

    for (const [id, issue] of state) {
      const existing = merged.get(id);
      if (!existing) {
        // First time seeing this issue
        merged.set(id, { issue, sources: new Set([filePath]) });
      } else {
        // Issue exists in multiple files - keep the one with latest updatedAt
        existing.sources.add(filePath);
        if (new Date(issue.updatedAt) > new Date(existing.issue.updatedAt)) {
          merged.set(id, { issue, sources: existing.sources });
        }
      }
    }
  }

  return Array.from(merged.values()).map(({ issue, sources }) => ({
    ...issue,
    _sources: Array.from(sources),
  }));
}

/**
 * Find an issue by ID across all source files.
 * Returns the issue and which file to write mutations to.
 */
function findIssueInSources(
  issueId: string,
  filePaths: string[]
): { issue: Issue; targetFile: string } | null {
  // First, try to find by exact ID or prefix match
  const allIssues = mergeIssuesFromFiles(filePaths);

  // Try exact match first
  let found = allIssues.find((i) => i.id === issueId);

  // Try prefix match if no exact match
  if (!found) {
    const matches = allIssues.filter((i) => i.id.startsWith(issueId));
    if (matches.length === 1) {
      found = matches[0];
    } else if (matches.length > 1) {
      return null; // Ambiguous
    }
  }

  if (!found) {
    return null;
  }

  // Use the first source file (where the issue was most recently updated)
  const targetFile = found._sources[0];
  return { issue: found, targetFile };
}

/**
 * Append an event to a specific file (for multi-worktree mode).
 * Automatically adds source field if not present.
 */
function appendEventToFile(event: IssueEvent, filePath: string): void {
  // Add source if not already present
  const eventWithSource = event.source ? event : { ...event, source: getEventSource() };
  const line = JSON.stringify(eventWithSource) + '\n';
  fs.appendFileSync(filePath, line, 'utf-8');
}

export function uiCommand(program: Command): void {
  const defaultPort = process.env.PEBBLE_UI_PORT || '3333';

  program
    .command('ui')
    .description('Serve the React UI')
    .option('--port <port>', 'Port to serve on', defaultPort)
    .option('--no-open', 'Do not open browser automatically')
    .option('--files <paths>', 'Comma-separated paths to issues.jsonl files for multi-worktree view')
    .action(async (options) => {
      const pretty = program.opts().pretty ?? false;

      try {
        // Parse multi-worktree files option
        let issueFiles: string[] = [];
        if (options.files) {
          // Parse comma-separated paths
          issueFiles = options.files.split(',').map((p: string) => p.trim()).filter(Boolean);
          if (issueFiles.length === 0) {
            console.error('Error: --files option requires at least one path');
            process.exit(1);
          }
          // Resolve relative paths
          issueFiles = issueFiles.map((p: string) => path.resolve(process.cwd(), p));
          console.log(`Multi-worktree mode: watching ${issueFiles.length} file(s)`);
          for (const f of issueFiles) {
            console.log(`  - ${f}`);
          }
        } else {
          // Default: single file mode
          const pebbleDir = getOrCreatePebbleDir();
          issueFiles = [path.join(pebbleDir, 'issues.jsonl')];
        }

        // Auto-create .pebble if it doesn't exist (single file mode only)
        if (!options.files) {
          getOrCreatePebbleDir();
        }

        const app = express();

        // Middleware
        app.use(cors());
        app.use(express.json());

        // API routes
        // API routes - use multi-worktree merge when multiple files
        // This is now a function since issueFiles can change dynamically
        const isMultiWorktree = () => issueFiles.length > 1;

        // GET /api/sources - Returns available issue files (for multi-worktree)
        app.get('/api/sources', (_req, res) => {
          try {
            res.json({ files: issueFiles, isMultiWorktree: isMultiWorktree() });
          } catch (error) {
            res.status(500).json({ error: (error as Error).message });
          }
        });

        // POST /api/sources - Add a new issue file to watch
        app.post('/api/sources', (req, res) => {
          try {
            const { path: filePath } = req.body;
            if (!filePath || typeof filePath !== 'string') {
              res.status(400).json({ error: 'path is required' });
              return;
            }

            const resolved = path.resolve(process.cwd(), filePath);

            // Check if file exists
            if (!fs.existsSync(resolved)) {
              res.status(400).json({ error: `File not found: ${filePath}` });
              return;
            }

            // Check if already watching
            if (issueFiles.includes(resolved)) {
              res.status(400).json({ error: 'File already being watched' });
              return;
            }

            // Add to watched files
            issueFiles.push(resolved);
            watcher.add(resolved);

            console.log(`Added source: ${resolved}`);
            res.json({ files: issueFiles, isMultiWorktree: isMultiWorktree() });
          } catch (error) {
            res.status(500).json({ error: (error as Error).message });
          }
        });

        // DELETE /api/sources/:index - Remove a watched file
        app.delete('/api/sources/:index', (req, res) => {
          try {
            const index = parseInt(req.params.index, 10);
            if (isNaN(index) || index < 0 || index >= issueFiles.length) {
              res.status(400).json({ error: `Invalid index: ${req.params.index}` });
              return;
            }

            // Don't allow removing the last file
            if (issueFiles.length === 1) {
              res.status(400).json({ error: 'Cannot remove the last source file' });
              return;
            }

            const removed = issueFiles.splice(index, 1)[0];
            watcher.unwatch(removed);

            console.log(`Removed source: ${removed}`);
            res.json({ files: issueFiles, isMultiWorktree: isMultiWorktree() });
          } catch (error) {
            res.status(500).json({ error: (error as Error).message });
          }
        });

        // GET /api/worktrees - Detect git worktrees with .pebble/issues.jsonl
        app.get('/api/worktrees', (_req, res) => {
          try {
            const { execSync } = require('child_process');
            let worktreeOutput: string;
            try {
              worktreeOutput = execSync('git worktree list --porcelain', {
                encoding: 'utf-8',
                cwd: process.cwd(),
              });
            } catch {
              // Not a git repo or git not available
              res.json({ worktrees: [] });
              return;
            }

            // Parse porcelain output: each worktree block starts with "worktree <path>"
            const worktrees: Array<{
              path: string;
              branch: string | null;
              issuesFile: string | null;
              hasIssues: boolean;
              isActive: boolean;
              issueCount: number;
            }> = [];

            const blocks = worktreeOutput.trim().split('\n\n');
            for (const block of blocks) {
              const lines = block.split('\n');
              let worktreePath = '';
              let branch: string | null = null;

              for (const line of lines) {
                if (line.startsWith('worktree ')) {
                  worktreePath = line.slice('worktree '.length);
                } else if (line.startsWith('branch ')) {
                  branch = line.slice('branch '.length).replace('refs/heads/', '');
                }
              }

              if (worktreePath) {
                const issuesFile = path.join(worktreePath, '.pebble', 'issues.jsonl');
                const hasIssues = fs.existsSync(issuesFile);
                const isActive = issueFiles.includes(issuesFile);

                // Count issues if the file exists
                let issueCount = 0;
                if (hasIssues) {
                  const events = readEventsFromFile(issuesFile);
                  const state = computeState(events);
                  issueCount = state.size;
                }

                worktrees.push({
                  path: worktreePath,
                  branch,
                  issuesFile: hasIssues ? issuesFile : null,
                  hasIssues,
                  isActive,
                  issueCount,
                });
              }
            }

            res.json({ worktrees });
          } catch (error) {
            res.status(500).json({ error: (error as Error).message });
          }
        });

        app.get('/api/issues', (_req, res) => {
          try {
            // Always read from issueFiles (works for both single and multi-worktree)
            const issues = mergeIssuesFromFiles(issueFiles);
            res.json(issues);
          } catch (error) {
            res.status(500).json({ error: (error as Error).message });
          }
        });

        app.get('/api/events', (_req, res) => {
          try {
            // Merge and deduplicate events from all sources
            const events = mergeEventsFromFiles(issueFiles);
            res.json(events);
          } catch (error) {
            res.status(500).json({ error: (error as Error).message });
          }
        });

        // SSE endpoint for real-time updates
        const sseClients = new Set<Response>();
        let eventCounter = 0;

        app.get('/api/events/stream', (req, res) => {
          // Set up SSE headers
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.flushHeaders();

          // Add client to the set
          sseClients.add(res);

          // Send initial connection message with event ID
          eventCounter++;
          res.write(`id: ${eventCounter}\ndata: {"type":"connected"}\n\n`);

          // Remove client on close
          req.on('close', () => {
            sseClients.delete(res);
          });
        });

        // Heartbeat to keep connections alive (every 30 seconds)
        const heartbeatInterval = setInterval(() => {
          for (const client of sseClients) {
            client.write(': heartbeat\n\n'); // SSE comment, keeps connection alive
          }
        }, 30000);

        // File watcher for issues.jsonl file(s)
        // In multi-worktree mode, watch all specified files
        const watcher = chokidar.watch(issueFiles, {
          persistent: true,
          ignoreInitial: true,
        });

        watcher.on('change', () => {
          // Broadcast change to all SSE clients with event ID
          eventCounter++;
          const message = JSON.stringify({ type: 'change', timestamp: new Date().toISOString() });
          for (const client of sseClients) {
            client.write(`id: ${eventCounter}\ndata: ${message}\n\n`);
          }
        });

        // Graceful shutdown - clear heartbeat and close file watcher
        const shutdown = () => {
          clearInterval(heartbeatInterval);
          watcher.close();
          process.exit(0);
        };
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

        // POST /api/issues - Create a new issue
        // Multi-worktree: Use ?target=<index> to specify which file to write to
        app.post('/api/issues', (req, res) => {
          try {
            // Determine target file for multi-worktree mode
            let targetFile: string | null = null;
            if (isMultiWorktree() && req.query.target !== undefined) {
              const targetIndex = parseInt(req.query.target as string, 10);
              if (isNaN(targetIndex) || targetIndex < 0 || targetIndex >= issueFiles.length) {
                res.status(400).json({ error: `Invalid target index: ${req.query.target}` });
                return;
              }
              targetFile = issueFiles[targetIndex];
            }

            // Get pebbleDir - for multi-worktree with target, derive from target file path
            const pebbleDir = targetFile ? path.dirname(targetFile) : getOrCreatePebbleDir();
            const config = getConfig(pebbleDir);
            const { title, type, priority, description, parent } = req.body;

            // Validate required fields
            if (!title || typeof title !== 'string') {
              res.status(400).json({ error: 'Title is required' });
              return;
            }

            // Validate type
            const issueType: IssueType = type || 'task';
            if (!ISSUE_TYPES.includes(issueType)) {
              res.status(400).json({ error: `Invalid type. Must be one of: ${ISSUE_TYPES.join(', ')}` });
              return;
            }

            // Validate priority
            const issuePriority: Priority = priority ?? 2;
            if (!PRIORITIES.includes(issuePriority)) {
              res.status(400).json({ error: 'Priority must be 0-4' });
              return;
            }

            // Validate parent if provided
            const parentsReopened: Array<{ id: string; title: string }> = [];
            if (parent) {
              const parentIssue = getIssue(parent);
              if (!parentIssue) {
                res.status(400).json({ error: `Parent issue not found: ${parent}` });
                return;
              }
              // Auto-reopen closed ancestors in the entire chain
              const state = getComputedState();
              let current = state.get(parent);
              while (current) {
                if (current.status === 'closed') {
                  const reopenEvent: ReopenEvent = {
                    type: 'reopen',
                    issueId: current.id,
                    timestamp: new Date().toISOString(),
                    data: { reason: 'Reopened to add descendant' },
                  };
                  appendEvent(reopenEvent, pebbleDir);
                  parentsReopened.push({ id: current.id, title: current.title });
                }
                current = current.parent ? state.get(current.parent) : undefined;
              }
            }

            const issueId = generateId(config.prefix);
            const timestamp = new Date().toISOString();

            const event: CreateEvent = {
              type: 'create',
              issueId,
              timestamp,
              data: {
                title,
                type: issueType,
                priority: issuePriority,
                description,
                parent,
              },
            };

            appendEvent(event, pebbleDir);

            // Touch parent's updatedAt when child is added
            if (parent) {
              const parentUpdateEvent: UpdateEvent = {
                type: 'update',
                issueId: parent,
                timestamp: new Date().toISOString(),
                data: {},
              };
              appendEvent(parentUpdateEvent, pebbleDir);
            }

            const issue = getIssue(issueId);
            const result = parentsReopened.length > 0 ? { ...issue, _parentsReopened: parentsReopened } : issue;
            res.status(201).json(result);
          } catch (error) {
            res.status(500).json({ error: (error as Error).message });
          }
        });

        // ===== Bulk Operations =====
        // These MUST be defined before parameterized routes like /api/issues/:id

        // POST /api/issues/bulk/close - Close multiple issues
        app.post('/api/issues/bulk/close', (req, res) => {
          try {
            const pebbleDir = getOrCreatePebbleDir();
            const { ids } = req.body as { ids: string[] };

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
              res.status(400).json({ error: 'ids array is required' });
              return;
            }

            const results: Array<{ id: string; success: boolean; error?: string }> = [];

            for (const rawId of ids) {
              try {
                const issueId = resolveId(rawId);
                const issue = getIssue(issueId);
                if (!issue) {
                  results.push({ id: rawId, success: false, error: `Issue not found: ${rawId}` });
                  continue;
                }

                if (issue.status === 'closed') {
                  results.push({ id: issueId, success: true }); // Already closed
                  continue;
                }

                // Check if issue has open children
                if (hasOpenChildren(issueId)) {
                  results.push({ id: issueId, success: false, error: 'Cannot close issue with open children' });
                  continue;
                }

                const timestamp = new Date().toISOString();

                const event: CloseEvent = {
                  issueId,
                  timestamp,
                  type: 'close',
                  data: { reason: 'Bulk close' },
                };

                appendEvent(event, pebbleDir);
                results.push({ id: issueId, success: true });
              } catch (error) {
                results.push({ id: rawId, success: false, error: (error as Error).message });
              }
            }

            res.json({ results });
          } catch (error) {
            res.status(500).json({ error: (error as Error).message });
          }
        });

        // POST /api/issues/bulk/update - Update multiple issues
        app.post('/api/issues/bulk/update', (req, res) => {
          try {
            const pebbleDir = getOrCreatePebbleDir();
            const { ids, updates } = req.body as {
              ids: string[];
              updates: { status?: string; priority?: number };
            };

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
              res.status(400).json({ error: 'ids array is required' });
              return;
            }

            if (!updates || Object.keys(updates).length === 0) {
              res.status(400).json({ error: 'updates object is required' });
              return;
            }

            // Validate status if provided
            if (updates.status) {
              const validStatuses = ['open', 'in_progress', 'blocked'];
              if (!validStatuses.includes(updates.status)) {
                res.status(400).json({
                  error: `Invalid status: ${updates.status}. Use close endpoint to close issues.`,
                });
                return;
              }
            }

            // Validate priority if provided
            if (updates.priority !== undefined) {
              if (typeof updates.priority !== 'number' || updates.priority < 0 || updates.priority > 4) {
                res.status(400).json({ error: 'Priority must be 0-4' });
                return;
              }
            }

            const results: Array<{ id: string; success: boolean; error?: string }> = [];

            for (const rawId of ids) {
              try {
                const issueId = resolveId(rawId);
                const issue = getIssue(issueId);
                if (!issue) {
                  results.push({ id: rawId, success: false, error: `Issue not found: ${rawId}` });
                  continue;
                }

                const event: UpdateEvent = {
                  issueId,
                  timestamp: new Date().toISOString(),
                  type: 'update',
                  data: {
                    ...(updates.status && { status: updates.status as 'open' | 'in_progress' | 'blocked' }),
                    ...(updates.priority !== undefined && { priority: updates.priority as 0 | 1 | 2 | 3 | 4 }),
                  },
                };

                appendEvent(event, pebbleDir);
                results.push({ id: issueId, success: true });
              } catch (error) {
                results.push({ id: rawId, success: false, error: (error as Error).message });
              }
            }

            res.json({ results });
          } catch (error) {
            res.status(500).json({ error: (error as Error).message });
          }
        });

        // PUT /api/issues/:id - Update an issue
        app.put('/api/issues/:id', (req, res) => {
          try {
            let issue: Issue;
            let issueId: string;
            let targetFile: string;

            if (isMultiWorktree()) {
              const found = findIssueInSources(req.params.id, issueFiles);
              if (!found) {
                res.status(404).json({ error: `Issue not found: ${req.params.id}` });
                return;
              }
              issue = found.issue;
              issueId = issue.id;
              targetFile = found.targetFile;
            } else {
              const pebbleDir = getOrCreatePebbleDir();
              issueId = resolveId(req.params.id);
              const localIssue = getIssue(issueId);
              if (!localIssue) {
                res.status(404).json({ error: `Issue not found: ${req.params.id}` });
                return;
              }
              issue = localIssue;
              targetFile = path.join(pebbleDir, 'issues.jsonl');
            }

            const { title, type, priority, status, description, parent, relatedTo } = req.body;
            const updates: UpdateEvent['data'] = {};

            // Validate and collect updates
            if (title !== undefined) {
              if (typeof title !== 'string' || title.trim() === '') {
                res.status(400).json({ error: 'Title cannot be empty' });
                return;
              }
              updates.title = title;
            }

            if (type !== undefined) {
              if (!ISSUE_TYPES.includes(type)) {
                res.status(400).json({ error: `Invalid type. Must be one of: ${ISSUE_TYPES.join(', ')}` });
                return;
              }
              updates.type = type;
            }

            if (priority !== undefined) {
              if (!PRIORITIES.includes(priority)) {
                res.status(400).json({ error: 'Priority must be 0-4' });
                return;
              }
              updates.priority = priority;
            }

            // Track parents that need to be claimed (for cascade)
            const cascadeClaim: Array<{ id: string; targetFile: string }> = [];

            if (status !== undefined) {
              if (!STATUSES.includes(status)) {
                res.status(400).json({ error: `Invalid status. Must be one of: ${STATUSES.join(', ')}` });
                return;
              }

              // Special handling for in_progress: check blockers and cascade to parents
              if (status === 'in_progress' && issue.status !== 'in_progress') {
                // Get computed state for blocker checks
                const state = isMultiWorktree()
                  ? computeState(issueFiles.flatMap(f => readEventsFromFile(f)))
                  : getComputedState();

                // Check if issue itself is blocked (exclude deleted blockers)
                const openBlockers = issue.blockedBy
                  .map((id) => state.get(id))
                  .filter((i): i is Issue => i !== undefined && i.status !== 'closed' && !i.deleted);

                if (openBlockers.length > 0) {
                  const blockerIds = openBlockers.map((b) => b.id).join(', ');
                  res.status(400).json({
                    error: `Cannot claim blocked issue. Blocked by: ${blockerIds}`,
                  });
                  return;
                }

                // Check if any ancestor is blocked
                const ancestryBlocker = getAncestryBlocker(issueId, state);
                if (ancestryBlocker) {
                  const blockerIds = ancestryBlocker.blockers.map((b) => b.id).join(', ');
                  res.status(400).json({
                    error: `Parent ${ancestryBlocker.blockedAncestor.id} is blocked by: ${blockerIds}`,
                  });
                  return;
                }

                // Collect open parents for cascade
                let current = issue;
                while (current.parent) {
                  const parent = state.get(current.parent);
                  if (!parent) break;

                  if (parent.status === 'open') {
                    // Determine target file for this parent
                    let parentTargetFile = targetFile;
                    if (isMultiWorktree()) {
                      const parentFound = findIssueInSources(parent.id, issueFiles);
                      if (parentFound) {
                        parentTargetFile = parentFound.targetFile;
                      }
                    }
                    cascadeClaim.push({ id: parent.id, targetFile: parentTargetFile });
                  }
                  current = parent;
                }
              }

              updates.status = status;
            }

            if (description !== undefined) {
              updates.description = description;
            }

            if (parent !== undefined) {
              if (parent !== null) {
                // In multi-worktree mode, check parent in merged sources
                if (isMultiWorktree()) {
                  const parentFound = findIssueInSources(parent, issueFiles);
                  if (!parentFound) {
                    res.status(400).json({ error: `Parent issue not found: ${parent}` });
                    return;
                  }
                } else {
                  const parentIssue = getIssue(parent);
                  if (!parentIssue) {
                    res.status(400).json({ error: `Parent issue not found: ${parent}` });
                    return;
                  }
                }
              }
              updates.parent = parent;
            }

            if (relatedTo !== undefined) {
              if (!Array.isArray(relatedTo)) {
                res.status(400).json({ error: 'relatedTo must be an array' });
                return;
              }
              // Validate all related IDs exist
              for (const relatedId of relatedTo) {
                if (isMultiWorktree()) {
                  const found = findIssueInSources(relatedId, issueFiles);
                  if (!found) {
                    res.status(400).json({ error: `Related issue not found: ${relatedId}` });
                    return;
                  }
                } else {
                  const relatedIssue = getIssue(relatedId);
                  if (!relatedIssue) {
                    res.status(400).json({ error: `Related issue not found: ${relatedId}` });
                    return;
                  }
                }
              }
              updates.relatedTo = relatedTo;
            }

            if (Object.keys(updates).length === 0) {
              res.status(400).json({ error: 'No valid updates provided' });
              return;
            }

            const timestamp = new Date().toISOString();
            const event: UpdateEvent = {
              type: 'update',
              issueId,
              timestamp,
              data: updates,
            };

            appendEventToFile(event, targetFile);

            // Emit cascade claim events for open parents
            const cascadeClaimedIds: string[] = [];
            for (const { id, targetFile: parentTargetFile } of cascadeClaim) {
              const cascadeEvent: UpdateEvent = {
                type: 'update',
                issueId: id,
                timestamp,
                data: { status: 'in_progress' },
              };
              appendEventToFile(cascadeEvent, parentTargetFile);
              cascadeClaimedIds.push(id);
            }

            if (isMultiWorktree()) {
              const updated = findIssueInSources(issueId, issueFiles);
              const baseIssue = updated?.issue || { ...issue, ...updates, updatedAt: timestamp };
              if (cascadeClaimedIds.length > 0) {
                res.json({ ...baseIssue, _cascadeClaimed: cascadeClaimedIds });
              } else {
                res.json(baseIssue);
              }
            } else {
              const updatedIssue = getIssue(issueId);
              if (cascadeClaimedIds.length > 0) {
                res.json({ ...updatedIssue, _cascadeClaimed: cascadeClaimedIds });
              } else {
                res.json(updatedIssue);
              }
            }
          } catch (error) {
            res.status(500).json({ error: (error as Error).message });
          }
        });

        // POST /api/issues/:id/close - Close an issue
        app.post('/api/issues/:id/close', (req, res) => {
          try {
            let issue: Issue;
            let issueId: string;
            let targetFile: string;

            if (isMultiWorktree()) {
              const found = findIssueInSources(req.params.id, issueFiles);
              if (!found) {
                res.status(404).json({ error: `Issue not found: ${req.params.id}` });
                return;
              }
              issue = found.issue;
              issueId = issue.id;
              targetFile = found.targetFile;
            } else {
              const pebbleDir = getOrCreatePebbleDir();
              issueId = resolveId(req.params.id);
              const localIssue = getIssue(issueId);
              if (!localIssue) {
                res.status(404).json({ error: `Issue not found: ${req.params.id}` });
                return;
              }
              issue = localIssue;
              targetFile = path.join(pebbleDir, 'issues.jsonl');
            }

            if (issue.status === 'closed') {
              res.status(400).json({ error: 'Issue is already closed' });
              return;
            }

            // Check if issue has open children (single-file mode only)
            if (!isMultiWorktree() && hasOpenChildren(issueId)) {
              res.status(400).json({ error: 'Cannot close issue with open children' });
              return;
            }

            const { reason } = req.body;
            const timestamp = new Date().toISOString();

            const event: CloseEvent = {
              type: 'close',
              issueId,
              timestamp,
              data: { reason },
            };

            appendEventToFile(event, targetFile);

            // Return updated issue
            if (isMultiWorktree()) {
              const updated = findIssueInSources(issueId, issueFiles);
              res.json(updated?.issue || { ...issue, status: 'closed', updatedAt: timestamp });
            } else {
              res.json(getIssue(issueId));
            }
          } catch (error) {
            res.status(500).json({ error: (error as Error).message });
          }
        });

        // POST /api/issues/:id/reopen - Reopen an issue
        app.post('/api/issues/:id/reopen', (req, res) => {
          try {
            let issue: Issue;
            let issueId: string;
            let targetFile: string;

            if (isMultiWorktree()) {
              const found = findIssueInSources(req.params.id, issueFiles);
              if (!found) {
                res.status(404).json({ error: `Issue not found: ${req.params.id}` });
                return;
              }
              issue = found.issue;
              issueId = issue.id;
              targetFile = found.targetFile;
            } else {
              const pebbleDir = getOrCreatePebbleDir();
              issueId = resolveId(req.params.id);
              const localIssue = getIssue(issueId);
              if (!localIssue) {
                res.status(404).json({ error: `Issue not found: ${req.params.id}` });
                return;
              }
              issue = localIssue;
              targetFile = path.join(pebbleDir, 'issues.jsonl');
            }

            if (issue.status !== 'closed') {
              res.status(400).json({ error: 'Issue is not closed' });
              return;
            }

            const { reason } = req.body;
            const timestamp = new Date().toISOString();

            const event: ReopenEvent = {
              type: 'reopen',
              issueId,
              timestamp,
              data: { reason },
            };

            appendEventToFile(event, targetFile);

            if (isMultiWorktree()) {
              const updated = findIssueInSources(issueId, issueFiles);
              res.json(updated?.issue || { ...issue, status: 'open', updatedAt: timestamp });
            } else {
              res.json(getIssue(issueId));
            }
          } catch (error) {
            res.status(500).json({ error: (error as Error).message });
          }
        });

        // POST /api/issues/:id/delete - Soft delete an issue (with cascade for epics)
        app.post('/api/issues/:id/delete', (req, res) => {
          try {
            let issue: Issue;
            let issueId: string;
            let targetFile: string;

            if (isMultiWorktree()) {
              const found = findIssueInSources(req.params.id, issueFiles);
              if (!found) {
                res.status(404).json({ error: `Issue not found: ${req.params.id}` });
                return;
              }
              issue = found.issue;
              issueId = issue.id;
              targetFile = found.targetFile;
            } else {
              const pebbleDir = getOrCreatePebbleDir();
              issueId = resolveId(req.params.id);
              const localIssue = getIssue(issueId);
              if (!localIssue) {
                res.status(404).json({ error: `Issue not found: ${req.params.id}` });
                return;
              }
              issue = localIssue;
              targetFile = path.join(pebbleDir, 'issues.jsonl');
            }

            if (issue.deleted) {
              res.status(400).json({ error: 'Issue is already deleted' });
              return;
            }

            const { reason } = req.body;
            const timestamp = new Date().toISOString();
            const state = getComputedState();

            // Collect all issues to delete (including cascaded)
            const toDelete: Array<{ id: string; cascade: boolean }> = [];
            const alreadyQueued = new Set<string>();

            // Add the main issue
            toDelete.push({ id: issueId, cascade: false });
            alreadyQueued.add(issueId);

            // Get descendants for cascade delete
            const descendants = getDescendants(issueId, state);
            for (const desc of descendants) {
              if (!alreadyQueued.has(desc.id) && !desc.deleted) {
                toDelete.push({ id: desc.id, cascade: true });
                alreadyQueued.add(desc.id);
              }
            }

            // Helper to clean up references
            const cleanupReferences = (deletedId: string) => {
              for (const [id, iss] of state) {
                if (id === deletedId || iss.deleted) continue;

                const updates: Partial<{
                  blockedBy: string[];
                  relatedTo: string[];
                  parent: string;
                }> = {};

                if (iss.blockedBy.includes(deletedId)) {
                  updates.blockedBy = iss.blockedBy.filter((bid) => bid !== deletedId);
                }
                if (iss.relatedTo.includes(deletedId)) {
                  updates.relatedTo = iss.relatedTo.filter((rid) => rid !== deletedId);
                }
                if (iss.parent === deletedId) {
                  updates.parent = '';
                }

                if (Object.keys(updates).length > 0) {
                  const updateEvent: UpdateEvent = {
                    type: 'update',
                    issueId: id,
                    timestamp,
                    data: updates,
                  };
                  appendEventToFile(updateEvent, targetFile);
                }
              }
            };

            // Delete all collected issues
            for (const { id, cascade } of toDelete) {
              const iss = state.get(id);
              if (!iss) continue;

              cleanupReferences(id);

              const deleteEvent: DeleteEvent = {
                type: 'delete',
                issueId: id,
                timestamp,
                data: {
                  reason,
                  cascade: cascade || undefined,
                  previousStatus: iss.status,
                },
              };
              appendEventToFile(deleteEvent, targetFile);
            }

            res.json({
              deleted: toDelete,
            });
          } catch (error) {
            res.status(500).json({ error: (error as Error).message });
          }
        });

        // POST /api/issues/:id/restore - Restore a deleted issue
        app.post('/api/issues/:id/restore', (req, res) => {
          try {
            let issue: Issue;
            let issueId: string;
            let targetFile: string;

            if (isMultiWorktree()) {
              const found = findIssueInSources(req.params.id, issueFiles);
              if (!found) {
                res.status(404).json({ error: `Issue not found: ${req.params.id}` });
                return;
              }
              issue = found.issue;
              issueId = issue.id;
              targetFile = found.targetFile;
            } else {
              const pebbleDir = getOrCreatePebbleDir();
              issueId = resolveId(req.params.id);
              const localIssue = getIssue(issueId);
              if (!localIssue) {
                res.status(404).json({ error: `Issue not found: ${req.params.id}` });
                return;
              }
              issue = localIssue;
              targetFile = path.join(pebbleDir, 'issues.jsonl');
            }

            if (!issue.deleted) {
              res.status(400).json({ error: 'Issue is not deleted' });
              return;
            }

            const { reason } = req.body;
            const timestamp = new Date().toISOString();

            const event: RestoreEvent = {
              type: 'restore',
              issueId,
              timestamp,
              data: { reason },
            };

            appendEventToFile(event, targetFile);

            if (isMultiWorktree()) {
              const updated = findIssueInSources(issueId, issueFiles);
              res.json(updated?.issue || { ...issue, deleted: false, deletedAt: undefined, updatedAt: timestamp });
            } else {
              res.json(getIssue(issueId));
            }
          } catch (error) {
            res.status(500).json({ error: (error as Error).message });
          }
        });

        // POST /api/issues/:id/comments - Add a comment
        app.post('/api/issues/:id/comments', (req, res) => {
          try {
            let issue: Issue;
            let issueId: string;
            let targetFile: string;

            if (isMultiWorktree()) {
              const found = findIssueInSources(req.params.id, issueFiles);
              if (!found) {
                res.status(404).json({ error: `Issue not found: ${req.params.id}` });
                return;
              }
              issue = found.issue;
              issueId = issue.id;
              targetFile = found.targetFile;
            } else {
              const pebbleDir = getOrCreatePebbleDir();
              issueId = resolveId(req.params.id);
              const localIssue = getIssue(issueId);
              if (!localIssue) {
                res.status(404).json({ error: `Issue not found: ${req.params.id}` });
                return;
              }
              issue = localIssue;
              targetFile = path.join(pebbleDir, 'issues.jsonl');
            }

            const { text, author } = req.body;

            if (!text || typeof text !== 'string' || text.trim() === '') {
              res.status(400).json({ error: 'Comment text is required' });
              return;
            }

            const timestamp = new Date().toISOString();

            const event: CommentEvent = {
              type: 'comment',
              issueId,
              timestamp,
              data: {
                text,
                timestamp,
                author,
              },
            };

            appendEventToFile(event, targetFile);

            if (isMultiWorktree()) {
              const updated = findIssueInSources(issueId, issueFiles);
              res.json(updated?.issue || issue);
            } else {
              res.json(getIssue(issueId));
            }
          } catch (error) {
            res.status(500).json({ error: (error as Error).message });
          }
        });

        // POST /api/issues/:id/deps - Add a dependency
        app.post('/api/issues/:id/deps', (req, res) => {
          try {
            let issue: Issue;
            let issueId: string;
            let targetFile: string;

            if (isMultiWorktree()) {
              const found = findIssueInSources(req.params.id, issueFiles);
              if (!found) {
                res.status(404).json({ error: `Issue not found: ${req.params.id}` });
                return;
              }
              issue = found.issue;
              issueId = issue.id;
              targetFile = found.targetFile;
            } else {
              const pebbleDir = getOrCreatePebbleDir();
              issueId = resolveId(req.params.id);
              const localIssue = getIssue(issueId);
              if (!localIssue) {
                res.status(404).json({ error: `Issue not found: ${req.params.id}` });
                return;
              }
              issue = localIssue;
              targetFile = path.join(pebbleDir, 'issues.jsonl');
            }

            const { blockerId } = req.body;

            if (!blockerId) {
              res.status(400).json({ error: 'blockerId is required' });
              return;
            }

            // Resolve blocker ID (check in multi-worktree sources if needed)
            let resolvedBlockerId: string;
            if (isMultiWorktree()) {
              const blockerFound = findIssueInSources(blockerId, issueFiles);
              if (!blockerFound) {
                res.status(404).json({ error: `Blocker issue not found: ${blockerId}` });
                return;
              }
              resolvedBlockerId = blockerFound.issue.id;
            } else {
              resolvedBlockerId = resolveId(blockerId);
              const blockerIssue = getIssue(resolvedBlockerId);
              if (!blockerIssue) {
                res.status(404).json({ error: `Blocker issue not found: ${blockerId}` });
                return;
              }
            }

            // Check if already a dependency
            if (issue.blockedBy.includes(resolvedBlockerId)) {
              res.status(400).json({ error: 'Dependency already exists' });
              return;
            }

            // Check for cycles (only in single-file mode, cycle detection uses local state)
            if (!isMultiWorktree() && detectCycle(issueId, resolvedBlockerId)) {
              res.status(400).json({ error: 'Adding this dependency would create a cycle' });
              return;
            }

            const timestamp = new Date().toISOString();
            const event: UpdateEvent = {
              type: 'update',
              issueId,
              timestamp,
              data: {
                blockedBy: [...issue.blockedBy, resolvedBlockerId],
              },
            };

            appendEventToFile(event, targetFile);

            if (isMultiWorktree()) {
              const updated = findIssueInSources(issueId, issueFiles);
              res.json(updated?.issue || { ...issue, blockedBy: [...issue.blockedBy, resolvedBlockerId], updatedAt: timestamp });
            } else {
              res.json(getIssue(issueId));
            }
          } catch (error) {
            res.status(500).json({ error: (error as Error).message });
          }
        });

        // DELETE /api/issues/:id/deps/:blockerId - Remove a dependency
        app.delete('/api/issues/:id/deps/:blockerId', (req, res) => {
          try {
            let issue: Issue;
            let issueId: string;
            let targetFile: string;

            if (isMultiWorktree()) {
              const found = findIssueInSources(req.params.id, issueFiles);
              if (!found) {
                res.status(404).json({ error: `Issue not found: ${req.params.id}` });
                return;
              }
              issue = found.issue;
              issueId = issue.id;
              targetFile = found.targetFile;
            } else {
              const pebbleDir = getOrCreatePebbleDir();
              issueId = resolveId(req.params.id);
              const localIssue = getIssue(issueId);
              if (!localIssue) {
                res.status(404).json({ error: `Issue not found: ${req.params.id}` });
                return;
              }
              issue = localIssue;
              targetFile = path.join(pebbleDir, 'issues.jsonl');
            }

            // Resolve blocker ID (check in multi-worktree sources if needed)
            let resolvedBlockerId: string;
            if (isMultiWorktree()) {
              const blockerFound = findIssueInSources(req.params.blockerId, issueFiles);
              if (blockerFound) {
                resolvedBlockerId = blockerFound.issue.id;
              } else {
                // Blocker might not exist anymore, try direct match
                resolvedBlockerId = req.params.blockerId;
              }
            } else {
              resolvedBlockerId = resolveId(req.params.blockerId);
            }

            if (!issue.blockedBy.includes(resolvedBlockerId)) {
              res.status(400).json({ error: 'Dependency does not exist' });
              return;
            }

            const timestamp = new Date().toISOString();
            const newBlockedBy = issue.blockedBy.filter((id) => id !== resolvedBlockerId);
            const event: UpdateEvent = {
              type: 'update',
              issueId,
              timestamp,
              data: {
                blockedBy: newBlockedBy,
              },
            };

            appendEventToFile(event, targetFile);

            if (isMultiWorktree()) {
              const updated = findIssueInSources(issueId, issueFiles);
              res.json(updated?.issue || { ...issue, blockedBy: newBlockedBy, updatedAt: timestamp });
            } else {
              res.json(getIssue(issueId));
            }
          } catch (error) {
            res.status(500).json({ error: (error as Error).message });
          }
        });

        // Serve static files from the bundled UI
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const uiPath = path.resolve(__dirname, '../ui');

        app.use(express.static(uiPath));

        // SPA fallback
        app.get('*', (_req, res) => {
          res.sendFile(path.join(uiPath, 'index.html'));
        });

        // Start server with port fallback
        const requestedPort = parseInt(options.port, 10);
        const actualPort = await findAvailablePort(requestedPort);

        if (actualPort !== requestedPort) {
          console.log(`Port ${requestedPort} is busy, using ${actualPort} instead`);
        }

        app.listen(actualPort, () => {
          const url = `http://localhost:${actualPort}`;
          console.log(`Pebble UI running at ${url}`);

          if (options.open !== false) {
            open(url);
          }
        });
      } catch (error) {
        outputError(error as Error, pretty);
        process.exit(1);
      }
    });
}
