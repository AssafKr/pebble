import {Suspense, useCallback, useEffect, useRef, useState} from 'react';
import {Toaster} from 'sonner';
import {useNavigate} from 'react-router-dom';
import {AppHeader} from './components/AppHeader';
import {AppMain} from './components/AppMain';
import {IssueDetailSkeleton} from './components/IssueDetailSkeleton';
import {IssuesQueryBoundary} from './components/IssuesQueryBoundary';
import {IssuesStreamSubscriber} from './components/IssuesStreamSubscriber';
import {LegacySearchRedirect} from './components/LegacySearchRedirect';
import {MainContentSkeleton} from './components/MainContentSkeleton';
import {SourceManager} from './components/SourceManager';
import {SuspendedIssueDetail} from './components/SuspendedIssueDetail';
import {useTheme} from './contexts/ThemeContext';
import {useAppNavigation} from './hooks/useAppNavigation';
import {useIssueSelection} from './hooks/useIssueSelection';
import {useViewFilters} from './hooks/useViewFilters';
import type {Issue} from '../shared/types';
import {viewPath} from './lib/routes';
import type {AppView} from './lib/routes';

export function AppContent() {
  const {resolvedTheme} = useTheme();
  const {view, issueId, isValidView, goToView, selectIssue, closeIssue} = useAppNavigation();
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const {selectedIds, toggleSelect, selectAll, clearSelection} = useIssueSelection();
  const filters = useViewFilters();
  const [sourceManagerOpen, setSourceManagerOpen] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isValidView) {
      navigate(viewPath('list'), {replace: true});
    }
  }, [isValidView, navigate]);

  const handleViewChange = useCallback(
    (newView: AppView) => {
      goToView(newView);
    },
    [goToView]
  );

  const handleSelectIssue = useCallback(
    (issue: Issue) => {
      selectIssue(issue);
    },
    [selectIssue]
  );

  const handleCloseDetail = useCallback(() => {
    closeIssue();
  }, [closeIssue]);

  return (
    <div className="min-h-screen bg-background">
      <LegacySearchRedirect />
      <IssuesStreamSubscriber />
      <AppHeader
        onCreateIssue={() => setCreateDialogOpen(true)}
        onOpenSourceManager={() => setSourceManagerOpen(true)}
      />

      <main className={`px-6 py-8 transition-all duration-normal ${issueId ? 'mr-[520px]' : ''}`}>
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
              onToggleSelect={toggleSelect}
              onSelectAll={selectAll}
              onClearSelection={clearSelection}
              filters={filters}
              commentInputRef={commentInputRef}
            />
          </Suspense>
        </IssuesQueryBoundary>
      </main>

      {issueId && (
        <IssuesQueryBoundary>
          <Suspense fallback={<IssueDetailSkeleton issueId={issueId} onClose={handleCloseDetail} />}>
            <SuspendedIssueDetail
              issueId={issueId}
              onClose={handleCloseDetail}
              onSelectIssue={handleSelectIssue}
              commentInputRef={commentInputRef}
            />
          </Suspense>
        </IssuesQueryBoundary>
      )}

      {sourceManagerOpen && <SourceManager onClose={() => setSourceManagerOpen(false)} />}

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
