import {ChevronDown, ChevronRight, Folder, FolderOpen, Trash2} from 'lucide-react';
import type {Row} from '@tanstack/react-table';
import type {Issue} from '../../../shared/types';
import {cn} from '../../lib/utils';
import {countOpenBlockers} from '../../lib/issueBlockers';
import {countDescendants} from './utils';
import type {IssueWithChildren} from './types';

interface IssueTitleCellProps {
  row: Row<IssueWithChildren>;
  issueMap: Map<string, Issue>;
}

export function IssueTitleCell({row, issueMap}: IssueTitleCellProps) {
  const canExpand = row.getCanExpand();
  const depth = row.depth;
  const isGroup = row.original._isGroup;
  const lastSource = row.original.lastSource;

  if (isGroup) {
    return (
      <div className="flex items-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            row.toggleExpanded();
          }}
          className="p-0.5 hover:bg-muted rounded mr-1"
        >
          {row.getIsExpanded() ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <FolderOpen className="h-4 w-4 mr-1.5 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">{row.original.title}</span>
        <span className="ml-2 text-xs text-muted-foreground">({row.original.subRows?.length ?? 0})</span>
      </div>
    );
  }

  const blockerCount = countOpenBlockers(row.original, issueMap);
  const {total: childCount, closed: closedCount} = countDescendants(row.original.subRows);
  const allDone = childCount > 0 && closedCount === childCount;
  const isDeleted = row.original.deleted;

  return (
    <div style={{paddingLeft: `${depth * 24}px`}}>
      <div className={cn('flex items-center gap-2', isDeleted && 'opacity-60')}>
        {canExpand ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              row.toggleExpanded();
            }}
            className="p-0.5 hover:bg-muted rounded mr-1"
          >
            {row.getIsExpanded() ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : depth > 0 ? (
          <span className="w-5 mr-1 border-l-2 border-b-2 border-muted h-3 rounded-bl" />
        ) : (
          <span className="w-5 mr-1" />
        )}
        <span className={cn('font-medium', isDeleted && 'line-through')}>{row.getValue('title')}</span>
        {isDeleted && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 flex items-center gap-1">
            <Trash2 className="h-3 w-3" />
            Deleted
          </span>
        )}
        {childCount > 0 && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${
              allDone
                ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400'
            }`}
          >
            {closedCount}/{childCount} done
          </span>
        )}
        {blockerCount > 0 && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400">
            {blockerCount} blocker{blockerCount > 1 ? 's' : ''}
          </span>
        )}
      </div>
      {lastSource && (
        <div
          className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5"
          style={{paddingLeft: '20px'}}
          title={`Last modified from: ${lastSource}`}
        >
          <Folder className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{lastSource}</span>
        </div>
      )}
    </div>
  );
}
