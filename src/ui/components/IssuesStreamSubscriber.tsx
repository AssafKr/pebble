import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { issuesDataQueryKey } from '../lib/issuesQueries';

export function IssuesStreamSubscriber() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const eventSource = new EventSource('/api/events/stream');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'change') {
          void queryClient.invalidateQueries({ queryKey: issuesDataQueryKey });
        }
      } catch {
        // Ignore parse errors
      }
    };

    return () => eventSource.close();
  }, [queryClient]);

  return null;
}
