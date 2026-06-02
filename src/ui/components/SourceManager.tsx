import {useEffect, useMemo, useState} from 'react';
import {toast} from 'sonner';
import {FolderSync, Plus, Trash2, X, GitBranch} from 'lucide-react';
import {Button} from './ui/button';
import {Input} from './ui/input';
import {useSourceMutations} from '../hooks/useSourceMutations';
import {useSources} from '../hooks/useSources';
import {useWorktrees} from '../hooks/useWorktrees';
import type {Worktree} from '../lib/api';

interface SourceManagerProps {
  onClose: () => void;
}

export function SourceManager({onClose}: SourceManagerProps) {
  const [newPath, setNewPath] = useState('');
  const {data: sources} = useSources();
  const {data: worktrees = [], isLoading: loadingWorktrees} = useWorktrees();
  const {addSource, removeSource} = useSourceMutations();

  const loading = addSource.isPending || removeSource.isPending;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const worktreesWithIssues = useMemo(() => {
    const withIssues = worktrees.filter((wt) => wt.hasIssues);
    if (!sources) return withIssues;
    return withIssues.map((wt) => ({
      ...wt,
      isActive: wt.issuesFile ? sources.files.includes(wt.issuesFile) : false,
    }));
  }, [worktrees, sources]);

  const handleAdd = async () => {
    if (!newPath.trim()) return;

    try {
      await addSource.mutateAsync(newPath.trim());
      setNewPath('');
      toast.success('Source added');
    } catch (error) {
      toast.error('Failed to add source', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleRemove = async (index: number) => {
    try {
      await removeSource.mutateAsync(index);
      toast.success('Source removed');
    } catch (error) {
      toast.error('Failed to remove source', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleWorktreeToggle = async (worktree: Worktree) => {
    if (!worktree.issuesFile) return;

    try {
      if (worktree.isActive) {
        const index = sources?.files.indexOf(worktree.issuesFile);
        if (index !== undefined && index >= 0) {
          await removeSource.mutateAsync(index);
          toast.success('Worktree removed');
        }
      } else {
        await addSource.mutateAsync(worktree.issuesFile);
        toast.success('Worktree added');
      }
    } catch (error) {
      toast.error('Failed to update worktree', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      void handleAdd();
    }
  };

  const abbreviatePath = (fullPath: string) => {
    const parts = fullPath.split('/');
    if (parts.length <= 3) return fullPath;
    return '.../' + parts.slice(-3).join('/');
  };

  const getWorktreeName = (worktree: Worktree) => {
    const parts = worktree.path.split('/');
    return parts[parts.length - 1] || worktree.path;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border rounded-lg shadow-lg w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <FolderSync className="h-5 w-5" />
            <h2 className="font-semibold">Manage Issue Sources</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {!loadingWorktrees && worktreesWithIssues.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-1">
                <GitBranch className="h-4 w-4" />
                Detected Worktrees
              </p>
              <div className="border rounded-md divide-y">
                {worktreesWithIssues.map((worktree, index) => (
                  <label
                    key={index}
                    className={`flex items-center gap-3 p-2 hover:bg-muted/50 cursor-pointer ${
                      loading ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={worktree.isActive}
                      onChange={() => void handleWorktreeToggle(worktree)}
                      disabled={loading || (worktree.isActive && sources?.files.length === 1)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{getWorktreeName(worktree)}</span>
                        {worktree.branch && (
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {worktree.branch}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          ({worktree.issueCount} issue{worktree.issueCount !== 1 ? 's' : ''})
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground truncate block" title={worktree.path}>
                        {worktree.path}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Add Custom Path</p>
            <div className="flex gap-2">
              <Input
                placeholder="Path to issues.jsonl file..."
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                className="flex-1"
              />
              <Button onClick={() => void handleAdd()} disabled={loading || !newPath.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {sources?.files.length || 0} source{sources?.files.length !== 1 ? 's' : ''} active
            </p>
            <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
              {sources?.files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 hover:bg-muted/50">
                  <span className="text-sm font-mono truncate flex-1" title={file}>
                    {abbreviatePath(file)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleRemove(index)}
                    disabled={loading || sources.files.length === 1}
                    title={sources.files.length === 1 ? 'Cannot remove the last source' : 'Remove source'}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              ))}
              {!sources?.files.length && (
                <div className="p-4 text-center text-muted-foreground text-sm">No sources configured</div>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Add multiple issue files to merge them into a unified view. Issues with the same ID are merged, keeping the
            most recently updated version.
          </p>
        </div>
      </div>
    </div>
  );
}
