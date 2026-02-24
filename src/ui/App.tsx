import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { useIssues } from './hooks/useIssues';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { IssueList, type FilterPreset } from './components/IssueList';
import { IssueDetail } from './components/IssueDetail';
import type { SortingState, ColumnFiltersState, ExpandedState } from '@tanstack/react-table';
import { HistoryView } from './components/HistoryView';
import { CommentsView } from './components/CommentsView';
import { Dashboard } from './components/Dashboard';
import { Breadcrumbs } from './components/Breadcrumbs';
import { CreateIssueForm } from './components/CreateIssueForm';
import { BulkActionBar } from './components/BulkActionBar';
import { ThemeToggle } from './components/ThemeToggle';
import { SourceManager } from './components/SourceManager';
import { Button } from './components/ui/button';
import type { Issue } from '../shared/types';
import { fetchSources, type SourcesResponse } from './lib/api';
import { List, History, LayoutDashboard, RefreshCw, Loader2, Plus, FolderSync, MessageSquare } from 'lucide-react';

type View = 'list' | 'dashboard' | 'history' | 'comments';

// Page transition variants
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

const pageTransition = {
  duration: 0.25,
  ease: [0.4, 0, 0.2, 1] as const,
};

function AppContent() {
  const { resolvedTheme } = useTheme();
  const { issues, events, loading, error, refresh } = useIssues();
  const [view, setView] = useState<View>('list');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Source management state
  const [sources, setSources] = useState<SourcesResponse | null>(null);
  const [sourceManagerOpen, setSourceManagerOpen] = useState(false);

  // Fetch sources on mount
  useEffect(() => {
    fetchSources()
      .then(setSources)
      .catch(() => setSources(null));
  }, []);

  // Lifted IssueList filter state (persists across tab switches)
  const [listSorting, setListSorting] = useState<SortingState>([
    { id: 'status', desc: false },     // in_progress → open → blocked → closed
    { id: 'updatedAt', desc: true }    // Then newest first
  ]);
  const [listColumnFilters, setListColumnFilters] = useState<ColumnFiltersState>([]);
  const [listGlobalFilter, setListGlobalFilter] = useState('');
  const [listExpanded, setListExpanded] = useState<ExpandedState>({}); // Start collapsed
  const [listActivePreset, setListActivePreset] = useState<FilterPreset>(null);
  const [listSourceFilter, setListSourceFilter] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  // Lifted HistoryView filter state (persists across tab switches)
  const [historySearchFilter, setHistorySearchFilter] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('');
  const [historyIssueFilter, setHistoryIssueFilter] = useState('');

  // Lifted CommentsView filter state (persists across tab switches)
  const [commentsSearchFilter, setCommentsSearchFilter] = useState('');

  // Get all potential parents for the create form parent selector
  const parentCandidates = issues;

  // Close detail panel when view changes
  const handleViewChange = (newView: View) => {
    setSelectedIssue(null);
    setView(newView);
  };

  const handleSelectIssue = (issue: Issue) => {
    setSelectedIssue(issue);
  };

  const handleCloseDetail = () => {
    setSelectedIssue(null);
  };

  // Bulk selection handlers
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

  // Ref for focusing comment input via keyboard shortcut
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Keyboard navigation index (for j/k shortcuts in list view)
  const [keyboardIndex, setKeyboardIndex] = useState(-1);

  // Get flat list of visible issues for keyboard navigation
  const visibleIssues = useMemo(() => {
    // In list view, return all issues (hierarchical navigation is complex, use flat for simplicity)
    return issues;
  }, [issues]);

  // Keyboard shortcut handlers
  const handleNewIssueShortcut = useCallback(() => {
    setCreateDialogOpen(true);
  }, []);

  const handleNavigateNext = useCallback(() => {
    if (view !== 'list' || visibleIssues.length === 0) return;
    setKeyboardIndex((prev) => {
      const next = Math.min(prev + 1, visibleIssues.length - 1);
      setSelectedIssue(visibleIssues[next]);
      return next;
    });
  }, [view, visibleIssues]);

  const handleNavigatePrev = useCallback(() => {
    if (view !== 'list' || visibleIssues.length === 0) return;
    setKeyboardIndex((prev) => {
      const next = Math.max(prev - 1, 0);
      setSelectedIssue(visibleIssues[next]);
      return next;
    });
  }, [view, visibleIssues]);

  const handleOpenDetailShortcut = useCallback(() => {
    if (keyboardIndex >= 0 && keyboardIndex < visibleIssues.length) {
      setSelectedIssue(visibleIssues[keyboardIndex]);
    }
  }, [keyboardIndex, visibleIssues]);

  const handleFocusComment = useCallback(() => {
    if (selectedIssue && commentInputRef.current) {
      commentInputRef.current.focus();
    }
  }, [selectedIssue]);

  // Register keyboard shortcuts
  useKeyboardShortcuts({
    onNewIssue: handleNewIssueShortcut,
    onNavigateNext: handleNavigateNext,
    onNavigatePrev: handleNavigatePrev,
    onOpenDetail: handleOpenDetailShortcut,
    onFocusComment: handleFocusComment,
  });

  // Update selected issue when issues are refreshed
  useEffect(() => {
    if (selectedIssue) {
      const updated = issues.find((i) => i.id === selectedIssue.id);
      if (updated) {
        setSelectedIssue(updated);
      } else {
        // Issue was deleted, close the panel
        setSelectedIssue(null);
      }
    }
  }, [issues, selectedIssue?.id]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 p-8 bg-surface rounded-2xl shadow-lg border border-border"
        >
          <h1 className="text-2xl font-display font-semibold text-destructive">Something went wrong</h1>
          <p className="text-foreground-muted">{error.message}</p>
          <Button onClick={refresh}>Try Again</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border-subtle sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <div className="container mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-display font-semibold italic text-primary">pebble</h1>
            <span className="text-sm text-foreground-muted bg-background-subtle px-3 py-1 rounded-full">
              {issues.length} issues
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setCreateDialogOpen(true)}
              title="New Issue (n)"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Issue
            </Button>

            {/* Tab navigation as pills */}
            <div className="flex bg-background-subtle rounded-xl p-1">
              {[
                { key: 'list' as const, icon: List, label: 'List' },
                { key: 'dashboard' as const, icon: LayoutDashboard, label: 'Dashboard' },
                { key: 'history' as const, icon: History, label: 'History' },
                { key: 'comments' as const, icon: MessageSquare, label: 'Comments' },
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => handleViewChange(key)}
                  className={`
                    flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-fast
                    ${view === key
                      ? 'bg-surface text-foreground shadow-sm'
                      : 'text-foreground-muted hover:text-foreground hover:bg-surface/50'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={refresh}
              disabled={loading}
              className="text-foreground-muted hover:text-foreground"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>

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

      {/* Breadcrumbs */}
      <Breadcrumbs
        view={view}
        selectedIssue={selectedIssue}
        allIssues={issues}
        onClearSelection={handleCloseDetail}
        onSelectIssue={handleSelectIssue}
        onNavigateToView={handleViewChange}
      />

      {/* Main content with view transitions */}
      <main
        className={`px-6 py-8 transition-all duration-normal ${
          selectedIssue ? 'mr-[520px]' : ''
        }`}
      >
        {loading && issues.length === 0 ? (
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
        ) : (
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
                  onClearSelection={handleClearSelection}
                  onRefresh={refresh}
                />
                <IssueList
                  issues={issues}
                  events={events}
                  onSelectIssue={handleSelectIssue}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onSelectAll={handleSelectAll}
                  onClearSelection={handleClearSelection}
                  sorting={listSorting}
                  onSortingChange={setListSorting}
                  columnFilters={listColumnFilters}
                  onColumnFiltersChange={setListColumnFilters}
                  globalFilter={listGlobalFilter}
                  onGlobalFilterChange={setListGlobalFilter}
                  expanded={listExpanded}
                  onExpandedChange={setListExpanded}
                  activePreset={listActivePreset}
                  onActivePresetChange={setListActivePreset}
                  sourceFilter={listSourceFilter}
                  onSourceFilterChange={setListSourceFilter}
                  showDeleted={showDeleted}
                  onShowDeletedChange={setShowDeleted}
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
                <Dashboard
                  issues={issues}
                  events={events}
                  onSelectIssue={handleSelectIssue}
                />
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
                  onSelectIssue={handleSelectIssue}
                  searchFilter={historySearchFilter}
                  onSearchFilterChange={setHistorySearchFilter}
                  typeFilter={historyTypeFilter}
                  onTypeFilterChange={setHistoryTypeFilter}
                  issueFilter={historyIssueFilter}
                  onIssueFilterChange={setHistoryIssueFilter}
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
                  onSelectIssue={handleSelectIssue}
                  searchFilter={commentsSearchFilter}
                  onSearchFilterChange={setCommentsSearchFilter}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* Issue detail panel */}
      <AnimatePresence>
        {selectedIssue && (
          <IssueDetail
            issue={selectedIssue}
            allIssues={issues}
            events={events}
            onClose={handleCloseDetail}
            onSelectIssue={handleSelectIssue}
            onRefresh={refresh}
            commentInputRef={commentInputRef}
          />
        )}
      </AnimatePresence>

      {/* Create issue dialog */}
      <CreateIssueForm
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={refresh}
        epics={parentCandidates}
      />

      {/* Source manager modal */}
      {sourceManagerOpen && (
        <SourceManager
          sources={sources}
          onSourcesChange={(newSources) => {
            setSources(newSources);
            refresh(); // Refresh issues when sources change
          }}
          onClose={() => setSourceManagerOpen(false)}
        />
      )}

      {/* Toast notifications */}
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
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
