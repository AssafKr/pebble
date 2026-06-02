import {useMemo} from 'react';
import type {ColumnDef} from '@tanstack/react-table';
import {ArrowUpDown} from 'lucide-react';
import type {Issue, IssueEvent} from '../../../shared/types';
import {STATUS_BADGE_VARIANTS, PRIORITY_DISPLAY_LABELS} from '../../../shared/types';
import {formatRelativeTime} from '../../../shared/time';
import {Badge} from '../ui/badge';
import {getIssueTypeBadgeClass} from '../../lib/issueRowStyles';
import {getPriorityTextClass} from '../../lib/priorityStyles';
import {getStatusOrder} from '../../lib/sort';
import {IssueTitleCell} from './IssueTitleCell';
import {getEventDescription} from './utils';
import type {IssueWithChildren} from './types';

interface UseIssueListColumnsOptions {
  issueMap: Map<string, Issue>;
  latestEventMap: Map<string, IssueEvent>;
  selectedIds: Set<string>;
  onToggleSelect?: (issueId: string) => void;
  onSelectAll?: (issueIds: string[]) => void;
  visibleIssueIds: string[];
  allSelected: boolean;
  someSelected: boolean;
}

export function useIssueListColumns({
  issueMap,
  latestEventMap,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  visibleIssueIds,
  allSelected,
  someSelected,
}: UseIssueListColumnsOptions) {
  return useMemo<ColumnDef<IssueWithChildren>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected && !allSelected;
            }}
            onChange={(e) => {
              e.stopPropagation();
              if (e.target.checked) {
                onSelectAll?.(visibleIssueIds);
              } else {
                onSelectAll?.([]);
              }
            }}
            className="h-4 w-4 rounded border-gray-300 cursor-pointer"
            title="Select all issues"
          />
        ),
        cell: ({row}) => {
          if (row.original._isGroup) {
            return null;
          }
          return (
            <input
              type="checkbox"
              checked={selectedIds.has(row.original.id)}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelect?.(row.original.id);
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 rounded border-gray-300 cursor-pointer"
            />
          );
        },
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        accessorKey: 'title',
        header: ({column}) => (
          <button
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Title
            <ArrowUpDown className="h-4 w-4" />
          </button>
        ),
        cell: ({row}) => <IssueTitleCell row={row} issueMap={issueMap} />,
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({row}) => {
          if (row.original._isGroup) return null;
          const type = row.getValue('type') as Issue['type'];
          return <Badge className={getIssueTypeBadgeClass(type)}>{type}</Badge>;
        },
        filterFn: (row, id, value) => value === '' || row.getValue(id) === value,
      },
      {
        accessorKey: 'priority',
        header: ({column}) => (
          <button
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Priority
            <ArrowUpDown className="h-4 w-4" />
          </button>
        ),
        cell: ({row}) => {
          if (row.original._isGroup) return null;
          const priority = row.getValue('priority') as keyof typeof PRIORITY_DISPLAY_LABELS;
          return <span className={getPriorityTextClass(priority)}>{PRIORITY_DISPLAY_LABELS[priority]}</span>;
        },
        filterFn: (row, id, value) => value === '' || String(row.getValue(id)) === value,
      },
      {
        accessorKey: 'status',
        header: ({column}) => (
          <button
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Status
            <ArrowUpDown className="h-4 w-4" />
          </button>
        ),
        cell: ({row}) => {
          if (row.original._isGroup) return null;
          const status = row.getValue('status') as keyof typeof STATUS_BADGE_VARIANTS;
          return <Badge variant={STATUS_BADGE_VARIANTS[status]}>{status.replace('_', ' ')}</Badge>;
        },
        sortingFn: (rowA, rowB) => {
          const statusA = rowA.getValue('status') as string;
          const statusB = rowB.getValue('status') as string;
          return getStatusOrder(statusA) - getStatusOrder(statusB);
        },
        filterFn: (row, id, value) => value === '' || row.getValue(id) === value,
      },
      {
        accessorKey: 'updatedAt',
        header: ({column}) => (
          <button
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Updated
            <ArrowUpDown className="h-4 w-4" />
          </button>
        ),
        cell: ({row}) => {
          if (row.original._isGroup) return null;
          const latestEvent = latestEventMap.get(row.original.id);
          if (!latestEvent) {
            return <span className="text-muted-foreground text-xs">—</span>;
          }
          return (
            <div className="text-xs" title={new Date(latestEvent.timestamp).toLocaleString()}>
              <span className="text-muted-foreground">{formatRelativeTime(latestEvent.timestamp)}</span>
              <span className="block text-muted-foreground/70">{getEventDescription(latestEvent)}</span>
            </div>
          );
        },
        sortingFn: (rowA, rowB) =>
          new Date(rowA.original.updatedAt).getTime() - new Date(rowB.original.updatedAt).getTime(),
      },
    ],
    [issueMap, latestEventMap, selectedIds, onToggleSelect, onSelectAll, visibleIssueIds, allSelected, someSelected]
  );
}
