import {useState, useMemo, useEffect, useRef} from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  type SortingState,
  type ColumnFiltersState,
  type ExpandedState,
} from '@tanstack/react-table';
import type {IssueEvent} from '../../../shared/types';
import {getExpansionForIssue} from './hierarchy';
import {isInViewport} from './utils';
import {useIssueListFiltering} from './useIssueListFiltering';
import {useIssueListColumns} from './useIssueListColumns';
import {IssueListFilterBar} from './IssueListFilterBar';
import {IssueListFilters} from './IssueListFilters';
import {IssueListTable} from './IssueListTable';
import type {FilterPreset, IssueListProps} from './types';

export type {FilterPreset, IssueListProps} from './types';

export function IssueList({
  issues,
  events,
  onSelectIssue,
  selectedIds = new Set(),
  onToggleSelect,
  onSelectAll,
  onClearSelection: _onClearSelection,
  sorting: sortingProp,
  onSortingChange,
  columnFilters: columnFiltersProp,
  onColumnFiltersChange,
  globalFilter: globalFilterProp,
  onGlobalFilterChange,
  expanded: expandedProp,
  onExpandedChange,
  activePreset: activePresetProp,
  onActivePresetChange,
  sourceFilter: sourceFilterProp,
  onSourceFilterChange,
  showDeleted: showDeletedProp,
  onShowDeletedChange,
  activeIssueId = null,
}: IssueListProps) {
  void _onClearSelection;

  const [sortingInternal, setSortingInternal] = useState<SortingState>([{id: 'title', desc: false}]);
  const [columnFiltersInternal, setColumnFiltersInternal] = useState<ColumnFiltersState>([]);
  const [globalFilterInternal, setGlobalFilterInternal] = useState('');
  const [expandedInternal, setExpandedInternal] = useState<ExpandedState>({});
  const [activePresetInternal, setActivePresetInternal] = useState<FilterPreset>(null);
  const [sourceFilterInternal, setSourceFilterInternal] = useState<string>('');
  const [showDeletedInternal, setShowDeletedInternal] = useState(false);

  const sorting = sortingProp ?? sortingInternal;
  const setSorting = onSortingChange ?? setSortingInternal;
  const columnFilters = columnFiltersProp ?? columnFiltersInternal;
  const setColumnFilters = onColumnFiltersChange ?? setColumnFiltersInternal;
  const globalFilter = globalFilterProp ?? globalFilterInternal;
  const setGlobalFilter = onGlobalFilterChange ?? setGlobalFilterInternal;
  const expanded = expandedProp ?? expandedInternal;
  const setExpanded = onExpandedChange ?? setExpandedInternal;
  const activePreset = activePresetProp ?? activePresetInternal;
  const setActivePreset = onActivePresetChange ?? setActivePresetInternal;
  const sourceFilter = sourceFilterProp ?? sourceFilterInternal;
  const setSourceFilter = onSourceFilterChange ?? setSourceFilterInternal;
  const showDeleted = showDeletedProp ?? showDeletedInternal;
  const setShowDeleted = onShowDeletedChange ?? setShowDeletedInternal;
  const prevActiveIssueRef = useRef<string | null>(null);

  const latestEventMap = useMemo(() => {
    const map = new Map<string, IssueEvent>();
    for (const event of events) {
      map.set(event.issueId, event);
    }
    return map;
  }, [events]);

  const {issueMap, sourcePathPrefix, uniqueSources, hierarchicalData} = useIssueListFiltering({
    issues,
    showDeleted,
    sourceFilter,
    activePreset,
    globalFilter,
  });

  const visibleIssueIds = useMemo(() => issues.map((i) => i.id), [issues]);
  const allSelected = visibleIssueIds.length > 0 && visibleIssueIds.every((id) => selectedIds.has(id));
  const someSelected = visibleIssueIds.some((id) => selectedIds.has(id));

  const columns = useIssueListColumns({
    issueMap,
    latestEventMap,
    selectedIds,
    onToggleSelect,
    onSelectAll,
    visibleIssueIds,
    allSelected,
    someSelected,
  });

  const table = useReactTable({
    data: hierarchicalData,
    columns,
    getRowId: (row) => row.id,
    state: {sorting, columnFilters, globalFilter, expanded},
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onExpandedChange: setExpanded,
    getSubRows: (row) => row.subRows,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    filterFromLeafRows: true,
    globalFilterFn: (row, _columnId, filterValue) => {
      const issue = row.original;
      const search = String(filterValue).toLowerCase();
      if (!search) return true;
      if (issue.title.toLowerCase().includes(search)) return true;
      if (issue.id.toLowerCase().includes(search)) return true;
      if (issue.type.toLowerCase().includes(search)) return true;
      if (issue.status.toLowerCase().includes(search)) return true;
      if (issue.description?.toLowerCase().includes(search)) return true;
      if (issue.comments.some((c) => c.text.toLowerCase().includes(search))) return true;
      return false;
    },
  });

  useEffect(() => {
    if (!activeIssueId) return;

    const expansion = getExpansionForIssue(issues, activeIssueId);
    if (Object.keys(expansion).length === 0) return;

    setExpanded((prev) => {
      const current = typeof prev === 'object' && prev !== null ? prev : {};
      return {...current, ...expansion};
    });
  }, [activeIssueId, issues, setExpanded]);

  useEffect(() => {
    if (!activeIssueId) {
      prevActiveIssueRef.current = null;
      return;
    }

    const el = document.querySelector(`[data-issue-id="${CSS.escape(activeIssueId)}"]`);
    if (!el) return;

    const issueChanged = prevActiveIssueRef.current !== activeIssueId;
    prevActiveIssueRef.current = activeIssueId;

    if (issueChanged || !isInViewport(el)) {
      el.scrollIntoView({block: 'nearest', behavior: 'smooth'});
    }
  }, [activeIssueId, expanded, hierarchicalData]);

  const handlePresetClick = (preset: FilterPreset) => {
    if (activePreset === preset) {
      setActivePreset(null);
    } else {
      setActivePreset(preset);
      setColumnFilters([]);
    }
  };

  const hasActiveFilters = !!(
    activePreset ||
    globalFilter ||
    sourceFilter ||
    table.getColumn('status')?.getFilterValue() ||
    table.getColumn('type')?.getFilterValue() ||
    table.getColumn('priority')?.getFilterValue()
  );

  return (
    <div className="space-y-4">
      <IssueListFilterBar
        activePreset={activePreset}
        showDeleted={showDeleted}
        onPresetClick={handlePresetClick}
        onClearPreset={() => setActivePreset(null)}
        onShowDeletedChange={setShowDeleted}
      />

      <IssueListFilters
        table={table}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        sourceFilter={sourceFilter}
        onSourceFilterChange={setSourceFilter}
        uniqueSources={uniqueSources}
        sourcePathPrefix={sourcePathPrefix}
        hasActiveFilters={hasActiveFilters}
        onClearAllFilters={() => {
          setActivePreset(null);
          setGlobalFilter('');
          setSourceFilter('');
          table.resetColumnFilters();
        }}
      />

      <IssueListTable
        table={table}
        columns={columns}
        issueMap={issueMap}
        activeIssueId={activeIssueId}
        onSelectIssue={onSelectIssue}
      />

      <div className="text-sm text-muted-foreground">
        {table.getFilteredRowModel().rows.length} of {issues.length} issue(s)
      </div>
    </div>
  );
}
