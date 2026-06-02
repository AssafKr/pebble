import {useCallback} from 'react';
import {useQuery, useSuspenseQuery, useQueryClient} from '@tanstack/react-query';
import {fetchIssuesData, type IssuesData} from '../lib/issuesQueries';
import {queryKeys} from '../lib/queryKeys';

export type {IssuesData};

export function useInvalidateIssuesData(): () => Promise<void> {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.invalidateQueries({queryKey: queryKeys.issuesData}), [queryClient]);
}

export function useSuspenseIssues(): IssuesData & {refresh: () => Promise<void>} {
  const invalidate = useInvalidateIssuesData();
  const {data} = useSuspenseQuery({
    queryKey: queryKeys.issuesData,
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
  const {data, isLoading, error, isFetching} = useQuery({
    queryKey: queryKeys.issuesData,
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
