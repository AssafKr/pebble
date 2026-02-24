import type { Issue, IssueEvent, Priority, Status, IssueType } from '../../shared/types.js';
import { PRIORITY_LABELS, STATUS_LABELS, TYPE_LABELS } from '../../shared/types.js';
import { formatRelativeTime } from '../../shared/time.js';

/**
 * Limit metadata for paginated output
 */
export interface LimitInfo {
  total: number;
  shown: number;
  limited: boolean;
}

/**
 * Format a limit message for pretty output
 */
export function formatLimitMessage(info: LimitInfo): string {
  if (!info.limited) return '';
  return `\n---\nShowing ${info.shown} of ${info.total} issues. Use --all or --limit <n> to see more.`;
}

/**
 * Format data as JSON string
 */
export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Format a priority value for display
 */
function formatPriority(priority: Priority): string {
  return `P${priority} (${PRIORITY_LABELS[priority]})`;
}

/**
 * Format a status value for display
 */
function formatStatus(status: Status): string {
  return STATUS_LABELS[status];
}

/**
 * Format a type value for display
 */
function formatType(type: IssueType): string {
  return TYPE_LABELS[type];
}

/**
 * Truncate a string to max length with ellipsis
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Pad a string to a fixed width
 */
function pad(str: string, width: number): string {
  return str.padEnd(width);
}

/**
 * Context for detailed issue display
 */
export interface IssueDetailContext {
  blocking: Issue[];
  children: Issue[];
  related: Issue[];
  ancestry?: Array<{ id: string; title: string }>; // Full parent chain
}

/**
 * Format an issue with full context (children, related)
 */
export function formatIssueDetailPretty(issue: Issue, ctx: IssueDetailContext): string {
  const lines: string[] = [];

  lines.push(`${issue.id} - ${issue.title}`);
  lines.push('─'.repeat(60));
  lines.push(`Type:     ${formatType(issue.type)}`);
  lines.push(`Priority: ${formatPriority(issue.priority)}`);
  const statusTime = issue.statusChangedAt ? ` (${formatRelativeTime(issue.statusChangedAt)})` : '';
  lines.push(`Status:   ${formatStatus(issue.status)}${statusTime}`);

  // Show ancestry chain if available
  if (ctx.ancestry && ctx.ancestry.length > 0) {
    const chain = [...ctx.ancestry].reverse().map(a => a.id).join(' > ');
    lines.push(`Ancestry: ${chain}`);
  } else if (issue.parent) {
    lines.push(`Parent:   ${issue.parent}`);
  }

  if (issue.description) {
    lines.push('');
    lines.push('Description:');
    lines.push(issue.description);
  }

  // Children (for epics)
  if (ctx.children.length > 0) {
    const closedChildren = ctx.children.filter(c => c.status === 'closed');
    lines.push('');
    lines.push(`Children (${closedChildren.length}/${ctx.children.length} done):`);
    for (const child of ctx.children) {
      const statusIcon = child.status === 'closed' ? '✓' : child.status === 'in_progress' ? '▶' : '○';
      lines.push(`  ${statusIcon} ${child.id} - ${child.title} [${child.status}]`);
    }
  }

  // Blocked by
  if (issue.blockedBy.length > 0) {
    lines.push('');
    lines.push(`Blocked by: ${issue.blockedBy.join(', ')}`);
  }

  // Blocking
  if (ctx.blocking.length > 0) {
    lines.push('');
    lines.push(`Blocking: ${ctx.blocking.map(i => i.id).join(', ')}`);
  }

  // Related issues
  if (ctx.related.length > 0) {
    lines.push('');
    lines.push(`Related: ${ctx.related.map(r => r.id).join(', ')}`);
  }

  // Comments
  if (issue.comments.length > 0) {
    lines.push('');
    lines.push('Comments:');
    for (const comment of issue.comments) {
      const author = comment.author ?? 'unknown';
      const date = new Date(comment.timestamp).toLocaleString();
      lines.push(`  [${date}] ${author}: ${comment.text}`);
    }
  }

  lines.push('');
  lines.push(`Created: ${formatRelativeTime(issue.createdAt)}`);
  lines.push(`Updated: ${formatRelativeTime(issue.updatedAt)}`);

  return lines.join('\n');
}

/**
 * Output detailed issue information
 */
export function outputIssueDetail(issue: Issue, ctx: IssueDetailContext, pretty: boolean): void {
  if (pretty) {
    console.log(formatIssueDetailPretty(issue, ctx));
  } else {
    // Include all context in JSON output
    const output = {
      ...issue,
      blocking: ctx.blocking.map(i => i.id),
      children: ctx.children.map(i => ({ id: i.id, title: i.title, status: i.status })),
      related: ctx.related.map(i => i.id),
      ...(ctx.ancestry && ctx.ancestry.length > 0 && { ancestry: ctx.ancestry }),
    };
    console.log(formatJson(output));
  }
}

/**
 * Format a list of issues as a table
 */
export function formatIssueListPretty(issues: Issue[]): string {
  if (issues.length === 0) {
    return 'No issues found.';
  }

  const lines: string[] = [];

  // Header
  const idWidth = 12;
  const typeWidth = 6;
  const prioWidth = 4;
  const statusWidth = 12;
  const titleWidth = 40;

  const header = [
    pad('ID', idWidth),
    pad('Type', typeWidth),
    pad('Pri', prioWidth),
    pad('Status', statusWidth),
    pad('Title', titleWidth),
  ].join(' │ ');

  lines.push(header);
  lines.push('─'.repeat(header.length));

  // Rows
  for (const issue of issues) {
    const row = [
      pad(issue.id, idWidth),
      pad(issue.type, typeWidth),
      pad(`P${issue.priority}`, prioWidth),
      pad(issue.status, statusWidth),
      truncate(issue.title, titleWidth),
    ].join(' │ ');
    lines.push(row);
  }

  lines.push('');
  lines.push(`Total: ${issues.length} issue(s)`);

  return lines.join('\n');
}

/**
 * Format dependency info for pretty display
 */
export function formatDepsPretty(
  issueId: string,
  blockedBy: Issue[],
  blocking: Issue[],
  related: Issue[] = []
): string {
  const lines: string[] = [];

  lines.push(`Dependencies for ${issueId}`);
  lines.push('─'.repeat(40));

  lines.push('');
  lines.push('Blocked by:');
  if (blockedBy.length === 0) {
    lines.push('  (none)');
  } else {
    for (const issue of blockedBy) {
      const status = issue.status === 'closed' ? '✓' : '○';
      lines.push(`  ${status} ${issue.id} - ${truncate(issue.title, 30)}`);
    }
  }

  lines.push('');
  lines.push('Blocking:');
  if (blocking.length === 0) {
    lines.push('  (none)');
  } else {
    for (const issue of blocking) {
      lines.push(`  ○ ${issue.id} - ${truncate(issue.title, 30)}`);
    }
  }

  lines.push('');
  lines.push('Related:');
  if (related.length === 0) {
    lines.push('  (none)');
  } else {
    for (const issue of related) {
      const status = issue.status === 'closed' ? '✓' : '○';
      lines.push(`  ${status} ${issue.id} - ${truncate(issue.title, 30)}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format an error for output
 */
export function formatError(error: Error | string): string {
  const message = error instanceof Error ? error.message : error;
  return JSON.stringify({ error: message });
}

/**
 * Format an error for pretty display
 */
export function formatErrorPretty(error: Error | string): string {
  const message = error instanceof Error ? error.message : error;
  return `Error: ${message}`;
}

/**
 * Extra info that can be included in mutation responses
 */
export interface MutationExtra {
  parentsReopened?: Array<{ id: string; title: string }>;
  blockersReopened?: Array<{ id: string; title: string }>;
}

/**
 * Output a mutation success response (minimal: id + success)
 */
export function outputMutationSuccess(id: string, pretty: boolean, extra?: MutationExtra): void {
  if (pretty) {
    const notes: string[] = [];
    if (extra?.parentsReopened?.length) {
      const ids = extra.parentsReopened.map(p => p.id).join(', ');
      notes.push(`reopened: ${ids}`);
    }
    if (extra?.blockersReopened?.length) {
      const ids = extra.blockersReopened.map(b => b.id).join(', ');
      notes.push(`blocker${extra.blockersReopened.length > 1 ? 's' : ''} ${ids} reopened`);
    }
    if (notes.length > 0) {
      console.log(`✓ ${id} (${notes.join(', ')})`);
    } else {
      console.log(`✓ ${id}`);
    }
  } else {
    const result: Record<string, unknown> = { id, success: true };
    if (extra?.parentsReopened?.length) {
      result._parentsReopened = extra.parentsReopened;
    }
    if (extra?.blockersReopened?.length) {
      result._blockersReopened = extra.blockersReopened;
    }
    console.log(JSON.stringify(result));
  }
}

/**
 * Output a list of issues in the requested format
 */
export function outputIssueList(issues: Issue[], pretty: boolean, limitInfo?: LimitInfo): void {
  if (pretty) {
    console.log(formatIssueListPretty(issues));
    if (limitInfo?.limited) {
      console.log(formatLimitMessage(limitInfo));
    }
  } else {
    // Only include _meta when results are actually limited
    if (limitInfo?.limited) {
      console.log(formatJson({ issues, _meta: limitInfo }));
    } else {
      console.log(formatJson(issues));
    }
  }
}

/**
 * Issue with nested children for tree output
 */
export interface IssueTreeNode {
  id: string;
  title: string;
  type: string;
  priority: number;
  status: string;
  createdAt: string;
  statusChangedAt?: string;
  childrenCount: number;
  children?: IssueTreeNode[];
}

/**
 * Build a tree structure from a flat list of issues
 */
export function buildIssueTree(issues: Issue[]): IssueTreeNode[] {
  const issueMap = new Map<string, Issue>();
  for (const issue of issues) {
    issueMap.set(issue.id, issue);
  }

  // Track which issues are children (have a parent in the list)
  const childIds = new Set<string>();
  for (const issue of issues) {
    if (issue.parent && issueMap.has(issue.parent)) {
      childIds.add(issue.id);
    }
  }

  // Build tree nodes recursively
  const buildNode = (issue: Issue): IssueTreeNode => {
    const children = issues
      .filter((i) => i.parent === issue.id)
      .map(buildNode);

    return {
      id: issue.id,
      title: issue.title,
      type: issue.type,
      priority: issue.priority,
      status: issue.status,
      createdAt: issue.createdAt,
      statusChangedAt: issue.statusChangedAt,
      childrenCount: children.length,
      ...(children.length > 0 && { children }),
    };
  };

  // Start with root issues (no parent or parent not in list)
  const roots = issues.filter((i) => !childIds.has(i.id));
  return roots.map(buildNode);
}

/**
 * Format issue tree as ASCII tree for pretty display
 */
export function formatIssueTreePretty(nodes: IssueTreeNode[], sectionHeader?: string): string {
  if (nodes.length === 0) {
    return 'No issues found.';
  }

  const lines: string[] = [];

  if (sectionHeader) {
    lines.push(`## ${sectionHeader}`);
    lines.push('');
  }

  const countAll = (node: IssueTreeNode): number => {
    const children = node.children ?? [];
    return 1 + children.reduce((sum, child) => sum + countAll(child), 0);
  };
  const totalCount = nodes.reduce((sum, node) => sum + countAll(node), 0);

  const formatNode = (node: IssueTreeNode, prefix: string, isLast: boolean, isRoot: boolean): void => {
    const connector = isRoot ? '' : isLast ? '└─ ' : '├─ ';
    const statusIcon = node.status === 'closed' ? '✓' : node.status === 'in_progress' ? '▶' : '○';
    const statusText = STATUS_LABELS[node.status as Status].toLowerCase();
    const relativeTime = node.statusChangedAt ? formatRelativeTime(node.statusChangedAt) : formatRelativeTime(node.createdAt);

    lines.push(`${prefix}${connector}${statusIcon} ${node.id}: ${node.title} [${node.type}] P${node.priority} ${statusText} ${relativeTime}`);

    const children = node.children ?? [];
    const childPrefix = isRoot ? '' : prefix + (isLast ? '   ' : '│  ');
    children.forEach((child, index) => {
      const childIsLast = index === children.length - 1;
      formatNode(child, childPrefix, childIsLast, false);
    });
  };

  nodes.forEach((node, index) => {
    formatNode(node, '', index === nodes.length - 1, true);
  });

  lines.push('');
  lines.push(`Total: ${totalCount} issue(s)`);

  return lines.join('\n');
}

/**
 * Output issues as a hierarchical tree
 */
export function outputIssueTree(issues: Issue[], pretty: boolean, sectionHeader?: string, limitInfo?: LimitInfo): void {
  const tree = buildIssueTree(issues);

  if (pretty) {
    console.log(formatIssueTreePretty(tree, sectionHeader));
    if (limitInfo?.limited) {
      console.log(formatLimitMessage(limitInfo));
    }
  } else {
    // Only include _meta when results are actually limited
    if (limitInfo?.limited) {
      console.log(formatJson({ issues: tree, _meta: limitInfo }));
    } else {
      console.log(formatJson(tree));
    }
  }
}

/**
 * Output an error in the requested format
 */
export function outputError(error: Error | string, pretty: boolean): void {
  if (pretty) {
    console.error(formatErrorPretty(error));
  } else {
    console.error(formatError(error));
  }
  process.exit(1);
}

/**
 * Extended issue info for verbose output
 */
export interface VerboseIssueInfo {
  issue: Issue;
  blocking: string[];
  children: number;
  blockers?: string[]; // For blocked command: open blockers
  ancestry: Array<{ id: string; title: string }>; // Full parent chain (parent → grandparent → root)
}

/**
 * Format a list of issues with verbose details
 */
export function formatIssueListVerbose(issues: VerboseIssueInfo[], sectionHeader?: string): string {
  if (issues.length === 0) {
    return 'No issues found.';
  }

  const lines: string[] = [];

  // Add section header if provided
  if (sectionHeader) {
    lines.push(`## ${sectionHeader} (${issues.length})`);
    lines.push('');
  }

  for (const info of issues) {
    const { issue, blocking, children, blockers, ancestry } = info;

    const statusTime = issue.statusChangedAt ? formatRelativeTime(issue.statusChangedAt) : formatRelativeTime(issue.createdAt);
    lines.push(`${issue.id}: ${issue.title}`);
    lines.push(`  Type: ${formatType(issue.type)} | Priority: P${issue.priority} | Status: ${formatStatus(issue.status)} (${statusTime})`);

    // Show ancestry chain if available (reversed: root > ... > parent)
    if (ancestry.length > 0) {
      const chain = [...ancestry].reverse().map(a => a.title).join(' → ');
      lines.push(`  Ancestry: ${chain}`);
    }

    // Show blocking/blockers if relevant
    if (blocking.length > 0) {
      lines.push(`  Blocking: ${blocking.join(', ')}`);
    }
    if (blockers && blockers.length > 0) {
      lines.push(`  Blocked by: ${blockers.join(', ')}`);
    }

    // Show children count for epics
    if (issue.type === 'epic' && children > 0) {
      lines.push(`  Children: ${children}`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Output a list of issues with verbose details
 */
export function outputIssueListVerbose(issues: VerboseIssueInfo[], pretty: boolean, sectionHeader?: string, limitInfo?: LimitInfo): void {
  if (pretty) {
    console.log(formatIssueListVerbose(issues, sectionHeader));
    if (limitInfo?.limited) {
      console.log(formatLimitMessage(limitInfo));
    }
  } else {
    // JSON output includes all fields
    const output = issues.map(({ issue, blocking, children, blockers, ancestry }) => ({
      ...issue,
      blocking,
      childrenCount: issue.type === 'epic' ? children : undefined,
      ...(blockers && { openBlockers: blockers }),
      ...(ancestry.length > 0 && { ancestry }),
    }));
    // Only include _meta when results are actually limited
    if (limitInfo?.limited) {
      console.log(formatJson({ issues: output, _meta: limitInfo }));
    } else {
      console.log(formatJson(output));
    }
  }
}
