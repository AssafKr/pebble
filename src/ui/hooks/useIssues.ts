import { useCallback } from 'react';
import { useQuery, useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchIssuesData,
  issuesDataQueryKey,
  type IssuesData,
} from '../lib/issuesQueries';

export type { IssuesData };

export function useInvalidateIssuesData(): () => Promise<void> {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: issuesDataQueryKey }),
    [queryClient],
  );
}

export function useSuspenseIssues(): IssuesData & { refresh: () => Promise<void> } {
  const invalidate = useInvalidateIssuesData();
  const { data } = useSuspenseQuery({
    queryKey: issuesDataQueryKey,
    queryFn: fetchIssuesData,
  });

  return {
    ...data,
    refresh: invalidate,
  };
}

export function useIssues(): IssuesData & {
  loading: boolean;
  error: Error | null;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
} {
  const invalidate = useInvalidateIssuesData();
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: issuesDataQueryKey,
    queryFn: fetchIssuesData,
  });

  return {
    issues: data?.issues ?? [],
    events: data?.events ?? [],
    loading: isLoading,
    error: error ?? null,
    isRefreshing: isFetching && !isLoading,
    refresh: invalidate,
  };
}
