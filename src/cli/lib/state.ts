import type {Issue, IssueEvent, CreateEvent, UpdateEvent, CommentEvent, IssueFilters} from '../../shared/types.js';
import {readEvents, appendEvent} from './storage.js';

/**
 * Compute current issue state from a list of events
 * Returns a map of issue ID to current Issue state
 */
export function computeState(events: IssueEvent[]): Map<string, Issue> {
  const issues = new Map<string, Issue>();

  for (const event of events) {
    switch (event.type) {
      case 'create': {
        const createEvent = event as CreateEvent;
        const issue: Issue = {
          id: event.issueId,
          title: createEvent.data.title,
          type: createEvent.data.type,
          priority: createEvent.data.priority,
          status: 'open',
          description: createEvent.data.description,
          parent: createEvent.data.parent,
          blockedBy: [],
          relatedTo: [],
          comments: [],
          createdAt: event.timestamp,
          updatedAt: event.timestamp,
          statusChangedAt: event.timestamp, // Initial status is 'open'
          lastSource: event.source,
        };
        issues.set(event.issueId, issue);
        break;
      }

      case 'update': {
        const updateEvent = event as UpdateEvent;
        const issue = issues.get(event.issueId);
        if (issue) {
          if (updateEvent.data.title !== undefined) {
            issue.title = updateEvent.data.title;
          }
          if (updateEvent.data.type !== undefined) {
            issue.type = updateEvent.data.type;
          }
          if (updateEvent.data.priority !== undefined) {
            issue.priority = updateEvent.data.priority;
          }
          if (updateEvent.data.status !== undefined) {
            if (issue.status !== updateEvent.data.status) {
              issue.statusChangedAt = event.timestamp;
            }
            issue.status = updateEvent.data.status;
          }
          if (updateEvent.data.description !== undefined) {
            issue.description = updateEvent.data.description;
          }
          if (updateEvent.data.parent !== undefined) {
            // Empty string means "clear parent" (sentinel value from --parent null)
            issue.parent = updateEvent.data.parent || undefined;
          }
          if (updateEvent.data.blockedBy !== undefined) {
            issue.blockedBy = updateEvent.data.blockedBy;
          }
          if (updateEvent.data.relatedTo !== undefined) {
            issue.relatedTo = updateEvent.data.relatedTo;
          }
          issue.updatedAt = event.timestamp;
          if (event.source) issue.lastSource = event.source;
        }
        break;
      }

      case 'close': {
        const issue = issues.get(event.issueId);
        if (issue) {
          issue.status = 'closed';
          issue.statusChangedAt = event.timestamp;
          issue.updatedAt = event.timestamp;
          if (event.source) issue.lastSource = event.source;
        }
        break;
      }

      case 'reopen': {
        const issue = issues.get(event.issueId);
        if (issue) {
          issue.status = 'open';
          issue.statusChangedAt = event.timestamp;
          issue.updatedAt = event.timestamp;
          if (event.source) issue.lastSource = event.source;
        }
        break;
      }

      case 'comment': {
        const commentEvent = event as CommentEvent;
        const issue = issues.get(event.issueId);
        if (issue) {
          issue.comments.push(commentEvent.data);
          issue.updatedAt = event.timestamp;
          if (event.source) issue.lastSource = event.source;
        }
        break;
      }

      case 'delete': {
        const issue = issues.get(event.issueId);
        if (issue) {
          issue.deleted = true;
          issue.deletedAt = event.timestamp;
          issue.updatedAt = event.timestamp;
          if (event.source) issue.lastSource = event.source;
        }
        break;
      }

      case 'restore': {
        const issue = issues.get(event.issueId);
        if (issue) {
          issue.deleted = false;
          issue.deletedAt = undefined;
          issue.updatedAt = event.timestamp;
          if (event.source) issue.lastSource = event.source;
        }
        break;
      }
    }
  }

  return issues;
}

/**
 * Get all issues as an array, optionally filtered
 * By default excludes deleted issues unless includeDeleted is true
 */
export function getIssues(filters?: IssueFilters, includeDeleted = false): Issue[] {
  const events = readEvents();
  const state = computeState(events);
  let issues = Array.from(state.values());

  // Filter out deleted issues unless explicitly included
  if (!includeDeleted) {
    issues = issues.filter((i) => !i.deleted);
  }

  if (filters) {
    if (filters.status !== undefined) {
      issues = issues.filter((i) => i.status === filters.status);
    }
    if (filters.type !== undefined) {
      issues = issues.filter((i) => i.type === filters.type);
    }
    if (filters.priority !== undefined) {
      issues = issues.filter((i) => i.priority === filters.priority);
    }
    if (filters.parent !== undefined) {
      issues = issues.filter((i) => i.parent === filters.parent);
    }
  }

  return issues;
}

/**
 * Get a single issue by ID
 * @param id Issue ID
 * @param includeDeleted If false (default), returns undefined for deleted issues
 */
export function getIssue(id: string, includeDeleted = false): Issue | undefined {
  const events = readEvents();
  const state = computeState(events);
  const issue = state.get(id);
  if (issue && issue.deleted && !includeDeleted) {
    return undefined;
  }
  return issue;
}

/**
 * Resolve a partial ID to a full ID
 * Supports: exact match, prefix match, suffix-only match
 * All matching is case-insensitive
 * Throws if ambiguous (multiple matches) or not found
 */
export function resolveId(partial: string): string {
  const events = readEvents();
  const state = computeState(events);
  const allIds = Array.from(state.keys());
  const partialLower = partial.toLowerCase();

  // First try exact match (case-insensitive)
  const exactMatch = allIds.find((id) => id.toLowerCase() === partialLower);
  if (exactMatch) {
    return exactMatch;
  }

  // Then try prefix match
  const prefixMatches = allIds.filter((id) => id.toLowerCase().startsWith(partialLower));

  if (prefixMatches.length === 1) {
    return prefixMatches[0];
  }

  if (prefixMatches.length > 1) {
    throw new Error(`Ambiguous issue ID '${partial}'. Matches: ${prefixMatches.join(', ')}`);
  }

  // Then try suffix match (part after the hyphen)
  const suffixMatches = allIds.filter((id) => {
    const hyphenIndex = id.indexOf('-');
    if (hyphenIndex === -1) return false;
    const suffix = id.substring(hyphenIndex + 1).toLowerCase();
    return suffix === partialLower;
  });

  if (suffixMatches.length === 1) {
    return suffixMatches[0];
  }

  if (suffixMatches.length > 1) {
    throw new Error(`Ambiguous issue ID '${partial}'. Matches: ${suffixMatches.join(', ')}`);
  }

  throw new Error(`Issue not found: ${partial}`);
}

/**
 * Get issues that are ready for work (non-closed with no open blockers)
 * Excludes deleted issues
 */
export function getReady(): Issue[] {
  const events = readEvents();
  const state = computeState(events);
  const issues = Array.from(state.values());

  return issues.filter((issue) => {
    // Skip deleted issues
    if (issue.deleted) {
      return false;
    }

    // Must not be closed
    if (issue.status === 'closed') {
      return false;
    }

    // All blockers must be closed
    for (const blockerId of issue.blockedBy) {
      const blocker = state.get(blockerId);
      if (blocker && blocker.status !== 'closed') {
        return false;
      }
    }

    return true;
  });
}

/**
 * Get issues that are blocked (have at least one open blocker)
 * Excludes deleted issues
 */
export function getBlocked(): Issue[] {
  const events = readEvents();
  const state = computeState(events);
  const issues = Array.from(state.values());

  return issues.filter((issue) => {
    // Skip deleted issues
    if (issue.deleted) {
      return false;
    }

    // Must not be closed
    if (issue.status === 'closed') {
      return false;
    }

    // Check if any blocker is not closed
    for (const blockerId of issue.blockedBy) {
      const blocker = state.get(blockerId);
      if (blocker && blocker.status !== 'closed') {
        return true;
      }
    }

    return false;
  });
}

/**
 * Build a dependency graph as adjacency list
 * Returns a map of issueId -> list of issues it blocks
 */
export function buildDependencyGraph(): Map<string, string[]> {
  const events = readEvents();
  const state = computeState(events);
  const graph = new Map<string, string[]>();

  // Initialize all nodes
  for (const id of state.keys()) {
    graph.set(id, []);
  }

  // Build edges (blocker -> blocked)
  for (const [id, issue] of state) {
    for (const blockerId of issue.blockedBy) {
      const blockerEdges = graph.get(blockerId);
      if (blockerEdges) {
        blockerEdges.push(id);
      }
    }
  }

  return graph;
}

/**
 * Check if adding a dependency would create a cycle
 * Uses DFS to detect if newBlockerId can reach issueId
 */
export function detectCycle(issueId: string, newBlockerId: string): boolean {
  if (issueId === newBlockerId) {
    return true; // Self-reference
  }

  const graph = buildDependencyGraph();

  // Add the proposed edge temporarily
  const blockerEdges = graph.get(newBlockerId) ?? [];
  const testGraph = new Map(graph);
  testGraph.set(newBlockerId, [...blockerEdges, issueId]);

  // DFS to check if issueId can reach newBlockerId (which would mean a cycle)
  const visited = new Set<string>();
  const stack = [issueId];

  while (stack.length > 0) {
    const current = stack.pop()!;

    if (current === newBlockerId) {
      return true; // Found a cycle
    }

    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    const edges = testGraph.get(current) ?? [];
    for (const next of edges) {
      if (!visited.has(next)) {
        stack.push(next);
      }
    }
  }

  return false;
}

/**
 * Get issues that block a given issue
 */
export function getBlockers(issueId: string): Issue[] {
  const issue = getIssue(issueId);
  if (!issue) {
    return [];
  }

  const events = readEvents();
  const state = computeState(events);

  return issue.blockedBy.map((id) => state.get(id)).filter((i): i is Issue => i !== undefined);
}

/**
 * Get issues that are blocked by a given issue
 */
export function getBlocking(issueId: string): Issue[] {
  const events = readEvents();
  const state = computeState(events);

  return Array.from(state.values()).filter((issue) => issue.blockedBy.includes(issueId));
}

/**
 * Get children of an epic
 */
export function getChildren(epicId: string, includeDeleted = false): Issue[] {
  const events = readEvents();
  const state = computeState(events);

  return Array.from(state.values()).filter((issue) => issue.parent === epicId && (includeDeleted || !issue.deleted));
}

/**
 * Check if an epic has any open children
 */
export function hasOpenChildren(epicId: string): boolean {
  const children = getChildren(epicId);
  return children.some((child) => child.status !== 'closed');
}

/**
 * Get issues that became unblocked/ready after closing an issue.
 * Returns issues that were blocked by this issue and now have all blockers closed.
 */
export function getNewlyUnblocked(closedIssueId: string): Issue[] {
  const events = readEvents();
  const state = computeState(events);
  const result: Issue[] = [];

  for (const issue of state.values()) {
    // Skip closed issues
    if (issue.status === 'closed') continue;

    // Check if this issue was blocking it
    if (issue.blockedBy.includes(closedIssueId)) {
      // Check if all blockers are now closed
      const allBlockersClosed = issue.blockedBy.every((blockerId) => {
        const blocker = state.get(blockerId);
        return blocker?.status === 'closed';
      });
      if (allBlockersClosed) {
        result.push(issue);
      }
    }
  }

  return result;
}

/**
 * Get issues related to a given issue (bidirectional relationship)
 */
export function getRelated(issueId: string): Issue[] {
  const issue = getIssue(issueId);
  if (!issue) {
    return [];
  }

  const events = readEvents();
  const state = computeState(events);

  return issue.relatedTo.map((id) => state.get(id)).filter((i): i is Issue => i !== undefined);
}

/**
 * Check if an issue has any open (non-closed) blockers
 */
export function hasOpenBlockersById(issueId: string): boolean {
  const issue = getIssue(issueId);
  if (!issue) {
    return false;
  }

  const events = readEvents();
  const state = computeState(events);

  return issue.blockedBy.some((blockerId) => {
    const blocker = state.get(blockerId);
    return blocker && blocker.status !== 'closed';
  });
}

/**
 * Get open blockers for an issue (for error messages)
 */
export function getOpenBlockers(issueId: string): Issue[] {
  const issue = getIssue(issueId);
  if (!issue) {
    return [];
  }

  const events = readEvents();
  const state = computeState(events);

  return issue.blockedBy.map((id) => state.get(id)).filter((i): i is Issue => i !== undefined && i.status !== 'closed');
}

/**
 * Get the computed state map for efficient lookups
 * Use this when you need to perform multiple lookups to avoid recomputing state
 */
export function getComputedState(): Map<string, Issue> {
  const events = readEvents();
  return computeState(events);
}

/**
 * Get the ancestry chain for an issue (parent → grandparent → great-grandparent...)
 * Returns array ordered from immediate parent to root
 */
export function getAncestryChain(issueId: string, state: Map<string, Issue>): Array<{id: string; title: string}> {
  const chain: Array<{id: string; title: string}> = [];
  let current = state.get(issueId);

  while (current?.parent) {
    const parent = state.get(current.parent);
    if (!parent) break;
    chain.push({id: parent.id, title: parent.title});
    current = parent;
  }

  return chain;
}

/**
 * Check if any ancestor in the parent chain is blocked
 * Returns the first blocked ancestor and its blockers, or null if none blocked
 */
export function getAncestryBlocker(
  issueId: string,
  state: Map<string, Issue>
): {blockedAncestor: Issue; blockers: Issue[]} | null {
  let current = state.get(issueId);

  while (current?.parent) {
    const parent = state.get(current.parent);
    if (!parent) break;

    // Check if this parent has open blockers (exclude deleted blockers)
    const openBlockers = parent.blockedBy
      .map((id) => state.get(id))
      .filter((i): i is Issue => i !== undefined && i.status !== 'closed' && !i.deleted);

    if (openBlockers.length > 0) {
      return {blockedAncestor: parent, blockers: openBlockers};
    }

    current = parent;
  }

  return null;
}

export type ClaimResult = {success: true; claimedIds: string[]} | {success: false; error: string};

/**
 * Claim an issue and cascade to all open parents
 * Validates that neither the issue nor any ancestor is blocked
 */
export function claimWithCascade(issueId: string, pebbleDir: string): ClaimResult {
  const events = readEvents();
  const state = computeState(events);
  const issue = state.get(issueId);

  // Validate issue exists
  if (!issue) {
    return {success: false, error: `Issue not found: ${issueId}`};
  }

  // Validate not deleted
  if (issue.deleted) {
    return {success: false, error: `Cannot claim deleted issue: ${issueId}`};
  }

  // Validate not closed
  if (issue.status === 'closed') {
    return {success: false, error: `Cannot claim closed issue: ${issueId}`};
  }

  // Check if issue itself is blocked (exclude deleted blockers)
  const openBlockers = issue.blockedBy
    .map((id) => state.get(id))
    .filter((i): i is Issue => i !== undefined && i.status !== 'closed' && !i.deleted);

  if (openBlockers.length > 0) {
    const blockerIds = openBlockers.map((b) => b.id).join(', ');
    return {
      success: false,
      error: `Cannot claim blocked issue. Blocked by: ${blockerIds}`,
    };
  }

  // Check if any ancestor is blocked
  const ancestryBlocker = getAncestryBlocker(issueId, state);
  if (ancestryBlocker) {
    const blockerIds = ancestryBlocker.blockers.map((b) => b.id).join(', ');
    return {
      success: false,
      error: `Parent ${ancestryBlocker.blockedAncestor.id} is blocked by: ${blockerIds}`,
    };
  }

  // Collect issues to claim: target + all open ancestors
  const toClaim: string[] = [];

  // Add target if not already in_progress
  if (issue.status !== 'in_progress') {
    toClaim.push(issueId);
  }

  // Walk up parent chain, add open ancestors
  let current = issue;
  while (current.parent) {
    const parent = state.get(current.parent);
    if (!parent) break;

    if (parent.status === 'open') {
      toClaim.push(parent.id);
    }
    current = parent;
  }

  // Emit UpdateEvents for all collected issues
  const timestamp = new Date().toISOString();
  for (const id of toClaim) {
    const event: UpdateEvent = {
      type: 'update',
      issueId: id,
      timestamp,
      data: {status: 'in_progress'},
    };
    appendEvent(event, pebbleDir);
  }

  return {success: true, claimedIds: toClaim};
}

/**
 * Get all descendants of an issue (children, grandchildren, etc.)
 * Used for cascade delete of epics
 * Returns flat array of all descendant issues
 */
export function getDescendants(issueId: string, state?: Map<string, Issue>): Issue[] {
  const issueState = state ?? getComputedState();
  const descendants: Issue[] = [];

  function collectDescendants(parentId: string) {
    for (const issue of issueState.values()) {
      if (issue.parent === parentId && !issue.deleted) {
        descendants.push(issue);
        // Recursively collect children of this child
        collectDescendants(issue.id);
      }
    }
  }

  collectDescendants(issueId);
  return descendants;
}
