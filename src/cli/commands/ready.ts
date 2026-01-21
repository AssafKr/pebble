import { Command } from 'commander';
import { ISSUE_TYPES, type IssueType } from '../../shared/types.js';
import { getOrCreatePebbleDir } from '../lib/storage.js';
import { getReady, getBlocking, getChildren, getVerifications, getComputedState, getAncestryChain } from '../lib/state.js';
import { outputIssueList, outputIssueListVerbose, outputError, type VerboseIssueInfo, type LimitInfo } from '../lib/output.js';

export function readyCommand(program: Command): void {
  program
    .command('ready')
    .description('Show issues ready for work (no open blockers)')
    .option('-v, --verbose', 'Show expanded details (parent, children, blocking, verifications)')
    .option('-t, --type <type>', 'Filter by type: task, bug, epic, verification')
    .option('--limit <n>', 'Max issues to return (default: 30)')
    .option('--all', 'Show all issues (no limit)')
    .action(async (options) => {
      const pretty = program.opts().pretty ?? false;

      try {
        // Auto-init .pebble/ if it doesn't exist
        getOrCreatePebbleDir();

        let issues = getReady();

        // Filter by type if specified
        if (options.type) {
          const typeFilter = options.type.toLowerCase() as IssueType;
          if (!ISSUE_TYPES.includes(typeFilter)) {
            throw new Error(`Invalid type: ${options.type}. Must be one of: ${ISSUE_TYPES.join(', ')}`);
          }
          issues = issues.filter((i) => i.type === typeFilter);
        }

        // Sort by createdAt descending (newest first)
        issues.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Apply limit
        const total = issues.length;
        const limit = options.all ? 0 : (options.limit ? parseInt(options.limit, 10) : 30);
        if (limit > 0 && issues.length > limit) {
          issues = issues.slice(0, limit);
        }
        const limitInfo: LimitInfo = {
          total,
          shown: issues.length,
          limited: limit > 0 && total > limit,
        };

        if (options.verbose) {
          // Get computed state once for efficient ancestry lookups
          const state = getComputedState();

          // Build verbose info for each issue
          const verboseIssues: VerboseIssueInfo[] = issues.map((issue) => {
            return {
              issue,
              blocking: getBlocking(issue.id).map((i) => i.id),
              children: getChildren(issue.id).length,
              verifications: getVerifications(issue.id).length,
              ancestry: getAncestryChain(issue.id, state),
            };
          });
          outputIssueListVerbose(verboseIssues, pretty, 'Ready Issues', limitInfo);
        } else {
          outputIssueList(issues, pretty, limitInfo);
        }
      } catch (error) {
        outputError(error as Error, pretty);
      }
    });
}
