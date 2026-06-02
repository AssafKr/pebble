import type {QueryClient} from '@tanstack/react-query';
import type {Issue, Priority, Status} from '../../shared/types';
import type {IssuesData} from './issuesQueries';
import {queryKeys} from './queryKeys';

export type IssuesCacheContext = {previous: IssuesData | undefined};

export function shouldSkipIssuesOptimistic(meta: Record<string, unknown> | undefined): boolean {
  return meta?.skipOptimistic === true;
}

export function getIssuesData(queryClient: QueryClient): IssuesData | undefined {
  return queryClient.getQueryData<IssuesData>(queryKeys.issuesData);
}

export function setIssuesData(queryClient: QueryClient, data: IssuesData): void {
  queryClient.setQueryData(queryKeys.issuesData, data);
}

function stripCascadeMeta(issue: Issue & {_cascadeClaimed?: string[]}): Issue {
  const {_cascadeClaimed: _, ...rest} = issue;
  return rest;
}

export function patchIssuePriority(data: IssuesData, issueId: string, priority: Priority): IssuesData {
  const now = new Date().toISOString();
  return {
    ...data,
    issues: data.issues.map((issue) => (issue.id === issueId ? {...issue, priority, updatedAt: now} : issue)),
  };
}

export function patchIssueStatus(data: IssuesData, issueId: string, status: Status): IssuesData {
  const now = new Date().toISOString();
  return {
    ...data,
    issues: data.issues.map((issue) =>
      issue.id === issueId ? {...issue, status, statusChangedAt: now, updatedAt: now} : issue
    ),
  };
}

export function patchIssuesStatus(data: IssuesData, issueIds: string[], status: Status): IssuesData {
  const idSet = new Set(issueIds);
  const now = new Date().toISOString();
  return {
    ...data,
    issues: data.issues.map((issue) =>
      idSet.has(issue.id) ? {...issue, status, statusChangedAt: now, updatedAt: now} : issue
    ),
  };
}

export function mergeIssueInCache(data: IssuesData, updated: Issue & {_cascadeClaimed?: string[]}): IssuesData {
  const issue = stripCascadeMeta(updated);
  return {
    ...data,
    issues: data.issues.map((i) => (i.id === issue.id ? {...i, ...issue} : i)),
  };
}

export async function beginIssuesOptimisticUpdate(
  queryClient: QueryClient,
  patch: (data: IssuesData) => IssuesData
): Promise<IssuesCacheContext> {
  await queryClient.cancelQueries({queryKey: queryKeys.issuesData});
  const previous = getIssuesData(queryClient);
  if (previous) {
    setIssuesData(queryClient, patch(previous));
  }
  return {previous};
}

export function rollbackIssuesCache(queryClient: QueryClient, context: IssuesCacheContext | undefined): void {
  if (context?.previous) {
    setIssuesData(queryClient, context.previous);
  }
}

export function applyIssueMutationResult(queryClient: QueryClient, result: Issue & {_cascadeClaimed?: string[]}): void {
  const data = getIssuesData(queryClient);
  if (!data) return;

  let next = mergeIssueInCache(data, result);
  const cascaded = result._cascadeClaimed;
  if (cascaded && cascaded.length > 0) {
    next = patchIssuesStatus(next, cascaded, 'in_progress');
  }
  setIssuesData(queryClient, next);
}
