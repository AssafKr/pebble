import {Command} from 'commander';
import type {RestoreEvent} from '../../shared/types.js';
import {getOrCreatePebbleDir, appendEvent} from '../lib/storage.js';
import {getIssue, resolveId} from '../lib/state.js';
import {outputError, formatJson} from '../lib/output.js';

export function restoreCommand(program: Command): void {
  program
    .command('restore <ids...>')
    .description('Restore deleted issues')
    .option('-r, --reason <reason>', 'Reason for restoring')
    .action(async (ids: string[], options) => {
      const pretty = program.opts().pretty ?? false;

      try {
        const pebbleDir = getOrCreatePebbleDir();

        // Support comma-separated IDs
        const allIds = ids.flatMap((id) =>
          id
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        );

        if (allIds.length === 0) {
          throw new Error('No issue IDs provided');
        }

        const results: Array<{
          id: string;
          success: boolean;
          error?: string;
        }> = [];

        const timestamp = new Date().toISOString();

        for (const id of allIds) {
          try {
            const resolvedId = resolveId(id);
            const issue = getIssue(resolvedId, true); // includeDeleted=true to find deleted issues

            if (!issue) {
              results.push({id, success: false, error: `Issue not found: ${id}`});
              continue;
            }

            if (!issue.deleted) {
              results.push({id: resolvedId, success: false, error: `Issue is not deleted: ${resolvedId}`});
              continue;
            }

            const restoreEvent: RestoreEvent = {
              type: 'restore',
              issueId: resolvedId,
              timestamp,
              data: {
                reason: options.reason,
              },
            };

            appendEvent(restoreEvent, pebbleDir);
            results.push({id: resolvedId, success: true});
          } catch (error) {
            results.push({id, success: false, error: (error as Error).message});
          }
        }

        // Output results
        if (allIds.length === 1) {
          const result = results[0];
          if (result.success) {
            if (pretty) {
              console.log(`↩️  ${result.id} restored`);
            } else {
              console.log(formatJson({id: result.id, success: true}));
            }
          } else {
            throw new Error(result.error || 'Unknown error');
          }
        } else {
          if (pretty) {
            for (const result of results) {
              if (result.success) {
                console.log(`↩️  ${result.id} restored`);
              } else {
                console.log(`✗ ${result.id}: ${result.error}`);
              }
            }
          } else {
            console.log(
              formatJson({
                restored: results.filter((r) => r.success).map((r) => r.id),
                ...(results.some((r) => !r.success) && {
                  errors: results.filter((r) => !r.success).map((r) => ({id: r.id, error: r.error})),
                }),
              })
            );
          }
        }
      } catch (error) {
        outputError(error as Error, pretty);
      }
    });
}
