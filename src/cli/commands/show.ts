import {Command} from 'commander';
import {getOrCreatePebbleDir} from '../lib/storage.js';
import {
  getIssue,
  resolveId,
  getBlocking,
  getChildren,
  getRelated,
  getComputedState,
  getAncestryChain,
} from '../lib/state.js';
import {outputIssueDetail, outputError} from '../lib/output.js';

export function showCommand(program: Command): void {
  program
    .command('show <id>')
    .description('Show issue details')
    .action(async (id: string) => {
      const pretty = program.opts().pretty ?? false;

      try {
        // Auto-init .pebble/ if it doesn't exist
        getOrCreatePebbleDir();

        const resolvedId = resolveId(id);
        const issue = getIssue(resolvedId);

        if (!issue) {
          throw new Error(`Issue not found: ${id}`);
        }

        const blocking = getBlocking(resolvedId);
        const children = issue.type === 'epic' ? getChildren(resolvedId) : [];
        const related = getRelated(resolvedId);
        const state = getComputedState();
        const ancestry = getAncestryChain(resolvedId, state);

        outputIssueDetail(issue, {blocking, children, related, ancestry}, pretty);
      } catch (error) {
        outputError(error as Error, pretty);
      }
    });
}
