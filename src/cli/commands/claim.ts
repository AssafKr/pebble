import {Command} from 'commander';
import {getOrCreatePebbleDir} from '../lib/storage.js';
import {resolveId, claimWithCascade} from '../lib/state.js';
import {outputError, formatJson} from '../lib/output.js';

interface ClaimResultOutput {
  id: string;
  success: boolean;
  claimedIds?: string[];
  error?: string;
}

export function claimCommand(program: Command): void {
  program
    .command('claim <ids...>')
    .description('Claim issues (set status to in_progress). Cascades to open parent issues.')
    .action(async (ids: string[]) => {
      const pretty = program.opts().pretty ?? false;

      try {
        const pebbleDir = getOrCreatePebbleDir();

        // Support comma-separated IDs: "ID1,ID2,ID3" or "ID1 ID2 ID3"
        const allIds = ids.flatMap((id) =>
          id
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        );

        if (allIds.length === 0) {
          throw new Error('No issue IDs provided');
        }

        const results: ClaimResultOutput[] = [];

        for (const id of allIds) {
          try {
            const resolvedId = resolveId(id);
            const result = claimWithCascade(resolvedId, pebbleDir);

            if (result.success) {
              results.push({
                id: resolvedId,
                success: true,
                claimedIds: result.claimedIds,
              });
            } else {
              results.push({
                id: resolvedId,
                success: false,
                error: result.error,
              });
            }
          } catch (error) {
            results.push({id, success: false, error: (error as Error).message});
          }
        }

        // Output results
        if (allIds.length === 1) {
          // Single issue - output success or error
          const result = results[0];
          if (result.success) {
            if (pretty) {
              const cascaded = result.claimedIds?.filter((cid) => cid !== result.id) ?? [];
              if (cascaded.length > 0) {
                console.log(`✓ ${result.id} (also claimed: ${cascaded.join(', ')})`);
              } else {
                console.log(`✓ ${result.id}`);
              }
            } else {
              console.log(
                formatJson({
                  id: result.id,
                  success: true,
                  claimedIds: result.claimedIds,
                })
              );
            }
          } else {
            throw new Error(result.error || 'Unknown error');
          }
        } else {
          // Multiple issues - output array of results
          if (pretty) {
            for (const result of results) {
              if (result.success) {
                const cascaded = result.claimedIds?.filter((cid) => cid !== result.id) ?? [];
                if (cascaded.length > 0) {
                  console.log(`✓ ${result.id} (also claimed: ${cascaded.join(', ')})`);
                } else {
                  console.log(`✓ ${result.id}`);
                }
              } else {
                console.log(`✗ ${result.id}: ${result.error}`);
              }
            }
          } else {
            console.log(
              formatJson(
                results.map((r) => ({
                  id: r.id,
                  success: r.success,
                  ...(r.claimedIds && {claimedIds: r.claimedIds}),
                  ...(r.error && {error: r.error}),
                }))
              )
            );
          }
        }
      } catch (error) {
        outputError(error as Error, pretty);
      }
    });
}
