import {useSuspenseIssues} from '../hooks/useIssues';

export function IssuesCountBadge() {
  const {issues} = useSuspenseIssues();
  return (
    <span className="text-sm text-foreground-muted bg-background-subtle px-3 py-1 rounded-full">
      {issues.length} issues
    </span>
  );
}
