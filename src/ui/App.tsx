import { Suspense, useState, useEffect, useMemo, useCallback, useRef, type RefObject, type Dispatch, type SetStateAction } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { useIssues, useSuspenseIssues, useInvalidateIssuesData } from './hooks/useIssues';
import { useAppNavigation } from './hooks/useAppNavigation';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import type { AppView } from './lib/routes';
import { viewPath } from './lib/routes';
import { IssueList, type FilterPreset } from './components/IssueList';
import type { SortingState, ColumnFiltersState, ExpandedState } from '@tanstack/react-table';
import { HistoryView } from './components/HistoryView';
import { CommentsView } from './components/CommentsView';
import { Dashboard } from './components/Dashboard';
import { Breadcrumbs } from './components/Breadcrumbs';
import { CreateIssueForm } from './components/CreateIssueForm';
import { BulkActionBar } from './components/BulkActionBar';
import { ThemeToggle } from './components/ThemeToggle';
import { SourceManager } from './components/SourceManager';
import { IssueDetailSkeleton } from './components/IssueDetailSkeleton';
import { SuspendedIssueDetail } from './components/SuspendedIssueDetail';
import { IssuesQueryBoundary } from './components/IssuesQueryBoundary';
import { IssuesStreamSubscriber } from './components/IssuesStreamSubscriber';
import { LegacySearchRedirect } from './components/LegacySearchRedirect';
import { Button } from './components/ui/button';
import type { Issue } from '../shared/types';
import { fetchSources, type SourcesResponse } from './lib/api';
import { List, History, LayoutDashboard, RefreshCw, Loader2, Plus, FolderSync, MessageSquare } from 'lucide-react';
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

const pageTransition = {
  duration: 0.25,
  ease: [0.4, 0, 0.2, 1] as const,
};

function IssuesCountBadge() {
  const { issues } = useSuspenseIssues();
  return (
    <span className="text-sm text-foreground-muted bg-background-subtle px-3 py-1 rounded-full">
      {issues.length} issues
    </span>
  );
}

function RefreshIssuesButton() {
  const { isRefreshing, refresh } = useIssues();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => void refresh()}
      disabled={isRefreshing}
      className="text-foreground-muted hover:text-foreground"
    >
      {isRefreshing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
    </Button>
  );
}

function MainContentSkeleton() {
  return (
    <div className="flex items-center justify-center h-64">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-3"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm text-foreground-muted">Loading issues...</span>
      </motion.div>
    </div>
  );
}

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
  listSorting: SortingState;
  onListSortingChange: Dispatch<SetStateAction<SortingState>>;
  listColumnFilters: ColumnFiltersState;
  onListColumnFiltersChange: Dispatch<SetStateAction<ColumnFiltersState>>;
  listGlobalFilter: string;
  onListGlobalFilterChange: Dispatch<SetStateAction<string>>;
  listExpanded: ExpandedState;
  onListExpandedChange: Dispatch<SetStateAction<ExpandedState>>;
  listActivePreset: FilterPreset;
  onListActivePresetChange: Dispatch<SetStateAction<FilterPreset>>;
  listSourceFilter: string;
  onListSourceFilterChange: Dispatch<SetStateAction<string>>;
  showDeleted: boolean;
  onShowDeletedChange: Dispatch<SetStateAction<boolean>>;
  historySearchFilter: string;
  onHistorySearchFilterChange: Dispatch<SetStateAction<string>>;
  historyTypeFilter: string;
  onHistoryTypeFilterChange: Dispatch<SetStateAction<string>>;
  historyIssueFilter: string;
  onHistoryIssueFilterChange: Dispatch<SetStateAction<string>>;
  commentsSearchFilter: string;
  onCommentsSearchFilterChange: Dispatch<SetStateAction<string>>;
  commentInputRef: RefObject<HTMLTextAreaElement>;
}

function AppMain({
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
  listSorting,
  onListSortingChange,
  listColumnFilters,
  onListColumnFiltersChange,
  listGlobalFilter,
  onListGlobalFilterChange,
  listExpanded,
  onListExpandedChange,
  listActivePreset,
  onListActivePresetChange,
  listSourceFilter,
  onListSourceFilterChange,
  showDeleted,
  onShowDeletedChange,
  historySearchFilter,
  onHistorySearchFilterChange,
  historyTypeFilter,
  onHistoryTypeFilterChange,
  historyIssueFilter,
  onHistoryIssueFilterChange,
  commentsSearchFilter,
  onCommentsSearchFilterChange,
  commentInputRef,
}: AppMainProps) {
  const { issues, events, refresh } = useSuspenseIssues();
  const [keyboardIndex, setKeyboardIndex] = useState(-1);

  const selectedIssue = useMemo(
    () => (selectedIssueId ? issues.find((issue) => issue.id === selectedIssueId) ?? null : null),
    [issues, selectedIssueId],
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
            <BulkActionBar
              selectedIds={selectedIds}
              onClearSelection={onClearSelection}
              onRefresh={() => void refresh()}
            />
            <IssueList
              issues={issues}
              events={events}
              onSelectIssue={onSelectIssue}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
              onSelectAll={onSelectAll}
              onClearSelection={onClearSelection}
              sorting={listSorting}
              onSortingChange={onListSortingChange}
              columnFilters={listColumnFilters}
              onColumnFiltersChange={onListColumnFiltersChange}
              globalFilter={listGlobalFilter}
              onGlobalFilterChange={onListGlobalFilterChange}
              expanded={listExpanded}
              onExpandedChange={onListExpandedChange}
              activePreset={listActivePreset}
              onActivePresetChange={onListActivePresetChange}
              sourceFilter={listSourceFilter}
              onSourceFilterChange={onListSourceFilterChange}
              showDeleted={showDeleted}
              onShowDeletedChange={onShowDeletedChange}
            />
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
              searchFilter={historySearchFilter}
              onSearchFilterChange={onHistorySearchFilterChange}
              typeFilter={historyTypeFilter}
              onTypeFilterChange={onHistoryTypeFilterChange}
              issueFilter={historyIssueFilter}
              onIssueFilterChange={onHistoryIssueFilterChange}
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
              searchFilter={commentsSearchFilter}
              onSearchFilterChange={onCommentsSearchFilterChange}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <CreateIssueForm
        open={createDialogOpen}
        onOpenChange={onCreateDialogOpenChange}
        onCreated={() => void refresh()}
        epics={issues}
      />
    </>
  );
}

function AppContent() {
  const { resolvedTheme } = useTheme();
  const { view, issueId, isValidView, goToView, selectIssue, closeIssue } = useAppNavigation();
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sources, setSources] = useState<SourcesResponse | null>(null);
  const [sourceManagerOpen, setSourceManagerOpen] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const invalidateIssues = useInvalidateIssuesData();

  useEffect(() => {
    if (!isValidView) {
      navigate(viewPath('list'), { replace: true });
    }
  }, [isValidView, navigate]);

  useEffect(() => {
    fetchSources()
      .then(setSources)
      .catch(() => setSources(null));
  }, []);

  const [listSorting, setListSorting] = useState<SortingState>([
    { id: 'status', desc: false },
    { id: 'updatedAt', desc: true },
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

  const handleViewChange = useCallback(
    (newView: AppView) => {
      goToView(newView);
    },
    [goToView],
  );

  const handleSelectIssue = useCallback(
    (issue: Issue) => {
      selectIssue(issue);
    },
    [selectIssue],
  );

  const handleCloseDetail = useCallback(() => {
    closeIssue();
  }, [closeIssue]);

  const handleToggleSelect = useCallback((issueId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(issueId)) {
        next.delete(issueId);
      } else {
        next.add(issueId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((issueIds: string[]) => {
    setSelectedIds(new Set(issueIds));
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <LegacySearchRedirect />
      <IssuesStreamSubscriber />
      <header className="border-b border-border-subtle sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <div className="container mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-display font-semibold italic text-primary">pebble</h1>
            <Suspense fallback={null}>
              <IssuesCountBadge />
            </Suspense>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={() => setCreateDialogOpen(true)} title="New Issue (n)">
              <Plus className="h-4 w-4 mr-2" />
              New Issue
            </Button>

            <div className="flex bg-background-subtle rounded-xl p-1">
              {[
                { key: 'list' as const, icon: List, label: 'List' },
                { key: 'dashboard' as const, icon: LayoutDashboard, label: 'Dashboard' },
                { key: 'history' as const, icon: History, label: 'History' },
                { key: 'comments' as const, icon: MessageSquare, label: 'Comments' },
              ].map(({ key, icon: Icon, label }) => (
                <NavLink
                  key={key}
                  to={viewPath(key)}
                  className={({ isActive }) => `
                    flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-fast
                    ${isActive
                      ? 'bg-surface text-foreground shadow-sm'
                      : 'text-foreground-muted hover:text-foreground hover:bg-surface/50'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </div>

            <RefreshIssuesButton />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSourceManagerOpen(true)}
              title="Manage issue sources"
              className="text-foreground-muted hover:text-foreground"
            >
              <FolderSync className="h-4 w-4" />
              {sources?.isMultiWorktree && (
                <span className="ml-1 text-xs bg-accent text-accent-foreground px-1.5 rounded-full">
                  {sources.files.length}
                </span>
              )}
            </Button>

            <ThemeToggle />
          </div>
        </div>
      </header>

      <main
        className={`px-6 py-8 transition-all duration-normal ${
          issueId ? 'mr-[520px]' : ''
        }`}
      >
        <IssuesQueryBoundary>
          <Suspense fallback={<MainContentSkeleton />}>
            <AppMain
              view={view}
              selectedIssueId={issueId}
              onViewChange={handleViewChange}
              onSelectIssue={handleSelectIssue}
              onClearSelectedIssue={handleCloseDetail}
              createDialogOpen={createDialogOpen}
              onCreateDialogOpenChange={setCreateDialogOpen}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAll}
              onClearSelection={handleClearSelection}
              listSorting={listSorting}
              onListSortingChange={setListSorting}
              listColumnFilters={listColumnFilters}
              onListColumnFiltersChange={setListColumnFilters}
              listGlobalFilter={listGlobalFilter}
              onListGlobalFilterChange={setListGlobalFilter}
              listExpanded={listExpanded}
              onListExpandedChange={setListExpanded}
              listActivePreset={listActivePreset}
              onListActivePresetChange={setListActivePreset}
              listSourceFilter={listSourceFilter}
              onListSourceFilterChange={setListSourceFilter}
              showDeleted={showDeleted}
              onShowDeletedChange={setShowDeleted}
              historySearchFilter={historySearchFilter}
              onHistorySearchFilterChange={setHistorySearchFilter}
              historyTypeFilter={historyTypeFilter}
              onHistoryTypeFilterChange={setHistoryTypeFilter}
              historyIssueFilter={historyIssueFilter}
              onHistoryIssueFilterChange={setHistoryIssueFilter}
              commentsSearchFilter={commentsSearchFilter}
              onCommentsSearchFilterChange={setCommentsSearchFilter}
              commentInputRef={commentInputRef}
            />
          </Suspense>
        </IssuesQueryBoundary>
      </main>

      {issueId && (
        <IssuesQueryBoundary>
          <Suspense
            fallback={
              <IssueDetailSkeleton issueId={issueId} onClose={handleCloseDetail} />
            }
          >
            <SuspendedIssueDetail
              issueId={issueId}
              onClose={handleCloseDetail}
              onSelectIssue={handleSelectIssue}
              commentInputRef={commentInputRef}
            />
          </Suspense>
        </IssuesQueryBoundary>
      )}

      {sourceManagerOpen && (
        <SourceManager
          sources={sources}
          onSourcesChange={(newSources) => {
            setSources(newSources);
            void invalidateIssues();
          }}
          onClose={() => setSourceManagerOpen(false)}
        />
      )}

      <Toaster
        position="bottom-right"
        richColors
        theme={resolvedTheme}
        toastOptions={{
          className: 'font-sans',
          style: {
            borderRadius: 'var(--radius-lg)',
            border: '1px solid hsl(var(--border))',
          },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/list" replace />} />
        <Route path="/:view/:issueId?" element={<AppContent />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
