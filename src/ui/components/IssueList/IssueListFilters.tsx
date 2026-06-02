import {X} from 'lucide-react';
import type {Table as ReactTable} from '@tanstack/react-table';
import {Input} from '../ui/input';
import {Select} from '../ui/select';
import {Button} from '../ui/button';
import {getRelativePath} from '../../lib/path';
import type {IssueWithChildren} from './types';

interface IssueListFiltersProps {
  table: ReactTable<IssueWithChildren>;
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  sourceFilter: string;
  onSourceFilterChange: (value: string) => void;
  uniqueSources: string[];
  sourcePathPrefix: string;
  hasActiveFilters: boolean;
  onClearAllFilters: () => void;
}

export function IssueListFilters({
  table,
  globalFilter,
  onGlobalFilterChange,
  sourceFilter,
  onSourceFilterChange,
  uniqueSources,
  sourcePathPrefix,
  hasActiveFilters,
  onClearAllFilters,
}: IssueListFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4">
      <Input
        placeholder="Search titles, descriptions, comments..."
        value={globalFilter ?? ''}
        onChange={(e) => onGlobalFilterChange(e.target.value)}
        className="max-w-sm"
      />
      <Select
        value={(table.getColumn('status')?.getFilterValue() as string) ?? ''}
        onChange={(e) => table.getColumn('status')?.setFilterValue(e.target.value)}
      >
        <option value="">All Statuses</option>
        <option value="open">Open</option>
        <option value="in_progress">In Progress</option>
        <option value="blocked">Blocked</option>
        <option value="closed">Closed</option>
      </Select>
      <Select
        value={(table.getColumn('type')?.getFilterValue() as string) ?? ''}
        onChange={(e) => table.getColumn('type')?.setFilterValue(e.target.value)}
      >
        <option value="">All Types</option>
        <option value="task">Task</option>
        <option value="bug">Bug</option>
        <option value="epic">Epic</option>
      </Select>
      <Select
        value={(table.getColumn('priority')?.getFilterValue() as string) ?? ''}
        onChange={(e) => table.getColumn('priority')?.setFilterValue(e.target.value)}
      >
        <option value="">All Priorities</option>
        <option value="0">Critical</option>
        <option value="1">High</option>
        <option value="2">Medium</option>
        <option value="3">Low</option>
        <option value="4">Backlog</option>
      </Select>
      {uniqueSources.length > 1 && (
        <Select value={sourceFilter} onChange={(e) => onSourceFilterChange(e.target.value)}>
          <option value="">All Sources</option>
          {uniqueSources.map((source) => (
            <option key={source} value={source}>
              {getRelativePath(source, sourcePathPrefix)}
            </option>
          ))}
        </Select>
      )}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAllFilters}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
