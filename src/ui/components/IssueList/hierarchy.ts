import type {Issue} from '../../../shared/types';
import {getStatusOrder} from '../../lib/sort';
import type {IssueWithChildren} from './types';

export function buildHierarchy(issues: Issue[]): IssueWithChildren[] {
  const issueMap = new Map(issues.map((i) => [i.id, i]));
  const childrenByParent = new Map<string, Issue[]>();

  for (const issue of issues) {
    if (issue.parent && issueMap.has(issue.parent)) {
      const children = childrenByParent.get(issue.parent) || [];
      children.push(issue);
      childrenByParent.set(issue.parent, children);
    }
  }

  function buildIssueWithChildren(issue: Issue): IssueWithChildren {
    const children = childrenByParent.get(issue.id) || [];
    const sortedChildren = [...children].sort((a, b) => getStatusOrder(a.status) - getStatusOrder(b.status));
    const subRowsList = sortedChildren.map((child) => buildIssueWithChildren(child));
    const subRows = subRowsList.length > 0 ? subRowsList : undefined;

    return {...issue, subRows};
  }

  const epicsAndParents: IssueWithChildren[] = [];
  const orphans: IssueWithChildren[] = [];

  for (const issue of issues) {
    if (issue.parent && issueMap.has(issue.parent)) {
      continue;
    }

    const builtIssue = buildIssueWithChildren(issue);

    if (issue.type === 'epic' || (builtIssue.subRows?.length ?? 0) > 0) {
      epicsAndParents.push(builtIssue);
    } else {
      orphans.push(builtIssue);
    }
  }

  epicsAndParents.sort((a, b) => getStatusOrder(a.status) - getStatusOrder(b.status));
  orphans.sort((a, b) => getStatusOrder(a.status) - getStatusOrder(b.status));

  if (orphans.length > 0) {
    const noParentGroup: IssueWithChildren = {
      id: '__NO_PARENT__',
      title: 'No parent',
      type: 'epic',
      priority: 4,
      status: 'open',
      description: '',
      blockedBy: [],
      relatedTo: [],
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subRows: orphans,
      _isGroup: true,
    };
    return [...epicsAndParents, noParentGroup];
  }

  return epicsAndParents;
}

export function getExpansionForIssue(issues: Issue[], issueId: string): Record<string, boolean> {
  const issueMap = new Map(issues.map((i) => [i.id, i]));
  const issue = issueMap.get(issueId);
  if (!issue) return {};

  const expanded: Record<string, boolean> = {};
  let current: Issue | undefined = issue;

  while (current?.parent && issueMap.has(current.parent)) {
    expanded[current.parent] = true;
    current = issueMap.get(current.parent);
  }

  const hasChildren = issues.some((i) => i.parent === issue.id);
  const isOrphan = (!issue.parent || !issueMap.has(issue.parent)) && issue.type !== 'epic' && !hasChildren;
  if (isOrphan) {
    expanded['__NO_PARENT__'] = true;
  }

  return expanded;
}
