import type {Issue} from '../../shared/types';
import {hasOpenBlockers} from './issueBlockers';

export interface BlockedAncestor {
  ancestor: Issue;
  blockers: Issue[];
}

export function getBlockedAncestor(issue: Issue, issueMap: Map<string, Issue>): BlockedAncestor | null {
  let current = issue;
  while (current.parent) {
    const parent = issueMap.get(current.parent);
    if (!parent) break;

    const openBlockers = parent.blockedBy
      .map((id) => issueMap.get(id))
      .filter((i): i is Issue => i !== undefined && i.status !== 'closed' && !i.deleted);

    if (openBlockers.length > 0) {
      return {ancestor: parent, blockers: openBlockers};
    }
    current = parent;
  }
  return null;
}

export function cannotClaimIssue(issue: Issue, issueMap: Map<string, Issue>): boolean {
  return hasOpenBlockers(issue, issueMap) || getBlockedAncestor(issue, issueMap) !== null;
}

export function getClaimBlockedMessage(issue: Issue, issueMap: Map<string, Issue>): string {
  if (hasOpenBlockers(issue, issueMap)) {
    const blockerIds = issue.blockedBy
      .filter((id) => {
        const blocker = issueMap.get(id);
        return blocker && blocker.status !== 'closed';
      })
      .join(', ');
    return `Cannot set to in progress — blocked by: ${blockerIds}`;
  }
  const blockedAncestor = getBlockedAncestor(issue, issueMap);
  if (blockedAncestor) {
    const ids = blockedAncestor.blockers.map((b) => b.id).join(', ');
    return `Cannot set to in progress — ancestor ${blockedAncestor.ancestor.id} blocked by: ${ids}`;
  }
  return 'Cannot set to in progress';
}
