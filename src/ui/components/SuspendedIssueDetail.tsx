import type {RefObject} from 'react';
import type {Issue} from '../../shared/types';
import {useSuspenseIssues} from '../hooks/useIssues';
import {IssueDetail} from './IssueDetail';
import {IssueNotFound} from './IssueNotFound';

interface SuspendedIssueDetailProps {
  issueId: string;
  onClose: () => void;
  onSelectIssue: (issue: Issue) => void;
  commentInputRef?: RefObject<HTMLTextAreaElement>;
}

export function SuspendedIssueDetail({issueId, onClose, onSelectIssue, commentInputRef}: SuspendedIssueDetailProps) {
  const {issues, events} = useSuspenseIssues();
  const issue = issues.find((candidate) => candidate.id === issueId);

  if (!issue) {
    return <IssueNotFound issueId={issueId} onClose={onClose} />;
  }

  return (
    <IssueDetail
      issue={issue}
      allIssues={issues}
      events={events}
      onClose={onClose}
      onSelectIssue={onSelectIssue}
      commentInputRef={commentInputRef}
    />
  );
}
