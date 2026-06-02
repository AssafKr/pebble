import {useEffect} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {queryKeys} from '../lib/queryKeys';

export function IssuesStreamSubscriber() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const eventSource = new EventSource('/api/events/stream');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'change') {
          void queryClient.invalidateQueries({queryKey: queryKeys.issuesData});
        }
      } catch {
        // Ignore parse errors
      }
    };

    return () => eventSource.close();
  }, [queryClient]);

  return null;
}
