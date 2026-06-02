import {useMemo, useState} from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type {Issue} from '../../shared/types';
import {
  getKanbanColumnForIssue,
  KANBAN_COLUMN_ORDER,
  partitionKanbanColumns,
  resolveKanbanDropColumn,
} from '../lib/kanban';
import {useKanbanStatusChange} from '../hooks/useKanbanStatusChange';
import {IssueKanbanCard} from './IssueKanbanCard';
import {KanbanColumn} from './KanbanColumn';

interface KanbanBoardProps {
  issues: Issue[];
  onSelectIssue: (issue: Issue) => void;
  activeIssueId?: string | null;
}

export function KanbanBoard({issues, onSelectIssue, activeIssueId = null}: KanbanBoardProps) {
  const [activeDragIssue, setActiveDragIssue] = useState<Issue | null>(null);
  const {moveToColumn} = useKanbanStatusChange(issues);

  const issueMap = useMemo(() => new Map(issues.map((i) => [i.id, i])), [issues]);
  const columns = useMemo(() => partitionKanbanColumns(issues), [issues]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {distance: 8},
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const issue = event.active.data.current?.issue as Issue | undefined;
    if (issue) setActiveDragIssue(issue);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragIssue(null);
    const {active, over} = event;
    if (!over) return;

    const issue = active.data.current?.issue as Issue | undefined;
    if (!issue) return;

    const targetColumn = resolveKanbanDropColumn(over.id, issueMap);
    if (!targetColumn) return;

    const currentColumn = getKanbanColumnForIssue(issue);
    if (!currentColumn || currentColumn === targetColumn) return;

    await moveToColumn(issue, targetColumn);
  };

  const handleDragCancel = () => {
    setActiveDragIssue(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid h-full min-h-0 grid-cols-1 grid-rows-3 md:grid-cols-3 md:grid-rows-1 gap-6">
        {KANBAN_COLUMN_ORDER.map((columnId) => (
          <KanbanColumn
            key={columnId}
            columnId={columnId}
            issues={columns[columnId]}
            issueMap={issueMap}
            activeIssueId={activeIssueId}
            onSelectIssue={onSelectIssue}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDragIssue ? (
          <IssueKanbanCard issue={activeDragIssue} issueMap={issueMap} isDragging onSelectIssue={onSelectIssue} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
