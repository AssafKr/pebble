export const queryKeys = {
  issuesData: ['issuesData'] as const,
  sources: ['sources'] as const,
  worktrees: ['worktrees'] as const,
};

/** @deprecated Use queryKeys.issuesData */
export const issuesDataQueryKey = queryKeys.issuesData;
