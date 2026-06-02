import type {Issue, IssueType, Status} from '../../shared/types';
import {hasOpenBlockers} from './issueBlockers';

export function getIssueStatusBorderClass(
  issue: Issue,
  issueMap: Map<string, Issue>,
  options?: {isGroup?: boolean}
): string {
  if (options?.isGroup) return 'border-l-4 border-l-gray-400';

  const status = issue.status;
  const rowHasOpenBlockers = hasOpenBlockers(issue, issueMap);

  if (status === 'in_progress') return 'border-l-4 border-l-blue-600';
  if (status === 'blocked' || rowHasOpenBlockers) return 'border-l-4 border-l-red-600';
  if (status === 'closed') return 'border-l-4 border-l-emerald-500';
  return 'border-l-4 border-l-amber-400';
}

export function getIssueTypeBackgroundClass(issue: Issue, options?: {isGroup?: boolean}): string {
  if (options?.isGroup) return '';
  if (issue.status === 'closed') return 'bg-muted/30';
  if (issue.type === 'epic') return 'bg-indigo-100 dark:bg-indigo-950/40';
  if (issue.type === 'bug') return 'bg-rose-50 dark:bg-rose-950/30';
  return 'bg-surface';
}

export function getIssueTypeBadgeClass(type: IssueType): string {
  if (type === 'epic') return 'bg-indigo-500 text-white hover:bg-indigo-600';
  if (type === 'bug') return 'bg-rose-500 text-white hover:bg-rose-600';
  return 'bg-slate-500 text-white hover:bg-slate-600';
}

export type KanbanColumnId = 'open' | 'in_progress' | 'closed';

export function getKanbanColumnForStatus(status: Status): KanbanColumnId {
  if (status === 'in_progress') return 'in_progress';
  if (status === 'closed') return 'closed';
  return 'open';
}
