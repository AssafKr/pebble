import {useCallback, useState} from 'react';

export function useIssueSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((issueId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(issueId)) {
        next.delete(issueId);
      } else {
        next.add(issueId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((issueIds: string[]) => {
    setSelectedIds(new Set(issueIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {selectedIds, toggleSelect, selectAll, clearSelection};
}
