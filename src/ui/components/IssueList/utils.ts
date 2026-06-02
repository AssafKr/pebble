import type {IssueEvent} from '../../../shared/types';
import type {Issue} from '../../../shared/types';
import type {IssueWithChildren} from './types';

export function isInViewport(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return rect.top >= 0 && rect.bottom <= window.innerHeight;
}

export function getEventDescription(event: IssueEvent): string {
  switch (event.type) {
    case 'create':
      return 'created';
    case 'close':
      return 'closed';
    case 'reopen':
      return 'reopened';
    case 'comment':
      return 'commented';
    case 'update': {
      const data = event.data as Record<string, unknown>;
      const keys = Object.keys(data);
      if (keys.length === 1) {
        return `${keys[0]} changed`;
      }
      return `${keys.length} fields changed`;
    }
    default:
      return 'updated';
  }
}

export function matchesSearch(issue: Issue, search: string): boolean {
  if (!search) return false;
  const lowerSearch = search.toLowerCase();
  if (issue.title.toLowerCase().includes(lowerSearch)) return true;
  if (issue.id.toLowerCase().includes(lowerSearch)) return true;
  if (issue.type.toLowerCase().includes(lowerSearch)) return true;
  if (issue.status.toLowerCase().includes(lowerSearch)) return true;
  if (issue.description?.toLowerCase().includes(lowerSearch)) return true;
  if (issue.comments.some((c) => c.text.toLowerCase().includes(lowerSearch))) return true;
  return false;
}

export function countDescendants(subRows: IssueWithChildren[] | undefined): {total: number; closed: number} {
  if (!subRows || subRows.length === 0) {
    return {total: 0, closed: 0};
  }
  let total = 0;
  let closed = 0;
  for (const child of subRows) {
    total += 1;
    if (child.status === 'closed') closed += 1;
    const grandchildren = countDescendants(child.subRows);
    total += grandchildren.total;
    closed += grandchildren.closed;
  }
  return {total, closed};
}
