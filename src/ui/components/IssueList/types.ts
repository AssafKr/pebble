import type React from 'react';
import type {SortingState, ColumnFiltersState, ExpandedState} from '@tanstack/react-table';
import type {Issue, IssueEvent} from '../../../shared/types';

export type FilterPreset = 'ready' | 'blocked' | 'in_progress' | 'all_open' | null;

export interface IssueListProps {
  issues: Issue[];
  events: IssueEvent[];
  onSelectIssue: (issue: Issue) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (issueId: string) => void;
  onSelectAll?: (issueIds: string[]) => void;
  onClearSelection?: () => void;
  sorting?: SortingState;
  onSortingChange?: React.Dispatch<React.SetStateAction<SortingState>>;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: React.Dispatch<React.SetStateAction<ColumnFiltersState>>;
  globalFilter?: string;
  onGlobalFilterChange?: React.Dispatch<React.SetStateAction<string>>;
  expanded?: ExpandedState;
  onExpandedChange?: React.Dispatch<React.SetStateAction<ExpandedState>>;
  activePreset?: FilterPreset;
  onActivePresetChange?: React.Dispatch<React.SetStateAction<FilterPreset>>;
  sourceFilter?: string;
  onSourceFilterChange?: React.Dispatch<React.SetStateAction<string>>;
  showDeleted?: boolean;
  onShowDeletedChange?: React.Dispatch<React.SetStateAction<boolean>>;
  activeIssueId?: string | null;
}

export interface IssueWithChildren extends Issue {
  subRows?: IssueWithChildren[];
  _isGroup?: boolean;
}
