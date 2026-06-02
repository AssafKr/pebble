import {useMutation, useQueryClient} from '@tanstack/react-query';
import {
  addComment,
  addDependency,
  addRelated,
  bulkCloseIssues,
  bulkUpdateIssues,
  closeIssue,
  createIssue,
  removeDependency,
  removeRelated,
  reopenIssue,
  restoreIssue,
  updateIssue,
  type CreateIssueInput,
  type UpdateIssueInput,
} from '../lib/api';
import type {Priority, Status} from '../../shared/types';
import {
  applyIssueMutationResult,
  beginIssuesOptimisticUpdate,
  patchIssuePriority,
  patchIssueStatus,
  rollbackIssuesCache,
  shouldSkipIssuesOptimistic,
  type IssuesCacheContext,
} from '../lib/issuesCache';
import {queryKeys} from '../lib/queryKeys';

function useInvalidateIssuesData() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({queryKey: queryKeys.issuesData});
}

export function useIssueMutations() {
  const queryClient = useQueryClient();
  const invalidateIssues = useInvalidateIssuesData();

  const updateIssueMutation = useMutation({
    mutationFn: ({id, data}: {id: string; data: UpdateIssueInput}) => updateIssue(id, data),
    onMutate: async ({id, data}, context) => {
      if (shouldSkipIssuesOptimistic(context.meta)) return {};
      const {status, priority} = data;
      if (status === undefined && priority === undefined) return {};
      return beginIssuesOptimisticUpdate(queryClient, (cached) => {
        let next = cached;
        if (status !== undefined) next = patchIssueStatus(next, id, status);
        if (priority !== undefined) next = patchIssuePriority(next, id, priority);
        return next;
      });
    },
    onError: (_err, _vars, context) => {
      rollbackIssuesCache(queryClient, context as IssuesCacheContext | undefined);
    },
    onSuccess: (result) => {
      applyIssueMutationResult(queryClient, result);
    },
    onSettled: invalidateIssues,
  });

  const closeIssueMutation = useMutation({
    mutationFn: ({id, reason}: {id: string; reason?: string}) => closeIssue(id, reason),
    onMutate: async ({id}, context) => {
      if (shouldSkipIssuesOptimistic(context.meta)) return {};
      return beginIssuesOptimisticUpdate(queryClient, (cached) => patchIssueStatus(cached, id, 'closed'));
    },
    onError: (_err, _vars, context) => {
      rollbackIssuesCache(queryClient, context as IssuesCacheContext | undefined);
    },
    onSuccess: (result) => {
      applyIssueMutationResult(queryClient, result);
    },
    onSettled: invalidateIssues,
  });

  const reopenIssueMutation = useMutation({
    mutationFn: ({id, reason}: {id: string; reason?: string}) => reopenIssue(id, reason),
    onMutate: async ({id}, context) => {
      if (shouldSkipIssuesOptimistic(context.meta)) return {};
      return beginIssuesOptimisticUpdate(queryClient, (cached) => patchIssueStatus(cached, id, 'open'));
    },
    onError: (_err, _vars, context) => {
      rollbackIssuesCache(queryClient, context as IssuesCacheContext | undefined);
    },
    onSuccess: (result) => {
      applyIssueMutationResult(queryClient, result);
    },
    onSettled: invalidateIssues,
  });

  const addCommentMutation = useMutation({
    mutationFn: ({id, text, author}: {id: string; text: string; author?: string}) => addComment(id, text, author),
    onSuccess: invalidateIssues,
  });

  const addDependencyMutation = useMutation({
    mutationFn: ({id, blockerId}: {id: string; blockerId: string}) => addDependency(id, blockerId),
    onSuccess: invalidateIssues,
  });

  const removeDependencyMutation = useMutation({
    mutationFn: ({id, blockerId}: {id: string; blockerId: string}) => removeDependency(id, blockerId),
    onSuccess: invalidateIssues,
  });

  const addRelatedMutation = useMutation({
    mutationFn: ({
      issueId,
      relatedId,
      currentRelatedTo,
      relatedIssueRelatedTo,
    }: {
      issueId: string;
      relatedId: string;
      currentRelatedTo: string[];
      relatedIssueRelatedTo: string[];
    }) => addRelated(issueId, relatedId, currentRelatedTo, relatedIssueRelatedTo),
    onSuccess: invalidateIssues,
  });

  const removeRelatedMutation = useMutation({
    mutationFn: ({
      issueId,
      relatedId,
      currentRelatedTo,
      relatedIssueRelatedTo,
    }: {
      issueId: string;
      relatedId: string;
      currentRelatedTo: string[];
      relatedIssueRelatedTo: string[];
    }) => removeRelated(issueId, relatedId, currentRelatedTo, relatedIssueRelatedTo),
    onSuccess: invalidateIssues,
  });

  const restoreIssueMutation = useMutation({
    mutationFn: ({id, reason}: {id: string; reason?: string}) => restoreIssue(id, reason),
    onSuccess: invalidateIssues,
  });

  const createIssueMutation = useMutation({
    mutationFn: ({data, targetSourceIndex}: {data: CreateIssueInput; targetSourceIndex?: number}) =>
      createIssue(data, targetSourceIndex),
    onSuccess: invalidateIssues,
  });

  const bulkCloseMutation = useMutation({
    mutationFn: (ids: string[]) => bulkCloseIssues(ids),
    onSuccess: invalidateIssues,
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ids, updates}: {ids: string[]; updates: {status?: Status; priority?: Priority}}) =>
      bulkUpdateIssues(ids, updates),
    onSuccess: invalidateIssues,
  });

  return {
    updateIssue: updateIssueMutation,
    closeIssue: closeIssueMutation,
    reopenIssue: reopenIssueMutation,
    addComment: addCommentMutation,
    addDependency: addDependencyMutation,
    removeDependency: removeDependencyMutation,
    addRelated: addRelatedMutation,
    removeRelated: removeRelatedMutation,
    restoreIssue: restoreIssueMutation,
    createIssue: createIssueMutation,
    bulkClose: bulkCloseMutation,
    bulkUpdate: bulkUpdateMutation,
  };
}
