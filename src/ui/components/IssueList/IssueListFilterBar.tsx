import {Trash2} from 'lucide-react';
import {Button} from '../ui/button';
import {cn} from '../../lib/utils';
import type {FilterPreset} from './types';

interface IssueListFilterBarProps {
  activePreset: FilterPreset;
  showDeleted: boolean;
  onPresetClick: (preset: FilterPreset) => void;
  onClearPreset: () => void;
  onShowDeletedChange: (show: boolean) => void;
}

export function IssueListFilterBar({
  activePreset,
  showDeleted,
  onPresetClick,
  onClearPreset,
  onShowDeletedChange,
}: IssueListFilterBarProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant={activePreset === 'ready' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onPresetClick('ready')}
        className={cn(activePreset === 'ready' && 'bg-green-600 hover:bg-green-700')}
      >
        Ready
      </Button>
      <Button
        variant={activePreset === 'blocked' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onPresetClick('blocked')}
        className={cn(activePreset === 'blocked' && 'bg-red-600 hover:bg-red-700')}
      >
        Blocked
      </Button>
      <Button
        variant={activePreset === 'in_progress' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onPresetClick('in_progress')}
        className={cn(activePreset === 'in_progress' && 'bg-blue-600 hover:bg-blue-700')}
      >
        In Progress
      </Button>
      <Button
        variant={activePreset === 'all_open' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onPresetClick('all_open')}
        className={cn(activePreset === 'all_open' && 'bg-amber-600 hover:bg-amber-700')}
      >
        All Open
      </Button>
      {activePreset && (
        <Button variant="ghost" size="sm" onClick={onClearPreset}>
          Clear
        </Button>
      )}
      <label className="flex items-center gap-1.5 text-sm text-muted-foreground ml-auto cursor-pointer">
        <input
          type="checkbox"
          checked={showDeleted}
          onChange={(e) => onShowDeletedChange(e.target.checked)}
          className="rounded border-muted"
        />
        <Trash2 className="h-3.5 w-3.5" />
        Show deleted
      </label>
    </div>
  );
}
