import {Loader2, RefreshCw} from 'lucide-react';
import {useIssues} from '../hooks/useIssues';
import {Button} from './ui/button';

export function RefreshIssuesButton() {
  const {isRefreshing, refresh} = useIssues();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => void refresh()}
      disabled={isRefreshing}
      className="text-foreground-muted hover:text-foreground"
    >
      {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
    </Button>
  );
}
