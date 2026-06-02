import {useState} from 'react';
import type {SortingState, ColumnFiltersState, ExpandedState} from '@tanstack/react-table';
import type {FilterPreset} from '../components/IssueList';

export function useViewFilters() {
  const [listSorting, setListSorting] = useState<SortingState>([
    {id: 'status', desc: false},
    {id: 'updatedAt', desc: true},
  ]);
  const [listColumnFilters, setListColumnFilters] = useState<ColumnFiltersState>([]);
  const [listGlobalFilter, setListGlobalFilter] = useState('');
  const [listExpanded, setListExpanded] = useState<ExpandedState>({});
  const [listActivePreset, setListActivePreset] = useState<FilterPreset>(null);
  const [listSourceFilter, setListSourceFilter] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [historySearchFilter, setHistorySearchFilter] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('');
  const [historyIssueFilter, setHistoryIssueFilter] = useState('');
  const [commentsSearchFilter, setCommentsSearchFilter] = useState('');

  return {
    listSorting,
    setListSorting,
    listColumnFilters,
    setListColumnFilters,
    listGlobalFilter,
    setListGlobalFilter,
    listExpanded,
    setListExpanded,
    listActivePreset,
    setListActivePreset,
    listSourceFilter,
    setListSourceFilter,
    showDeleted,
    setShowDeleted,
    historySearchFilter,
    setHistorySearchFilter,
    historyTypeFilter,
    setHistoryTypeFilter,
    historyIssueFilter,
    setHistoryIssueFilter,
    commentsSearchFilter,
    setCommentsSearchFilter,
  };
}

export type ViewFilters = ReturnType<typeof useViewFilters>;
