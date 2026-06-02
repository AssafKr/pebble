import React, {useState, useMemo} from 'react';
import type {IssueEvent, Issue, Status} from '../../shared/types';
import {STATUS_BADGE_VARIANTS} from '../../shared/types';
import {Input} from './ui/input';
import {Badge} from './ui/badge';
import {MessageSquare, AlertTriangle, Folder} from 'lucide-react';
import {formatRelativeTime} from '../../shared/time';

interface CommentsViewProps {
  events: IssueEvent[];
  issues: Issue[];
  onSelectIssue: (issue: Issue) => void;
  // Lifted filter state
  searchFilter?: string;
  onSearchFilterChange?: React.Dispatch<React.SetStateAction<string>>;
}

// Get ancestry chain from issue up to root
function getAncestryChain(issueId: string, issueMap: Map<string, Issue>): Array<{id: string; title: string}> {
  const chain: Array<{id: string; title: string}> = [];
  let current = issueMap.get(issueId);

  while (current?.parent) {
    const parent = issueMap.get(current.parent);
    if (!parent || chain.some((a) => a.id === parent.id)) break; // Prevent cycles
    chain.push({id: parent.id, title: parent.title});
    current = parent;
  }

  return chain; // [immediate parent, grandparent, ..., root]
}

// Get open blockers for an issue
function getOpenBlockers(issue: Issue, issueMap: Map<string, Issue>): Issue[] {
  return issue.blockedBy
    .map((id) => issueMap.get(id))
    .filter((blocker): blocker is Issue => blocker !== undefined && blocker.status !== 'closed');
}

// Status badge colors
const statusColors: Record<Status, string> = {
  open: 'border-blue-500',
  in_progress: 'border-green-500',
  blocked: 'border-red-500',
  closed: 'border-gray-400',
};

export function CommentsView({
  events,
  issues,
  onSelectIssue,
  searchFilter: searchFilterProp,
  onSearchFilterChange,
}: CommentsViewProps) {
  // Internal state (used when props not provided)
  const [searchFilterInternal, setSearchFilterInternal] = useState('');

  // Use props if provided, otherwise use internal state
  const searchFilter = searchFilterProp ?? searchFilterInternal;
  const setSearchFilter = onSearchFilterChange ?? setSearchFilterInternal;

  const issueMap = useMemo(() => new Map(issues.map((i) => [i.id, i])), [issues]);

  // Filter to only comment events, sorted newest first
  const commentEvents = useMemo(() => {
    return events
      .filter((event) => event.type === 'comment')
      .filter((event) => {
        if (!searchFilter) return true;
        const issue = issueMap.get(event.issueId);
        const searchLower = searchFilter.toLowerCase();
        const textMatch = event.data.text?.toLowerCase().includes(searchLower);
        const titleMatch = issue?.title.toLowerCase().includes(searchLower);
        const idMatch = event.issueId.toLowerCase().includes(searchLower);
        return textMatch || titleMatch || idMatch;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [events, searchFilter, issueMap]);

  return (
    <div className="space-y-4">
      {/* Search filter */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search comments..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {commentEvents.length} comment{commentEvents.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Comments list */}
      {commentEvents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No comments found</p>
          {searchFilter && <p className="text-sm mt-2">Try adjusting your search filter</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {commentEvents.map((event) => {
            const issue = issueMap.get(event.issueId);
            if (!issue) return null;

            const ancestry = getAncestryChain(event.issueId, issueMap);
            const openBlockers = getOpenBlockers(issue, issueMap);

            return (
              <CommentCard
                key={`${event.issueId}-${event.timestamp}`}
                event={event}
                issue={issue}
                ancestry={ancestry}
                openBlockers={openBlockers}
                onSelectIssue={onSelectIssue}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

interface CommentCardProps {
  event: IssueEvent;
  issue: Issue;
  ancestry: Array<{id: string; title: string}>;
  openBlockers: Issue[];
  onSelectIssue: (issue: Issue) => void;
}

function CommentCard({event, issue, ancestry, openBlockers, onSelectIssue}: CommentCardProps) {
  const commentText = event.type === 'comment' ? event.data.text : '';

  return (
    <div
      className={`rounded-lg border p-4 bg-card hover:bg-muted/50 transition-colors ${
        statusColors[issue.status]
      } border-l-4`}
    >
      {/* Header: Issue ID + Title (clickable) */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <button className="text-left hover:underline" onClick={() => onSelectIssue(issue)}>
          <span className="font-mono text-sm text-muted-foreground">{issue.id}</span>
          <span className="mx-2 text-muted-foreground">·</span>
          <span className="font-medium">{issue.title}</span>
        </button>

        <Badge variant={STATUS_BADGE_VARIANTS[issue.status]}>{issue.status.replace('_', ' ')}</Badge>
      </div>

      {/* Parent epic / ancestry */}
      {ancestry.length > 0 && (
        <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
          <Folder className="h-3 w-3" />
          <span>
            {[...ancestry]
              .reverse()
              .map((a) => a.title)
              .join(' → ')}
          </span>
        </div>
      )}

      {/* Issue source */}
      {issue.lastSource && <div className="text-xs text-muted-foreground mb-2">Source: {issue.lastSource}</div>}

      {/* Blockers warning */}
      {openBlockers.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 mb-2">
          <AlertTriangle className="h-3 w-3" />
          <span>Blocked by {openBlockers.map((b) => b.id).join(', ')}</span>
        </div>
      )}

      {/* Comment text */}
      <div className="mt-3 text-sm whitespace-pre-wrap bg-muted/30 rounded p-3">{commentText}</div>

      {/* Footer: Timestamp and source */}
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span>{formatRelativeTime(event.timestamp)}</span>
        {event.source && (
          <span className="flex items-center gap-0.5" title={`From: ${event.source}`}>
            <Folder className="h-3 w-3" />
            {event.source}
          </span>
        )}
      </div>
    </div>
  );
}
