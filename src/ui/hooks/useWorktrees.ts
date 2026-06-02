import {useQuery} from '@tanstack/react-query';
import {fetchWorktrees} from '../lib/api';
import {queryKeys} from '../lib/queryKeys';

export function useWorktrees(enabled = true) {
  return useQuery({
    queryKey: queryKeys.worktrees,
    queryFn: fetchWorktrees,
    enabled,
    select: (data) => data.worktrees,
  });
}
