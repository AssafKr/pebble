import { X } from 'lucide-react';
import { Button } from './ui/button';

interface IssueNotFoundProps {
  issueId: string;
  onClose: () => void;
}

export function IssueNotFound({ issueId, onClose }: IssueNotFoundProps) {
  return (
    <div className="fixed top-[65px] bottom-0 right-0 w-[500px] bg-background border-l shadow-lg overflow-y-auto">
      <div className="sticky top-0 bg-background border-b p-4 z-10">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm text-muted-foreground">{issueId}</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="p-6 text-center space-y-2">
        <p className="font-medium">Issue not found</p>
        <p className="text-sm text-muted-foreground">
          No issue with id <span className="font-mono">{issueId}</span> exists in this project.
        </p>
      </div>
    </div>
  );
}
