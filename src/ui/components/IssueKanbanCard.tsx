import {useDraggable} from '@dnd-kit/core';
import {CSS} from '@dnd-kit/utilities';
import {Diamond} from 'lucide-react';
import type {Issue} from '../../shared/types';
import {PRIORITY_DISPLAY_LABELS} from '../../shared/types';
import {countOpenBlockers} from '../lib/issueBlockers';
import {getIssueStatusBorderClass, getIssueTypeBackgroundClass, getIssueTypeBadgeClass} from '../lib/issueRowStyles';
import {getPriorityTextClass} from '../lib/priorityStyles';
import {cn} from '../lib/utils';
import {Badge} from './ui/badge';

interface IssueKanbanCardProps {
  issue: Issue;
  issueMap: Map<string, Issue>;
  isActive?: boolean;
  isDragging?: boolean;
  onSelectIssue: (issue: Issue) => void;
}

export function IssueKanbanCard({
  issue,
  issueMap,
  isActive = false,
  isDragging = false,
  onSelectIssue,
}: IssueKanbanCardProps) {
  const {attributes, listeners, setNodeRef, transform, isDragging: isDraggingLocal} = useDraggable({
    id: issue.id,
    data: {issue},
  });

  const dragging = isDragging || isDraggingLocal;
  const blockerCount = countOpenBlockers(issue, issueMap);
  const statusBorder = getIssueStatusBorderClass(issue, issueMap);
  const typeBg = getIssueTypeBackgroundClass(issue);
  const isClosed = issue.status === 'closed';

  const parentEpic = issue.parent ? issueMap.get(issue.parent) : undefined;
  const showParentEpic = parentEpic?.type === 'epic';

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-issue-id={issue.id}
      className={cn(
        'rounded-lg border border-border shadow-sm cursor-grab active:cursor-grabbing',
        statusBorder,
        typeBg,
        isClosed && 'opacity-75',
        isActive && 'ring-2 ring-primary/40',
        dragging && 'opacity-50'
      )}
      {...listeners}
      {...attributes}
      onClick={() => onSelectIssue(issue)}
    >
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          {showParentEpic && parentEpic ? (
            <div
              className="flex items-center gap-1.5 min-w-0 flex-1"
              title={`Parent epic: ${parentEpic.title}`}
              aria-label={`Parent epic: ${parentEpic.title}`}
            >
              <Diamond className="h-3.5 w-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden />
              <span className="text-xs text-muted-foreground truncate">{parentEpic.title}</span>
            </div>
          ) : (
            <span className="flex-1 min-w-0" />
          )}
          <Badge className={cn('shrink-0 text-xs', getIssueTypeBadgeClass(issue.type))}>{issue.type}</Badge>
        </div>
        <p className="font-medium text-sm leading-snug line-clamp-2">{issue.title}</p>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className={getPriorityTextClass(issue.priority)}>
            {PRIORITY_DISPLAY_LABELS[issue.priority]}
          </span>
          {blockerCount > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400">
              {blockerCount} blocker{blockerCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
