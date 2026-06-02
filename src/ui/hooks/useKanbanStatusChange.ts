import {useCallback, useMemo} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {toast} from 'sonner';
import type {Issue} from '../../shared/types';
import {cannotClaimIssue, getClaimBlockedMessage} from '../lib/issueClaim';
import {beginIssuesOptimisticUpdate, patchIssueStatus, rollbackIssuesCache} from '../lib/issuesCache';
import {getKanbanColumnForIssue} from '../lib/kanban';
import type {KanbanColumnId} from '../lib/issueRowStyles';
import {useIssueMutations} from './useIssueMutations';

export function useKanbanStatusChange(issues: Issue[]) {
  const queryClient = useQueryClient();
  const {updateIssue, closeIssue, reopenIssue} = useIssueMutations();
  const issueMap = useMemo(() => new Map(issues.map((i) => [i.id, i])), [issues]);

  const moveToColumn = useCallback(
    async (issue: Issue, targetColumn: KanbanColumnId) => {
      const currentColumn = getKanbanColumnForIssue(issue);
      if (!currentColumn || currentColumn === targetColumn) return;

      if (targetColumn === 'in_progress') {
        if (cannotClaimIssue(issue, issueMap)) {
          toast.error(getClaimBlockedMessage(issue, issueMap));
          return;
        }
      }

      try {
        if (targetColumn === 'closed') {
          await closeIssue.mutateAsync({id: issue.id});
          toast.success('Issue closed');
          return;
        }

        if (issue.status === 'closed') {
          if (targetColumn === 'in_progress') {
            const ctx = await beginIssuesOptimisticUpdate(queryClient, (cached) =>
              patchIssueStatus(cached, issue.id, 'in_progress')
            );
            try {
              await reopenIssue.mutateAsync({id: issue.id, skipOptimistic: true});
              const result = await updateIssue.mutateAsync({
                id: issue.id,
                data: {status: 'in_progress'},
                skipOptimistic: true,
              });
              const cascaded = (result as {_cascadeClaimed?: string[]})._cascadeClaimed;
              if (cascaded && cascaded.length > 0) {
                toast.success('Status updated', {description: `Also started: ${cascaded.join(', ')}`});
              } else {
                toast.success('Status updated');
              }
            } catch (err) {
              rollbackIssuesCache(queryClient, ctx);
              throw err;
            }
            return;
          }

          await reopenIssue.mutateAsync({id: issue.id});
          toast.success('Issue reopened');
          return;
        }

        const newStatus = targetColumn === 'in_progress' ? 'in_progress' : 'open';
        const result = await updateIssue.mutateAsync({id: issue.id, data: {status: newStatus}});
        const cascaded = (result as {_cascadeClaimed?: string[]})._cascadeClaimed;
        if (cascaded && cascaded.length > 0) {
          toast.success('Status updated', {description: `Also started: ${cascaded.join(', ')}`});
        } else {
          toast.success('Status updated');
        }
      } catch (err) {
        toast.error('Failed to update status', {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    },
    [issueMap, queryClient, updateIssue, closeIssue, reopenIssue]
  );

  const isPending = updateIssue.isPending || closeIssue.isPending || reopenIssue.isPending;

  return {moveToColumn, isPending};
}
