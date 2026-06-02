import type {Issue, IssueEvent} from '../../shared/types';
import {fetchIssues, fetchEvents} from './api';

export interface IssuesData {
  issues: Issue[];
  events: IssueEvent[];
}

export const issuesDataQueryKey = ['issuesData'] as const;

export async function fetchIssuesData(): Promise<IssuesData> {
  const [issues, events] = await Promise.all([fetchIssues(), fetchEvents()]);
  return {issues, events};
}
