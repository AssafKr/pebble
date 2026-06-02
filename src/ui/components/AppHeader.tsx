import {Suspense} from 'react';
import {Columns3, FolderSync, History, LayoutDashboard, List, MessageSquare, Plus} from 'lucide-react';
import {NavLink} from 'react-router-dom';
import {useSources} from '../hooks/useSources';
import {viewPath} from '../lib/routes';
import {IssuesCountBadge} from './IssuesCountBadge';
import {RefreshIssuesButton} from './RefreshIssuesButton';
import {ThemeToggle} from './ThemeToggle';
import {Button} from './ui/button';

interface AppHeaderProps {
  onCreateIssue: () => void;
  onOpenSourceManager: () => void;
}

export function AppHeader({onCreateIssue, onOpenSourceManager}: AppHeaderProps) {
  const {data: sources} = useSources();
  return (
    <header className="border-b border-border-subtle sticky top-0 bg-background/95 backdrop-blur-sm z-10">
      <div className="container mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-display font-semibold italic text-primary">pebble</h1>
          <Suspense fallback={null}>
            <IssuesCountBadge />
          </Suspense>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={onCreateIssue} title="New Issue (n)">
            <Plus className="h-4 w-4 mr-2" />
            New Issue
          </Button>

          <div className="flex bg-background-subtle rounded-xl p-1">
            {[
              {key: 'list' as const, icon: List, label: 'List'},
              {key: 'kanban' as const, icon: Columns3, label: 'Kanban'},
              {key: 'dashboard' as const, icon: LayoutDashboard, label: 'Dashboard'},
              {key: 'history' as const, icon: History, label: 'History'},
              {key: 'comments' as const, icon: MessageSquare, label: 'Comments'},
            ].map(({key, icon: Icon, label}) => (
              <NavLink
                key={key}
                to={viewPath(key)}
                className={({isActive}) => `
                    flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-fast
                    ${
                      isActive
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
            onClick={onOpenSourceManager}
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
  );
}
