import {useCallback, useMemo, useState, type RefObject} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {Breadcrumbs} from './Breadcrumbs';
import {BulkActionBar} from './BulkActionBar';
import {CommentsView} from './CommentsView';
import {CreateIssueForm} from './CreateIssueForm';
import {Dashboard} from './Dashboard';
import {HistoryView} from './HistoryView';
import {IssueList} from './IssueList';
import {KanbanBoard} from './KanbanBoard';
import type {Issue} from '../../shared/types';
import {useKeyboardShortcuts} from '../hooks/useKeyboardShortcuts';
import {useSuspenseIssues} from '../hooks/useIssues';
import type {ViewFilters} from '../hooks/useViewFilters';
import {pageTransition, pageVariants} from '../lib/motion';
import type {AppView} from '../lib/routes';

interface AppMainProps {
  view: AppView;
  selectedIssueId: string | null;
  onViewChange: (view: AppView) => void;
  onSelectIssue: (issue: Issue) => void;
  onClearSelectedIssue: () => void;
  createDialogOpen: boolean;
  onCreateDialogOpenChange: (open: boolean) => void;
  selectedIds: Set<string>;
  onToggleSelect: (issueId: string) => void;
  onSelectAll: (issueIds: string[]) => void;
  onClearSelection: () => void;
  filters: ViewFilters;
  commentInputRef: RefObject<HTMLTextAreaElement>;
}

export function AppMain({
  view,
  selectedIssueId,
  onViewChange,
  onSelectIssue,
  onClearSelectedIssue,
  createDialogOpen,
  onCreateDialogOpenChange,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  filters,
  commentInputRef,
}: AppMainProps) {
  const {issues, events} = useSuspenseIssues();
  const [keyboardIndex, setKeyboardIndex] = useState(-1);

  const selectedIssue = useMemo(
    () => (selectedIssueId ? issues.find((issue) => issue.id === selectedIssueId) ?? null : null),
    [issues, selectedIssueId]
  );

  const handleNavigateNext = useCallback(() => {
    if (view !== 'list' || issues.length === 0) return;
    setKeyboardIndex((prev) => {
      const next = Math.min(prev + 1, issues.length - 1);
      onSelectIssue(issues[next]);
      return next;
    });
  }, [view, issues, onSelectIssue]);

  const handleNavigatePrev = useCallback(() => {
    if (view !== 'list' || issues.length === 0) return;
    setKeyboardIndex((prev) => {
      const next = Math.max(prev - 1, 0);
      onSelectIssue(issues[next]);
      return next;
    });
  }, [view, issues, onSelectIssue]);

  const handleOpenDetailShortcut = useCallback(() => {
    if (keyboardIndex >= 0 && keyboardIndex < issues.length) {
      onSelectIssue(issues[keyboardIndex]);
    }
  }, [keyboardIndex, issues, onSelectIssue]);

  const handleFocusComment = useCallback(() => {
    if (selectedIssueId && commentInputRef.current) {
      commentInputRef.current.focus();
    }
  }, [selectedIssueId, commentInputRef]);

  useKeyboardShortcuts({
    onNewIssue: () => onCreateDialogOpenChange(true),
    onNavigateNext: handleNavigateNext,
    onNavigatePrev: handleNavigatePrev,
    onOpenDetail: handleOpenDetailShortcut,
    onFocusComment: handleFocusComment,
  });

  return (
    <>
      <Breadcrumbs
        view={view}
        selectedIssueId={selectedIssueId}
        selectedIssue={selectedIssue}
        allIssues={issues}
        onClearSelection={onClearSelectedIssue}
        onSelectIssue={onSelectIssue}
        onNavigateToView={onViewChange}
      />

      <AnimatePresence mode="wait">
        {view === 'list' && (
          <motion.div
            key="list"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            <BulkActionBar selectedIds={selectedIds} onClearSelection={onClearSelection} />
            <IssueList
              issues={issues}
              events={events}
              onSelectIssue={onSelectIssue}
              activeIssueId={selectedIssueId}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
              onSelectAll={onSelectAll}
              onClearSelection={onClearSelection}
              sorting={filters.listSorting}
              onSortingChange={filters.setListSorting}
              columnFilters={filters.listColumnFilters}
              onColumnFiltersChange={filters.setListColumnFilters}
              globalFilter={filters.listGlobalFilter}
              onGlobalFilterChange={filters.setListGlobalFilter}
              expanded={filters.listExpanded}
              onExpandedChange={filters.setListExpanded}
              activePreset={filters.listActivePreset}
              onActivePresetChange={filters.setListActivePreset}
              sourceFilter={filters.listSourceFilter}
              onSourceFilterChange={filters.setListSourceFilter}
              showDeleted={filters.showDeleted}
              onShowDeletedChange={filters.setShowDeleted}
            />
          </motion.div>
        )}
        {view === 'kanban' && (
          <motion.div
            key="kanban"
            className="h-[calc(100dvh-12rem)] min-h-[420px]"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            <KanbanBoard issues={issues} onSelectIssue={onSelectIssue} activeIssueId={selectedIssueId} />
          </motion.div>
        )}
        {view === 'dashboard' && (
          <motion.div
            key="dashboard"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            <Dashboard issues={issues} events={events} onSelectIssue={onSelectIssue} />
          </motion.div>
        )}
        {view === 'history' && (
          <motion.div
            key="history"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            <HistoryView
              events={events}
              issues={issues}
              onSelectIssue={onSelectIssue}
              searchFilter={filters.historySearchFilter}
              onSearchFilterChange={filters.setHistorySearchFilter}
              typeFilter={filters.historyTypeFilter}
              onTypeFilterChange={filters.setHistoryTypeFilter}
              issueFilter={filters.historyIssueFilter}
              onIssueFilterChange={filters.setHistoryIssueFilter}
            />
          </motion.div>
        )}
        {view === 'comments' && (
          <motion.div
            key="comments"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            <CommentsView
              events={events}
              issues={issues}
              onSelectIssue={onSelectIssue}
              searchFilter={filters.commentsSearchFilter}
              onSearchFilterChange={filters.setCommentsSearchFilter}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <CreateIssueForm open={createDialogOpen} onOpenChange={onCreateDialogOpenChange} epics={issues} />
    </>
  );
}
