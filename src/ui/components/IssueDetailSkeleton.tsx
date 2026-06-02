import {Loader2, X} from 'lucide-react';
import {Button} from './ui/button';

interface IssueDetailSkeletonProps {
  issueId?: string | null;
  onClose?: () => void;
}

export function IssueDetailSkeleton({issueId, onClose}: IssueDetailSkeletonProps) {
  return (
    <div className="fixed top-[65px] bottom-0 right-0 w-[500px] bg-background border-l shadow-lg overflow-y-auto animate-in fade-in duration-200">
      <div className="sticky top-0 bg-background border-b p-4 z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="space-y-2">
            {issueId ? (
              <span className="font-mono text-sm text-muted-foreground">{issueId}</span>
            ) : (
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            )}
            <div className="h-3 w-32 bg-muted rounded animate-pulse" />
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="h-7 w-3/4 bg-muted rounded animate-pulse" />
      </div>

      <div className="p-4 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading issue…
        </div>

        <div className="flex gap-2">
          <div className="h-8 w-20 bg-muted rounded animate-pulse" />
          <div className="h-8 w-20 bg-muted rounded animate-pulse" />
          <div className="h-8 w-16 bg-muted rounded animate-pulse" />
        </div>

        <div className="space-y-2">
          <div className="h-4 w-full bg-muted rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-muted rounded animate-pulse" />
          <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
        </div>

        <div className="space-y-3">
          <div className="h-5 w-24 bg-muted rounded animate-pulse" />
          <div className="h-20 w-full bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
