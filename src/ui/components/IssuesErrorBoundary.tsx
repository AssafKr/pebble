import {Component, type ErrorInfo, type ReactNode} from 'react';
import {Button} from './ui/button';

interface IssuesErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

interface IssuesErrorBoundaryState {
  error: Error | null;
}

export class IssuesErrorBoundary extends Component<IssuesErrorBoundaryProps, IssuesErrorBoundaryState> {
  state: IssuesErrorBoundaryState = {error: null};

  static getDerivedStateFromError(error: Error): IssuesErrorBoundaryState {
    return {error};
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Issues data error:', error, info);
  }

  private handleRetry = (): void => {
    this.setState({error: null});
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center h-64 px-6">
          <div className="text-center space-y-4 p-8 bg-surface rounded-2xl shadow-lg border border-border max-w-md">
            <h2 className="text-xl font-display font-semibold text-destructive">Failed to load issues</h2>
            <p className="text-sm text-foreground-muted">{this.state.error.message}</p>
            <Button onClick={this.handleRetry}>Try Again</Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
