import { Command } from 'commander';
import type { DeleteEvent, UpdateEvent, Issue } from '../../shared/types.js';
import { getOrCreatePebbleDir, appendEvent } from '../lib/storage.js';
import { resolveId, getDescendants, getComputedState } from '../lib/state.js';
import { outputError, formatJson } from '../lib/output.js';

// Type for accumulated reference cleanup updates
type ReferenceUpdates = Map<string, {
  blockedBy?: string[];
  relatedTo?: string[];
  parent?: string;
}>;

/**
 * Collect reference cleanup updates for a deleted issue.
 * Updates are accumulated into the provided map and merged if the same issue
 * is affected by multiple deletions. Call emitReferenceCleanup() after collecting
 * all updates to emit the events.
 */
function collectReferenceCleanup(
  deletedId: string,
  deletedIds: Set<string>,
  state: Map<string, Issue>,
  updates: ReferenceUpdates
): void {
  for (const [id, issue] of state) {
    // Skip issues being deleted
    if (deletedIds.has(id)) continue;
    // Skip already deleted issues
    if (issue.deleted) continue;

    // Get or create update entry for this issue
    let entry = updates.get(id);

    // Check blockedBy - use existing accumulated value if present
    const currentBlockedBy = entry?.blockedBy ?? issue.blockedBy;
    if (currentBlockedBy.includes(deletedId)) {
      if (!entry) {
        entry = {};
        updates.set(id, entry);
      }
      entry.blockedBy = currentBlockedBy.filter((bid) => bid !== deletedId);
    }

    // Check relatedTo - use existing accumulated value if present
    const currentRelatedTo = entry?.relatedTo ?? issue.relatedTo;
    if (currentRelatedTo.includes(deletedId)) {
      if (!entry) {
        entry = {};
        updates.set(id, entry);
      }
      entry.relatedTo = currentRelatedTo.filter((rid) => rid !== deletedId);
    }

    // Clear parent if it points to deleted issue
    if (issue.parent === deletedId) {
      if (!entry) {
        entry = {};
        updates.set(id, entry);
      }
      entry.parent = ''; // Empty string signals "clear parent"
    }
  }
}

/**
 * Emit all collected reference cleanup updates as UpdateEvents
 */
function emitReferenceCleanup(
  updates: ReferenceUpdates,
  pebbleDir: string,
  timestamp: string
): void {
  for (const [id, data] of updates) {
    if (Object.keys(data).length > 0) {
      const updateEvent: UpdateEvent = {
        type: 'update',
        issueId: id,
        timestamp,
        data,
      };
      appendEvent(updateEvent, pebbleDir);
    }
  }
}

export function deleteCommand(program: Command): void {
  program
    .command('delete <ids...>')
    .description('Delete issues (soft delete). Epics cascade-delete their children.')
    .option('-r, --reason <reason>', 'Reason for deleting')
    .action(async (ids: string[], options) => {
      const pretty = program.opts().pretty ?? false;

      try {
        const pebbleDir = getOrCreatePebbleDir();
        const state = getComputedState();

        // Support comma-separated IDs
        const allIds = ids
          .flatMap((id) => id.split(',').map((s) => s.trim()).filter(Boolean));

        if (allIds.length === 0) {
          throw new Error('No issue IDs provided');
        }

        const results: Array<{
          id: string;
          success: boolean;
          error?: string;
          cascade?: boolean;
        }> = [];

        // Collect all issues to delete (including cascaded)
        const toDelete: Array<{ id: string; cascade: boolean }> = [];
        const alreadyQueued = new Set<string>();

        for (const id of allIds) {
          try {
            const resolvedId = resolveId(id);
            const issue = state.get(resolvedId);

            if (!issue) {
              results.push({ id, success: false, error: `Issue not found: ${id}` });
              continue;
            }

            if (issue.deleted) {
              results.push({ id: resolvedId, success: false, error: `Issue is already deleted: ${resolvedId}` });
              continue;
            }

            // Add this issue
            if (!alreadyQueued.has(resolvedId)) {
              toDelete.push({ id: resolvedId, cascade: false });
              alreadyQueued.add(resolvedId);
            }

            // Get descendants for cascade delete (children, grandchildren, etc.)
            const descendants = getDescendants(resolvedId, state);
            for (const desc of descendants) {
              if (!alreadyQueued.has(desc.id) && !desc.deleted) {
                toDelete.push({ id: desc.id, cascade: true });
                alreadyQueued.add(desc.id);
              }
            }

          } catch (error) {
            results.push({ id, success: false, error: (error as Error).message });
          }
        }

        // Collect all reference cleanup updates first (to handle multi-issue deletion correctly)
        const timestamp = new Date().toISOString();
        const deletedIds = new Set(toDelete.map(d => d.id));
        const referenceUpdates: ReferenceUpdates = new Map();

        for (const { id } of toDelete) {
          collectReferenceCleanup(id, deletedIds, state, referenceUpdates);
        }

        // Emit all reference cleanup events
        emitReferenceCleanup(referenceUpdates, pebbleDir, timestamp);

        // Now emit delete events
        for (const { id, cascade } of toDelete) {
          const issue = state.get(id);
          if (!issue) continue;

          const deleteEvent: DeleteEvent = {
            type: 'delete',
            issueId: id,
            timestamp,
            data: {
              reason: options.reason,
              cascade: cascade || undefined,
              previousStatus: issue.status,
            },
          };
          appendEvent(deleteEvent, pebbleDir);

          results.push({ id, success: true, cascade: cascade || undefined });
        }

        // Output results
        if (pretty) {
          // Group by primary vs cascade
          const primary = results.filter((r) => r.success && !r.cascade);
          const cascaded = results.filter((r) => r.success && r.cascade);
          const failed = results.filter((r) => !r.success);

          for (const result of primary) {
            console.log(`🗑️  ${result.id} deleted`);
          }
          for (const result of cascaded) {
            console.log(`  └─ ${result.id} deleted (cascade)`);
          }
          for (const result of failed) {
            console.log(`✗ ${result.id}: ${result.error}`);
          }
        } else {
          console.log(formatJson({
            deleted: results
              .filter((r) => r.success)
              .map((r) => ({ id: r.id, cascade: r.cascade ?? false })),
            ...(results.some((r) => !r.success) && {
              errors: results
                .filter((r) => !r.success)
                .map((r) => ({ id: r.id, error: r.error })),
            }),
          }));
        }
      } catch (error) {
        outputError(error as Error, pretty);
      }
    });
}
