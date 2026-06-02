import {useDroppable} from '@dnd-kit/core';
import type {Issue} from '../../shared/types';
import {KANBAN_COLUMN_LABELS} from '../lib/kanban';
import type {KanbanColumnId} from '../lib/issueRowStyles';
import {cn} from '../lib/utils';
import {IssueKanbanCard} from './IssueKanbanCard';

interface KanbanColumnProps {
  columnId: KanbanColumnId;
  issues: Issue[];
  issueMap: Map<string, Issue>;
  activeIssueId: string | null;
  onSelectIssue: (issue: Issue) => void;
}

export function KanbanColumn({columnId, issues, issueMap, activeIssueId, onSelectIssue}: KanbanColumnProps) {
  const {setNodeRef, isOver} = useDroppable({id: columnId});

  return (
    <div className={cn('flex flex-col min-h-0 h-full min-w-0 flex-1', isOver && 'bg-primary/5 rounded-xl')}>
      <div className="flex shrink-0 items-center justify-between mb-3 px-1">
        <h2 className="text-sm font-semibold text-foreground">{KANBAN_COLUMN_LABELS[columnId]}</h2>
        <span className="text-xs text-muted-foreground tabular-nums">{issues.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-0 overflow-y-auto rounded-xl border border-dashed border-border-subtle bg-muted/20 p-3 space-y-3 transition-colors',
          isOver && 'border-primary/50'
        )}
      >
        {issues.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No issues</p>
        ) : (
          issues.map((issue) => (
            <IssueKanbanCard
              key={issue.id}
              issue={issue}
              issueMap={issueMap}
              isActive={activeIssueId === issue.id}
              onSelectIssue={onSelectIssue}
            />
          ))
        )}
      </div>
    </div>
  );
}
