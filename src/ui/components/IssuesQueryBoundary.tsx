import { type ReactNode } from 'react';
import { QueryErrorResetBoundary, useQueryErrorResetBoundary } from '@tanstack/react-query';
import { IssuesErrorBoundary } from './IssuesErrorBoundary';
import { useInvalidateIssuesData } from '../hooks/useIssues';

function IssuesErrorBoundaryInner({ children }: { children: ReactNode }) {
  const { reset } = useQueryErrorResetBoundary();
  const invalidate = useInvalidateIssuesData();

  return (
    <IssuesErrorBoundary
      onReset={() => {
        reset();
        void invalidate();
      }}
    >
      {children}
    </IssuesErrorBoundary>
  );
}

export function IssuesQueryBoundary({ children }: { children: ReactNode }) {
  return (
    <QueryErrorResetBoundary>
      <IssuesErrorBoundaryInner>{children}</IssuesErrorBoundaryInner>
    </QueryErrorResetBoundary>
  );
}
