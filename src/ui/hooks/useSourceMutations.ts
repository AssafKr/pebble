import {useMutation, useQueryClient} from '@tanstack/react-query';
import {addSource, removeSource} from '../lib/api';
import {queryKeys} from '../lib/queryKeys';

export function useSourceMutations() {
  const queryClient = useQueryClient();

  const onSourcesSuccess = (sources: Awaited<ReturnType<typeof addSource>>) => {
    queryClient.setQueryData(queryKeys.sources, sources);
    void queryClient.invalidateQueries({queryKey: queryKeys.issuesData});
  };

  const addSourceMutation = useMutation({
    mutationFn: addSource,
    onSuccess: onSourcesSuccess,
  });

  const removeSourceMutation = useMutation({
    mutationFn: removeSource,
    onSuccess: onSourcesSuccess,
  });

  return {addSource: addSourceMutation, removeSource: removeSourceMutation};
}
