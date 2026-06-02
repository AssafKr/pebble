import {useQuery} from '@tanstack/react-query';
import {fetchSources} from '../lib/api';
import {queryKeys} from '../lib/queryKeys';

export function useSources(enabled = true) {
  return useQuery({
    queryKey: queryKeys.sources,
    queryFn: fetchSources,
    enabled,
  });
}
