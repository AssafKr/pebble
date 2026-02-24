import { Command } from 'commander';
import type { IssueType, Priority, CreateEvent, UpdateEvent, ReopenEvent } from '../../shared/types.js';
import { ISSUE_TYPES, PRIORITIES } from '../../shared/types.js';
import { getOrCreatePebbleDir, getConfig, appendEvent } from '../lib/storage.js';
import { generateId } from '../lib/id.js';
import { getIssue, resolveId, getComputedState } from '../lib/state.js';
import { outputMutationSuccess, outputError } from '../lib/output.js';

export function createCommand(program: Command): void {
  program
    .command('create <title>')
    .description('Create a new issue')
    .option('-t, --type <type>', 'Issue type (task, bug, epic)', 'task')
    .option('-p, --priority <priority>', 'Priority (0-4)', '2')
    .option('-d, --description <desc>', 'Description')
    .option('--parent <id>', 'Parent issue ID')
    .option('--blocked-by <ids>', 'Comma-separated IDs of issues that block this one')
    .option('--blocks <ids>', 'Comma-separated IDs of issues this one will block')
    .addHelpText('after', `
Notes:
  IDs support partial matching (e.g., "abc" matches "PROJ-abc123")
  Creating a child under a closed parent auto-reopens the parent chain
`)
    .action(async (title: string, options) => {
      const pretty = program.opts().pretty ?? false;

      try {
        // Validate type
        const type = options.type as IssueType;
        if (!ISSUE_TYPES.includes(type)) {
          throw new Error(`Invalid type: ${type}. Must be one of: ${ISSUE_TYPES.join(', ')}`);
        }

        // Validate priority
        const priority = parseInt(options.priority, 10) as Priority;
        if (!PRIORITIES.includes(priority)) {
          throw new Error(`Invalid priority: ${options.priority}. Must be 0-4`);
        }

        // Get or create pebble directory
        const pebbleDir = getOrCreatePebbleDir();
        const config = getConfig(pebbleDir);

        // Resolve parent if provided
        let parentId: string | undefined;
        const parentsReopened: Array<{ id: string; title: string }> = [];
        if (options.parent) {
          parentId = resolveId(options.parent);
          const parent = getIssue(parentId);
          if (!parent) {
            throw new Error(`Parent issue not found: ${options.parent}`);
          }
          // Auto-reopen closed ancestors in the entire chain
          const state = getComputedState();
          let current = state.get(parentId);
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

        // Resolve --blocked-by (issues that block this new issue)
        const blockedByIds: string[] = [];
        const blockersReopened: Array<{ id: string; title: string }> = [];
        if (options.blockedBy) {
          const ids = options.blockedBy.split(',').map((s: string) => s.trim()).filter(Boolean);
          for (const rawId of ids) {
            const resolvedId = resolveId(rawId);
            const blocker = getIssue(resolvedId);
            if (!blocker) {
              throw new Error(`Blocker issue not found: ${rawId}`);
            }
            // Auto-reopen closed blocker instead of throwing error
            if (blocker.status === 'closed') {
              const reopenEvent: ReopenEvent = {
                type: 'reopen',
                issueId: resolvedId,
                timestamp: new Date().toISOString(),
                data: { reason: 'Reopened to block new issue' },
              };
              appendEvent(reopenEvent, pebbleDir);
              blockersReopened.push({ id: resolvedId, title: blocker.title });
            }
            blockedByIds.push(resolvedId);
          }
        }

        // Resolve --blocks (issues this new issue will block)
        const blocksIds: string[] = [];
        if (options.blocks) {
          const ids = options.blocks.split(',').map((s: string) => s.trim()).filter(Boolean);
          for (const rawId of ids) {
            const resolvedId = resolveId(rawId);
            const blocked = getIssue(resolvedId);
            if (!blocked) {
              throw new Error(`Issue to block not found: ${rawId}`);
            }
            blocksIds.push(resolvedId);
          }
        }

        // Generate ID and create event
        const id = generateId(config.prefix);
        const timestamp = new Date().toISOString();

        const event: CreateEvent = {
          type: 'create',
          issueId: id,
          timestamp,
          data: {
            title,
            type,
            priority,
            description: options.description,
            parent: parentId,
          },
        };

        appendEvent(event, pebbleDir);

        // Touch parent's updatedAt when child is added
        if (parentId) {
          const parentUpdateEvent: UpdateEvent = {
            type: 'update',
            issueId: parentId,
            timestamp: new Date().toISOString(),
            data: {},
          };
          appendEvent(parentUpdateEvent, pebbleDir);
        }

        // Add dependencies via UpdateEvents
        // --blocked-by: Set this issue's blockedBy array
        if (blockedByIds.length > 0) {
          const depEvent: UpdateEvent = {
            type: 'update',
            issueId: id,
            timestamp: new Date().toISOString(),
            data: { blockedBy: blockedByIds },
          };
          appendEvent(depEvent, pebbleDir);
        }

        // --blocks: Add this issue to each target's blockedBy array
        for (const targetId of blocksIds) {
          const target = getIssue(targetId);
          const existingBlockers = target?.blockedBy || [];
          const depEvent: UpdateEvent = {
            type: 'update',
            issueId: targetId,
            timestamp: new Date().toISOString(),
            data: { blockedBy: [...existingBlockers, id] },
          };
          appendEvent(depEvent, pebbleDir);
        }

        // Output success
        const extra = (parentsReopened.length > 0 || blockersReopened.length > 0)
          ? { parentsReopened: parentsReopened.length > 0 ? parentsReopened : undefined, blockersReopened: blockersReopened.length > 0 ? blockersReopened : undefined }
          : undefined;
        outputMutationSuccess(id, pretty, extra);
      } catch (error) {
        outputError(error as Error, pretty);
      }
    });
}
