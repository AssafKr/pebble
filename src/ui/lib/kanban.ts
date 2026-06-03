import type {Issue} from '../../shared/types';
import type {KanbanColumnId} from './issueRowStyles';
import {sortKanbanCards, sortKanbanClosedCards} from './sort';

export const RECENTLY_CLOSED_MS = 7 * 24 * 60 * 60 * 1000;

export function isRecentlyClosed(issue: Issue, now = Date.now()): boolean {
  if (issue.status !== 'closed') return false;
  const closedAt = issue.statusChangedAt ?? issue.updatedAt;
  return now - new Date(closedAt).getTime() <= RECENTLY_CLOSED_MS;
}

export function getKanbanColumnForIssue(issue: Issue): KanbanColumnId | null {
  if (issue.status === 'in_progress') return 'in_progress';
  if (isRecentlyClosed(issue)) return 'closed';
  if (issue.status === 'closed') return null;
  return 'open';
}

export function isKanbanVisible(issue: Issue, issueMap: Map<string, Issue>): boolean {
  if (issue.deleted) return false;
  if (issue.status === 'in_progress') return true;
  if (isRecentlyClosed(issue)) return true;
  const parent = issue.parent ? issueMap.get(issue.parent) : undefined;
  if (parent?.status === 'in_progress') return true;

  return false;
}

export function getKanbanVisibleIssues(issues: Issue[]): Issue[] {
  const issueMap = new Map(issues.map((i) => [i.id, i]));
  return issues.filter((issue) => isKanbanVisible(issue, issueMap));
}

export interface KanbanColumns {
  open: Issue[];
  in_progress: Issue[];
  closed: Issue[];
}

export function partitionKanbanColumns(issues: Issue[]): KanbanColumns {
  console.log('partitionKanbanColumns', issues);
  const issueMap = new Map(issues.map((i) => [i.id, i]));
  const columns: KanbanColumns = {open: [], in_progress: [], closed: []};

  for (const issue of issues) {
    if (!isKanbanVisible(issue, issueMap)) continue;
    const columnId = getKanbanColumnForIssue(issue);
    if (columnId === null) continue;
    columns[columnId].push(issue);
  }

  columns.open = sortKanbanCards(columns.open);
  columns.in_progress = sortKanbanCards(columns.in_progress);
  columns.closed = sortKanbanClosedCards(columns.closed);

  return columns;
}

export const KANBAN_COLUMN_ORDER: KanbanColumnId[] = ['open', 'in_progress', 'closed'];

export const KANBAN_COLUMN_LABELS: Record<KanbanColumnId, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  closed: 'Recently Closed',
};

const KANBAN_COLUMN_ID_SET = new Set<string>(KANBAN_COLUMN_ORDER);

export function isKanbanColumnId(id: string | number | undefined): id is KanbanColumnId {
  return typeof id === 'string' && KANBAN_COLUMN_ID_SET.has(id);
}

/** Resolve drop target column from a droppable id or an issue id (when pointer lands on a card). */
export function resolveKanbanDropColumn(
  overId: string | number | undefined,
  issueMap: Map<string, Issue>
): KanbanColumnId | undefined {
  if (overId === undefined) return undefined;
  const id = String(overId);
  if (isKanbanColumnId(id)) return id;
  const overIssue = issueMap.get(id);
  if (overIssue) return getKanbanColumnForIssue(overIssue) ?? undefined;
  return undefined;
}
