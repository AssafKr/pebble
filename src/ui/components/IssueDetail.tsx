import {useEffect, useMemo, useState, type RefObject} from 'react';
import {toast} from 'sonner';
import {cn} from '../lib/utils';
import type {Issue, Status, Priority, IssueEvent} from '../../shared/types';
import {STATUS_BADGE_VARIANTS, PRIORITY_DISPLAY_LABELS, STATUSES, PRIORITIES, STATUS_LABELS} from '../../shared/types';
import {Badge} from './ui/badge';
import {Button} from './ui/button';
import {Input} from './ui/input';
import {Select} from './ui/select';
import {Textarea} from './ui/textarea';
import {Label} from './ui/label';
import {IssueSelector} from './ui/issue-selector';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter} from './ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from './ui/alert-dialog';
import {
  X,
  Clock,
  MessageSquare,
  GitBranch,
  Pencil,
  Check,
  XCircle,
  Loader2,
  Plus,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Activity,
  Folder,
  Link2,
  Trash2,
} from 'lucide-react';
import {EventTimeline} from './EventTimeline';
import {formatRelativeTime} from '../../shared/time';
import {sortByStatus, sortByDependencies} from '../lib/sort';
import {useIssueMutations} from '../hooks/useIssueMutations';

interface IssueDetailProps {
  issue: Issue;
  allIssues: Issue[];
  events: IssueEvent[];
  onClose: () => void;
  onSelectIssue: (issue: Issue) => void;
  commentInputRef?: RefObject<HTMLTextAreaElement>;
}

export function IssueDetail({issue, allIssues, events, onClose, onSelectIssue, commentInputRef}: IssueDetailProps) {
  const {
    updateIssue: updateIssueMutation,
    closeIssue: closeIssueMutation,
    reopenIssue: reopenIssueMutation,
    addComment: addCommentMutation,
    addDependency: addDependencyMutation,
    removeDependency: removeDependencyMutation,
    addRelated: addRelatedMutation,
    removeRelated: removeRelatedMutation,
    restoreIssue: restoreIssueMutation,
  } = useIssueMutations();
  // Create lookup map for O(1) issue access
  const issueMap = useMemo(() => new Map(allIssues.map((i) => [i.id, i])), [allIssues]);

  // Editing states
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(issue.title);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState(issue.description || '');
  const [newComment, setNewComment] = useState('');
  const [blockerDialogOpen, setBlockerDialogOpen] = useState(false);
  const [selectedBlocker, setSelectedBlocker] = useState('');
  const [relatedDialogOpen, setRelatedDialogOpen] = useState(false);
  const [selectedRelated, setSelectedRelated] = useState('');

  const savingUpdate = updateIssueMutation.isPending;
  const savingComment = addCommentMutation.isPending;
  const savingBlocker = addDependencyMutation.isPending;
  const savingRelated = addRelatedMutation.isPending;
  const closingIssue = closeIssueMutation.isPending || reopenIssueMutation.isPending;
  const restoringIssue = restoreIssueMutation.isPending;

  // Confirmation dialog states
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [removeBlockerConfirmOpen, setRemoveBlockerConfirmOpen] = useState(false);
  const [blockerToRemove, setBlockerToRemove] = useState<string | null>(null);
  const [removeRelatedConfirmOpen, setRemoveRelatedConfirmOpen] = useState(false);
  const [relatedToRemove, setRelatedToRemove] = useState<string | null>(null);

  // Activity section state (for epics)
  const [activityExpanded, setActivityExpanded] = useState(false);

  // Get child IDs for activity filtering
  const childIds = useMemo(() => {
    return allIssues.filter((i) => i.parent === issue.id).map((i) => i.id);
  }, [allIssues, issue.id]);

  // Reset values when issue changes
  useEffect(() => {
    setTitleValue(issue.title);
    setDescriptionValue(issue.description || '');
    setEditingTitle(false);
    setEditingDescription(false);
  }, [issue.id, issue.title, issue.description]);

  // BlockedBy: sorted by dependencies (blockers' blockers first)
  const blockedByIssues = useMemo(() => {
    const blockers = issue.blockedBy.map((id) => issueMap.get(id)).filter((i): i is Issue => i !== undefined);
    return sortByDependencies(blockers);
  }, [issue.blockedBy, issueMap]);

  // Check if there are any open blockers (prevents setting status to in_progress)
  const hasOpenBlockers = useMemo(() => {
    return blockedByIssues.some((b) => b.status !== 'closed');
  }, [blockedByIssues]);

  // Check if any ancestor is blocked (also prevents setting status to in_progress)
  const blockedAncestor = useMemo((): {ancestor: Issue; blockers: Issue[]} | null => {
    let current = issue;
    while (current.parent) {
      const parent = issueMap.get(current.parent);
      if (!parent) break;

      const openBlockers = parent.blockedBy
        .map((id) => issueMap.get(id))
        .filter((i): i is Issue => i !== undefined && i.status !== 'closed' && !i.deleted);

      if (openBlockers.length > 0) {
        return {ancestor: parent, blockers: openBlockers};
      }
      current = parent;
    }
    return null;
  }, [issue, issueMap]);

  // Combined check for claim eligibility
  const cannotClaim = hasOpenBlockers || blockedAncestor !== null;

  // Blocking: sorted by dependencies
  const blockingIssues = useMemo(() => {
    const blocked = allIssues.filter((i) => i.blockedBy.includes(issue.id));
    return sortByDependencies(blocked);
  }, [allIssues, issue.id]);

  // Children: sorted by status (open/in_progress first, closed at bottom)
  const childIssues = useMemo(() => {
    const children = allIssues.filter((i) => i.parent === issue.id);
    return sortByStatus(children);
  }, [allIssues, issue.id]);

  // Available issues for blocker selection (not self, not already blocking)
  const availableBlockers = useMemo(() => {
    return allIssues.filter((i) => i.id !== issue.id && !issue.blockedBy.includes(i.id) && i.status !== 'closed');
  }, [allIssues, issue.id, issue.blockedBy]);

  // Related issues (bidirectional, non-blocking)
  const relatedIssues = useMemo(() => {
    return (issue.relatedTo || []).map((id) => issueMap.get(id)).filter((i): i is Issue => i !== undefined);
  }, [issue.relatedTo, issueMap]);

  // Available issues for related selection (not self, not already related)
  const availableRelated = useMemo(() => {
    const relatedSet = new Set(issue.relatedTo || []);
    return allIssues.filter((i) => i.id !== issue.id && !relatedSet.has(i.id));
  }, [allIssues, issue.id, issue.relatedTo]);

  const parentIssue = issue.parent ? issueMap.get(issue.parent) : undefined;

  // Close panel on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !editingTitle && !editingDescription && !blockerDialogOpen && !relatedDialogOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, editingTitle, editingDescription, blockerDialogOpen, relatedDialogOpen]);

  // Handlers
  const handleSaveTitle = async () => {
    if (!titleValue.trim() || titleValue === issue.title) {
      setEditingTitle(false);
      setTitleValue(issue.title);
      return;
    }
    try {
      await updateIssueMutation.mutateAsync({id: issue.id, data: {title: titleValue.trim()}});
      setEditingTitle(false);
      toast.success('Title updated');
    } catch (err) {
      toast.error('Failed to save title', {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleSaveDescription = async () => {
    if (descriptionValue === (issue.description || '')) {
      setEditingDescription(false);
      return;
    }
    try {
      await updateIssueMutation.mutateAsync({id: issue.id, data: {description: descriptionValue.trim() || undefined}});
      setEditingDescription(false);
      toast.success('Description updated');
    } catch (err) {
      toast.error('Failed to save description', {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleStatusChange = async (newStatus: Status) => {
    if (newStatus === issue.status) return;
    try {
      const result = await updateIssueMutation.mutateAsync({id: issue.id, data: {status: newStatus}});
      const cascaded = (result as {_cascadeClaimed?: string[]})._cascadeClaimed;
      if (cascaded && cascaded.length > 0) {
        toast.success('Status updated', {
          description: `Also started: ${cascaded.join(', ')}`,
        });
      } else {
        toast.success('Status updated');
      }
    } catch (err) {
      toast.error('Failed to update status', {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handlePriorityChange = async (newPriority: Priority) => {
    if (newPriority === issue.priority) return;
    try {
      await updateIssueMutation.mutateAsync({id: issue.id, data: {priority: newPriority}});
      toast.success('Priority updated');
    } catch (err) {
      toast.error('Failed to update priority', {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await addCommentMutation.mutateAsync({id: issue.id, text: newComment.trim()});
      setNewComment('');
      toast.success('Comment added');
    } catch (err) {
      toast.error('Failed to add comment', {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleCloseIssue = async () => {
    setCloseConfirmOpen(false);
    try {
      await closeIssueMutation.mutateAsync({id: issue.id});
      toast('Issue closed', {
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await reopenIssueMutation.mutateAsync({id: issue.id});
              toast.success('Issue reopened');
            } catch {
              toast.error('Failed to undo');
            }
          },
        },
      });
    } catch (err) {
      toast.error('Failed to close issue', {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleReopenIssue = async () => {
    try {
      await reopenIssueMutation.mutateAsync({id: issue.id});
      toast.success('Issue reopened');
    } catch (err) {
      toast.error('Failed to reopen issue', {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleRestoreIssue = async () => {
    try {
      await restoreIssueMutation.mutateAsync({id: issue.id});
      toast.success('Issue restored');
    } catch (err) {
      toast.error('Failed to restore issue', {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleAddBlocker = async () => {
    if (!selectedBlocker) return;
    try {
      await addDependencyMutation.mutateAsync({id: issue.id, blockerId: selectedBlocker});
      setBlockerDialogOpen(false);
      setSelectedBlocker('');
      toast.success('Blocker added');
    } catch (err) {
      toast.error('Failed to add blocker', {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleRemoveBlocker = async (blockerId: string) => {
    setRemoveBlockerConfirmOpen(false);
    setBlockerToRemove(null);
    try {
      await removeDependencyMutation.mutateAsync({id: issue.id, blockerId});
      toast('Blocker removed', {
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await addDependencyMutation.mutateAsync({id: issue.id, blockerId});
              toast.success('Blocker restored');
            } catch {
              toast.error('Failed to undo');
            }
          },
        },
      });
    } catch (err) {
      toast.error('Failed to remove blocker', {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleAddRelated = async () => {
    if (!selectedRelated) return;
    const relatedIssue = issueMap.get(selectedRelated);
    if (!relatedIssue) return;

    try {
      await addRelatedMutation.mutateAsync({
        issueId: issue.id,
        relatedId: selectedRelated,
        currentRelatedTo: issue.relatedTo || [],
        relatedIssueRelatedTo: relatedIssue.relatedTo || [],
      });
      setRelatedDialogOpen(false);
      setSelectedRelated('');
      toast.success('Related issue added');
    } catch (err) {
      toast.error('Failed to add related issue', {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleRemoveRelated = async (relatedId: string) => {
    setRemoveRelatedConfirmOpen(false);
    setRelatedToRemove(null);
    const relatedIssue = issueMap.get(relatedId);
    if (!relatedIssue) return;

    const currentRelatedTo = [...(issue.relatedTo || [])];
    const relatedIssueRelatedTo = [...(relatedIssue.relatedTo || [])];
    const newOurRelatedTo = currentRelatedTo.filter((id) => id !== relatedId);
    const newTheirRelatedTo = relatedIssueRelatedTo.filter((id) => id !== issue.id);

    try {
      await removeRelatedMutation.mutateAsync({
        issueId: issue.id,
        relatedId,
        currentRelatedTo,
        relatedIssueRelatedTo,
      });
      toast('Related issue removed', {
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await addRelatedMutation.mutateAsync({
                issueId: issue.id,
                relatedId,
                currentRelatedTo: newOurRelatedTo,
                relatedIssueRelatedTo: newTheirRelatedTo,
              });
              toast.success('Related issue restored');
            } catch {
              toast.error('Failed to undo');
            }
          },
        },
      });
    } catch (err) {
      toast.error('Failed to remove related issue', {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <div className="fixed top-[65px] bottom-0 right-0 w-[500px] bg-background border-l shadow-lg overflow-y-auto">
      <div className="sticky top-0 bg-background border-b p-4 z-10">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="font-mono text-sm text-muted-foreground">{issue.id}</span>
            {issue.lastSource && (
              <div
                className="text-xs text-muted-foreground flex items-center gap-1 mt-1"
                title={`Last modified from: ${issue.lastSource}`}
              >
                <Folder className="h-3 w-3" />
                <span className="truncate max-w-[300px]">{issue.lastSource}</span>
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Editable title */}
        <div className="flex items-center gap-2">
          {editingTitle ? (
            <div className="flex-1 flex items-center gap-2">
              <Input
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                className="flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') {
                    setEditingTitle(false);
                    setTitleValue(issue.title);
                  }
                }}
              />
              <Button size="icon" variant="ghost" onClick={handleSaveTitle} disabled={savingUpdate}>
                {savingUpdate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setEditingTitle(false);
                  setTitleValue(issue.title);
                }}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <h2
                className={cn(
                  'text-lg font-semibold flex-1 rounded px-1 -mx-1',
                  !issue.deleted && 'cursor-pointer hover:bg-muted'
                )}
                onClick={!issue.deleted ? () => setEditingTitle(true) : undefined}
                title={!issue.deleted ? 'Click to edit' : undefined}
              >
                {issue.title}
              </h2>
              {!issue.deleted && (
                <Button variant="ghost" size="icon" onClick={() => setEditingTitle(true)} title="Edit title">
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>

        {/* Deleted banner */}
        {issue.deleted && (
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-md text-sm text-muted-foreground">
            <Trash2 className="h-4 w-4" />
            <span>This issue has been deleted</span>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={handleRestoreIssue}
              disabled={restoringIssue}
            >
              {restoringIssue ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-1" />
              )}
              Restore
            </Button>
          </div>
        )}
      </div>

      <div className="p-4 space-y-6">
        {/* Status and Priority dropdowns */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={issue.status}
              onChange={(e) => handleStatusChange(e.target.value as Status)}
              disabled={savingUpdate || issue.status === 'closed' || issue.deleted}
            >
              {STATUSES.filter((s) => s !== 'closed').map((s) => {
                const blockedTitle =
                  s === 'in_progress' && cannotClaim
                    ? blockedAncestor
                      ? `Cannot start - parent ${blockedAncestor.ancestor.id} is blocked by ${blockedAncestor.blockers
                          .map((b) => b.id)
                          .join(', ')}`
                      : 'Cannot start - has open blockers'
                    : undefined;
                return (
                  <option key={s} value={s} disabled={s === 'in_progress' && cannotClaim} title={blockedTitle}>
                    {STATUS_LABELS[s]}
                    {s === 'in_progress' && cannotClaim ? ' (blocked)' : ''}
                  </option>
                );
              })}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={issue.priority}
              onChange={(e) => handlePriorityChange(Number(e.target.value) as Priority)}
              disabled={savingUpdate || issue.deleted}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_DISPLAY_LABELS[p]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Type badge (read-only) */}
        <div className="flex items-center gap-2">
          <Badge
            className={
              issue.type === 'epic'
                ? 'bg-indigo-500 text-white'
                : issue.type === 'bug'
                ? 'bg-rose-500 text-white'
                : 'bg-slate-500 text-white'
            }
          >
            {issue.type}
          </Badge>
          <Badge
            className={
              issue.status === 'open'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                : issue.status === 'in_progress'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                : issue.status === 'blocked'
                ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200' // closed
            }
          >
            {issue.status.replace('_', ' ')}
          </Badge>
        </div>

        {/* Close/Reopen buttons (hidden for deleted issues) */}
        {!issue.deleted && (
          <div className="flex gap-2">
            {issue.status === 'closed' ? (
              <Button variant="outline" onClick={handleReopenIssue} disabled={closingIssue}>
                {closingIssue ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Reopen Issue
              </Button>
            ) : (
              <Button variant="destructive" onClick={() => setCloseConfirmOpen(true)} disabled={closingIssue}>
                {closingIssue ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Close Issue
              </Button>
            )}
          </div>
        )}

        {/* Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Description</h3>
            {!editingDescription && !issue.deleted && (
              <Button variant="ghost" size="sm" onClick={() => setEditingDescription(true)}>
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
          </div>
          {editingDescription ? (
            <div className="space-y-2">
              <Textarea
                value={descriptionValue}
                onChange={(e) => setDescriptionValue(e.target.value)}
                rows={4}
                placeholder="Enter description..."
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveDescription} disabled={savingUpdate}>
                  {savingUpdate ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingDescription(false);
                    setDescriptionValue(issue.description || '');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap min-h-[40px]">
              {issue.description || 'No description.'}
            </p>
          )}
        </div>

        {/* Parent Chain */}
        {parentIssue && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Parent Chain</h3>
            {(() => {
              // Build full parent chain
              const chain: Issue[] = [];
              let current: Issue | undefined = issue;
              while (current?.parent) {
                const parent = issueMap.get(current.parent);
                if (!parent || chain.includes(parent)) break;
                chain.push(parent);
                current = parent;
              }
              const reversed = chain.reverse(); // root → ... → immediate parent
              return (
                <div className="flex flex-wrap items-center gap-1 text-sm">
                  {reversed.map((parent, idx) => (
                    <span key={parent.id} className="flex items-center">
                      {idx > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <button
                        className="text-primary hover:underline flex items-center gap-1"
                        onClick={() => onSelectIssue(parent)}
                      >
                        <span className="font-mono">{parent.id}</span>
                        <span className="text-muted-foreground">— {parent.title}</span>
                      </button>
                    </span>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Children */}
        {childIssues.length > 0 && (
          <div className="space-y-2">
            {(() => {
              const closedCount = childIssues.filter((c) => c.status === 'closed').length;
              const total = childIssues.length;
              const percent = Math.round((closedCount / total) * 100);

              return (
                <>
                  <h3 className="text-sm font-medium flex items-center gap-1">
                    <GitBranch className="h-4 w-4" />
                    Child Issues ({closedCount}/{total} done)
                  </h3>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        percent === 100 ? 'bg-green-500' : 'bg-purple-500'
                      }`}
                      style={{width: `${percent}%`}}
                    />
                  </div>
                </>
              );
            })()}
            <div className="space-y-1">
              {childIssues.map((child) => (
                <button
                  key={child.id}
                  className="block w-full text-left text-sm hover:bg-muted rounded p-2"
                  onClick={() => onSelectIssue(child)}
                >
                  <span className="font-mono text-xs">{child.id}</span>
                  <span className="mx-2">—</span>
                  <span>{child.title}</span>
                  <Badge variant={STATUS_BADGE_VARIANTS[child.status]} className="ml-2 text-xs">
                    {child.status.replace('_', ' ')}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Activity section - for all issues */}
        <div className="space-y-2">
          <button
            className="flex items-center gap-2 text-sm font-medium w-full"
            onClick={() => setActivityExpanded(!activityExpanded)}
          >
            {activityExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <Activity className="h-4 w-4" />
            {issue.type === 'epic' && childIds.length > 0 ? 'Children Activity' : 'Activity'}
          </button>
          {activityExpanded && (
            <div className="pl-6">
              <EventTimeline
                events={events}
                issues={allIssues}
                onSelectIssue={onSelectIssue}
                issueIds={issue.type === 'epic' && childIds.length > 0 ? childIds : [issue.id]}
                showFilters={false}
                maxEvents={10}
              />
            </div>
          )}
        </div>

        {/* Dependencies */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-destructive">Blocked By ({blockedByIssues.length})</h3>
            {availableBlockers.length > 0 && issue.status !== 'closed' && !issue.deleted && (
              <Button variant="outline" size="sm" onClick={() => setBlockerDialogOpen(true)}>
                <Plus className="h-3 w-3 mr-1" />
                Add Blocker
              </Button>
            )}
          </div>
          {blockedByIssues.length > 0 ? (
            <div className="space-y-1">
              {blockedByIssues.map((blocker) => (
                <div key={blocker.id} className="flex items-center justify-between hover:bg-muted rounded p-2">
                  <button className="flex-1 text-left text-sm" onClick={() => onSelectIssue(blocker)}>
                    <span className="font-mono text-xs">{blocker.id}</span>
                    <span className="mx-2">—</span>
                    <span>{blocker.title}</span>
                    <Badge variant={STATUS_BADGE_VARIANTS[blocker.status]} className="ml-2 text-xs">
                      {blocker.status.replace('_', ' ')}
                    </Badge>
                  </button>
                  {issue.status !== 'closed' && !issue.deleted && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setBlockerToRemove(blocker.id);
                        setRemoveBlockerConfirmOpen(true);
                      }}
                      title="Remove blocker"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No blockers.</p>
          )}
        </div>

        {blockingIssues.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-primary">Blocking ({blockingIssues.length})</h3>
            <div className="space-y-1">
              {blockingIssues.map((blocked) => (
                <button
                  key={blocked.id}
                  className="block w-full text-left text-sm hover:bg-muted rounded p-2"
                  onClick={() => onSelectIssue(blocked)}
                >
                  <span className="font-mono text-xs">{blocked.id}</span>
                  <span className="mx-2">—</span>
                  <span>{blocked.title}</span>
                  <Badge variant={STATUS_BADGE_VARIANTS[blocked.status]} className="ml-2 text-xs">
                    {blocked.status.replace('_', ' ')}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Related Issues */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium flex items-center gap-1">
              <Link2 className="h-4 w-4" />
              Related ({relatedIssues.length})
            </h3>
            {issue.status !== 'closed' && !issue.deleted && (
              <Button variant="outline" size="sm" onClick={() => setRelatedDialogOpen(true)}>
                <Plus className="h-3 w-3 mr-1" />
                Add Related
              </Button>
            )}
          </div>
          {relatedIssues.length > 0 ? (
            <div className="space-y-1">
              {relatedIssues.map((related) => (
                <div key={related.id} className="flex items-center justify-between hover:bg-muted rounded p-2">
                  <button className="flex-1 text-left text-sm" onClick={() => onSelectIssue(related)}>
                    <span className="font-mono text-xs">{related.id}</span>
                    <span className="mx-2">—</span>
                    <span>{related.title}</span>
                    <Badge variant={STATUS_BADGE_VARIANTS[related.status]} className="ml-2 text-xs">
                      {related.status.replace('_', ' ')}
                    </Badge>
                  </button>
                  {issue.status !== 'closed' && !issue.deleted && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setRelatedToRemove(related.id);
                        setRemoveRelatedConfirmOpen(true);
                      }}
                      title="Remove related"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No related issues.</p>
          )}
        </div>

        {/* Comments */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            Comments ({issue.comments.length})
          </h3>
          {issue.comments.length > 0 && (
            <div className="space-y-3">
              {[...issue.comments]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((comment, index) => (
                  <div key={`${comment.timestamp}-${index}`} className="bg-muted rounded-lg p-3 text-sm space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span title={new Date(comment.timestamp).toLocaleString()}>
                        {formatRelativeTime(comment.timestamp)}
                      </span>
                      {comment.author && <span>by {comment.author}</span>}
                    </div>
                    <p className="whitespace-pre-wrap">{comment.text}</p>
                  </div>
                ))}
            </div>
          )}

          {/* Add comment form */}
          {!issue.deleted && (
            <div className="space-y-2 pt-2">
              <Textarea
                ref={commentInputRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={2}
              />
              <Button
                size="sm"
                onClick={handleAddComment}
                disabled={savingComment || !newComment.trim()}
                title="Add Comment (c)"
              >
                {savingComment ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                Add Comment
              </Button>
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div className="space-y-2 text-xs text-muted-foreground border-t pt-4">
          <div className="flex items-center gap-2">
            <span>Created:</span>
            <span title={new Date(issue.createdAt).toLocaleString()}>{formatRelativeTime(issue.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Updated:</span>
            <span title={new Date(issue.updatedAt).toLocaleString()}>{formatRelativeTime(issue.updatedAt)}</span>
          </div>
        </div>
      </div>

      {/* Add blocker dialog */}
      <Dialog open={blockerDialogOpen} onOpenChange={setBlockerDialogOpen}>
        <DialogContent onClose={() => setBlockerDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Add Blocker</DialogTitle>
          </DialogHeader>
          <div className="py-4 px-6">
            <Label>Select issue that blocks this one</Label>
            <div className="mt-2">
              <IssueSelector
                issues={allIssues}
                value={selectedBlocker}
                onChange={setSelectedBlocker}
                excludeIds={[issue.id, ...issue.blockedBy]}
                placeholder="Search for an issue..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBlockerDialogOpen(false);
                setSelectedBlocker('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddBlocker} disabled={!selectedBlocker || savingBlocker}>
              {savingBlocker ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Add Blocker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close issue confirmation dialog */}
      <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Issue</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to close this issue? You can reopen it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCloseConfirmOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseIssue}>Close Issue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove blocker confirmation dialog */}
      <AlertDialog open={removeBlockerConfirmOpen} onOpenChange={setRemoveBlockerConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Blocker</AlertDialogTitle>
            <AlertDialogDescription>Remove {blockerToRemove} as a blocker for this issue?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setRemoveBlockerConfirmOpen(false);
                setBlockerToRemove(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => blockerToRemove && handleRemoveBlocker(blockerToRemove)}>
              Remove Blocker
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add related dialog */}
      <Dialog open={relatedDialogOpen} onOpenChange={setRelatedDialogOpen}>
        <DialogContent onClose={() => setRelatedDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Add Related Issue</DialogTitle>
          </DialogHeader>
          <div className="py-4 px-6">
            <Label>Select a related issue</Label>
            <div className="mt-2">
              <IssueSelector
                issues={availableRelated}
                value={selectedRelated}
                onChange={setSelectedRelated}
                excludeIds={[issue.id, ...(issue.relatedTo || [])]}
                placeholder="Search for an issue..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRelatedDialogOpen(false);
                setSelectedRelated('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddRelated} disabled={!selectedRelated || savingRelated}>
              {savingRelated ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Add Related
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove related confirmation dialog */}
      <AlertDialog open={removeRelatedConfirmOpen} onOpenChange={setRemoveRelatedConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Related Issue</AlertDialogTitle>
            <AlertDialogDescription>Remove {relatedToRemove} as a related issue?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setRemoveRelatedConfirmOpen(false);
                setRelatedToRemove(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => relatedToRemove && handleRemoveRelated(relatedToRemove)}>
              Remove Related
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
