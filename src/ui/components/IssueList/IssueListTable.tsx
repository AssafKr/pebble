import {flexRender, type ColumnDef, type Table as ReactTable} from '@tanstack/react-table';
import type {Issue} from '../../../shared/types';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '../ui/table';
import {cn} from '../../lib/utils';
import {getIssueStatusBorderClass, getIssueTypeBackgroundClass} from '../../lib/issueRowStyles';
import type {IssueWithChildren} from './types';

interface IssueListTableProps {
  table: ReactTable<IssueWithChildren>;
  columns: ColumnDef<IssueWithChildren>[];
  issueMap: Map<string, Issue>;
  activeIssueId?: string | null;
  onSelectIssue: (issue: Issue) => void;
}

export function IssueListTable({table, columns, issueMap, activeIssueId, onSelectIssue}: IssueListTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              const isGroup = row.original._isGroup;
              const status = row.original.status;
              const statusBorder = getIssueStatusBorderClass(row.original, issueMap, {isGroup});
              const isClosedRow = status === 'closed';
              const isActiveIssue = activeIssueId === row.original.id;
              const cellTypeBg = getIssueTypeBackgroundClass(row.original, {isGroup});

              return (
                <TableRow
                  key={row.id}
                  data-issue-id={row.original.id}
                  className={cn(
                    isGroup ? '' : 'cursor-pointer',
                    statusBorder,
                    isClosedRow && 'opacity-75',
                    isGroup && 'bg-muted/50',
                    isActiveIssue && 'ring-2 ring-inset ring-primary/40 bg-primary/5'
                  )}
                  onClick={() => !isGroup && onSelectIssue(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cellTypeBg}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No issues found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
