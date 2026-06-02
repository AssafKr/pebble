import type { Issue } from '../../shared/types';
import { ChevronRight, Home } from 'lucide-react';
import type { AppView } from '../lib/routes';

interface BreadcrumbsProps {
  view: AppView;
  selectedIssueId: string | null;
  selectedIssue?: Issue | null;
  allIssues?: Issue[];
  onClearSelection: () => void;
  onSelectIssue: (issue: Issue) => void;
  onNavigateToView: (view: AppView) => void;
}

export function Breadcrumbs({
  view,
  selectedIssueId,
  selectedIssue = null,
  allIssues = [],
  onClearSelection,
  onSelectIssue,
  onNavigateToView,
}: BreadcrumbsProps) {
  const issueMap = new Map(allIssues.map((issue) => [issue.id, issue]));

  // Build breadcrumb trail
  const crumbs: { label: string; onClick?: () => void }[] = [];

  // First crumb is always the view
  const viewLabels: Record<AppView, string> = {
    list: 'List',
    dashboard: 'Dashboard',
    history: 'History',
    comments: 'Comments',
  };

  crumbs.push({
    label: viewLabels[view],
    onClick: () => {
      onClearSelection();
      onNavigateToView(view);
    },
  });

  // For selected issue, show parent chain when loaded; otherwise show the id from the URL
  if (selectedIssue) {
    // Build parent chain
    const parentChain: Issue[] = [];
    let current = selectedIssue;
    while (current.parent) {
      const parent = issueMap.get(current.parent);
      if (parent) {
        parentChain.unshift(parent);
        current = parent;
      } else {
        break;
      }
    }

    // Add each parent as a crumb
    for (const parent of parentChain) {
      crumbs.push({
        label: truncate(parent.title, 20),
        onClick: () => onSelectIssue(parent),
      });
    }

    // Add the selected issue itself (no click handler - current location)
    crumbs.push({
      label: truncate(selectedIssue.title, 25),
    });
  } else if (selectedIssueId) {
    crumbs.push({
      label: selectedIssueId,
    });
  }

  // Don't show breadcrumbs if only one item
  if (crumbs.length <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center text-sm text-muted-foreground px-4 py-2 bg-muted/30 border-b">
      <Home className="h-4 w-4 mr-2" />
      {crumbs.map((crumb, index) => (
        <span key={index} className="flex items-center">
          {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
          {crumb.onClick ? (
            <button
              className="hover:text-foreground hover:underline"
              onClick={crumb.onClick}
            >
              {crumb.label}
            </button>
          ) : (
            <span className="text-foreground font-medium">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 1) + '…';
}
