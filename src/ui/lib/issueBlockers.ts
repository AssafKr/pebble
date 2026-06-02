import type {Issue} from '../../shared/types';

export function hasOpenBlockers(issue: Issue, issueMap: Map<string, Issue>): boolean {
  return issue.blockedBy.some((blockerId) => {
    const blocker = issueMap.get(blockerId);
    return blocker && blocker.status !== 'closed';
  });
}

export function countOpenBlockers(issue: Issue, issueMap: Map<string, Issue>): number {
  return issue.blockedBy.filter((blockerId) => {
    const blocker = issueMap.get(blockerId);
    return blocker && blocker.status !== 'closed';
  }).length;
}
