# Pebble CLI Reference

Complete command reference for the pebble issue tracker CLI.

## Global Options

| Option | Description |
|--------|-------------|
| `--pretty` | Format output as human-readable table (default: JSON) |
| `--local` | Use local .pebble directory even in a git worktree |
| `-h, --help` | Display help for a command |

## Commands

### init

Initialize a new .pebble directory in the current directory.

```bash
pb init [--force]
```

| Option | Description |
|--------|-------------|
| `--force` | Re-initialize even if .pebble already exists |

### create

Create a new issue.

```bash
pb create <title> [options]
```

| Option | Description |
|--------|-------------|
| `-t, --type <type>` | Issue type: task, bug, epic (default: task) |
| `-p, --priority <n>` | Priority: 0 (critical) to 4 (backlog) (default: 2) |
| `-d, --description <text>` | Issue description |
| `--parent <id>` | Parent issue ID |
| `--blocked-by <ids>` | Comma-separated IDs of blocking issues |
| `--blocks <ids>` | Comma-separated IDs this issue will block |

### update

Update an existing issue.

```bash
pb update <id> [options]
```

| Option | Description |
|--------|-------------|
| `--title <text>` | New title |
| `-p, --priority <n>` | New priority (0-4) |
| `-s, --status <status>` | New status: open, in_progress, blocked |
| `-d, --description <text>` | New description |
| `--parent <id>` | Parent issue ID (use "null" to remove) |

**Notes:**
- Cannot set status to `in_progress` if the issue has open blockers
- Cannot set status to `closed` via update (use `pb close` instead)

### close

Close one or more issues.

```bash
pb close <id...> [options]
```

| Option | Description |
|--------|-------------|
| `-r, --reason <text>` | Reason for closing |
| `-c, --comment <text>` | Add comment before closing |

### reopen

Reopen a closed issue.

```bash
pb reopen <id> [options]
```

| Option | Description |
|--------|-------------|
| `-r, --reason <text>` | Reason for reopening |

### delete

Soft delete one or more issues.

```bash
pb delete <id...> [options]
```

| Option | Description |
|--------|-------------|
| `-r, --reason <text>` | Reason for deleting |

**Notes:**
- Deleted issues remain in history but are hidden by default
- Deleting an epic cascades to all children
- References in other issues (blockedBy, relatedTo, parent) are cleaned up
- Use `pb list` with "Show deleted" toggle in UI to see deleted issues

### restore

Restore one or more deleted issues.

```bash
pb restore <id...> [options]
```

| Option | Description |
|--------|-------------|
| `-r, --reason <text>` | Reason for restoring |

**Notes:**
- Restoring does NOT auto-restore children — each issue must be restored individually

### claim

Claim an issue (shorthand for setting status to in_progress).

```bash
pb claim <id...>
```

**Notes:**
- Cannot claim a closed issue
- Cannot claim an issue with open blockers (use `pb blocked -v` to see why)

### list

List issues with filters.

```bash
pb list [options]
```

| Option | Description |
|--------|-------------|
| `-t, --type <type>` | Filter by type |
| `-s, --status <status>` | Filter by status |
| `-p, --priority <n>` | Filter by priority |
| `--parent <id>` | Filter by parent issue |
| `-v, --verbose` | Show expanded details (flat list with parent, blocking) |
| `--flat` | Show flat list instead of hierarchical tree |

**Default output (tree):**
- Hierarchical structure with children nested under parent issues
- Status icons: ✓ closed, ▶ in_progress, ○ open
- JSON uses nested `children` arrays

**Verbose output (`-v`):**
- Flat list with expanded details
- Full issue title, type, priority, timestamps
- Parent epic with title (if set)

### show

Show details of a specific issue.

```bash
pb show <id>
```

### ready

Show issues ready for work (no open blockers).

```bash
pb ready [options]
```

| Option | Description |
|--------|-------------|
| `-v, --verbose` | Show expanded details (parent, children, blocking) |

**Verbose output includes:**
- Section header: `## Ready Issues (N)`
- Full title (no truncation)
- Type, priority, and relative timestamps
- Parent epic with title (if set)

### blocked

Show blocked issues (have open blockers).

```bash
pb blocked [options]
```

| Option | Description |
|--------|-------------|
| `-v, --verbose` | Show expanded details including WHY each issue is blocked |

### dep

Manage issue dependencies.

```bash
pb dep <command> <id> [id2] [options]
```

**Subcommands:**

| Command | Description |
|---------|-------------|
| `add <id> <blockerId>` | Add a blocking dependency (id is blocked by blockerId) |
| `remove <id> <blockerId>` | Remove a blocking dependency |
| `relate <id1> <id2>` | Add a bidirectional related link between two issues |
| `unrelate <id1> <id2>` | Remove a bidirectional related link |
| `list <id>` | List dependencies of an issue (shows blockedBy, blocking, and related) |
| `tree <id>` | Visualize dependency tree (shows blockers recursively) |

**Related vs Blocked:**
- **Blocking dependencies** are directional and affect the ready queue. If A blocks B, then B is blocked until A is closed.
- **Related links** are bidirectional and don't affect ready status. They're for noting relationships between issues without implying order.

### comments

Manage issue comments.

```bash
pb comments <command> <id> [text]
```

**Subcommands:**

| Command | Description |
|---------|-------------|
| `add <id> <text>` | Add a comment to an issue |
| `list <id>` | List all comments on an issue |

### graph

Display ASCII dependency graph.

```bash
pb graph [options]
```

| Option | Description |
|--------|-------------|
| `--root <id>` | Filter to subtree rooted at specific issue |

### summary

Show epic summary with child completion counts.

```bash
pb summary [options]
```

| Option | Description |
|--------|-------------|
| `--status <status>` | Filter epics by status |
| `--limit <n>` | Max epics to return (default: 10) |
| `--include-closed` | Include closed epics (shows "Recently Closed Epics" section) |

**Pretty output includes:**
- Section headers: `## Open Epics (N)` or `## Recently Closed Epics (N)`
- Full description (no truncation)
- Relative timestamps: Created and Updated
- Issue counts: `Issues: X/Y done`
- Command hint: `Run \`pb list --parent ID\` to see all issues.`

### history

Show recent activity log.

```bash
pb history [options]
```

| Option | Description |
|--------|-------------|
| `-n, --limit <n>` | Number of events to show (default: 20) |

### search

Full-text search across issues.

```bash
pb search <query>
```

### import

Import issues from a Beads JSONL file.

```bash
pb import <file>
```

### merge

Merge multiple issues.jsonl files.

```bash
pb merge <files...> [options]
```

| Option | Description |
|--------|-------------|
| `-o, --output <file>` | Output file (default: stdout) |

### ui

Start the web UI server.

```bash
pb ui [options]
```

| Option | Description |
|--------|-------------|
| `-p, --port <n>` | Port number (default: 3333, env: PEBBLE_UI_PORT) |

## Valid Values

### Types

| Type | Description |
|------|-------------|
| `task` | A single unit of work |
| `bug` | A defect to fix |
| `epic` | A container for related issues |

### Statuses

| Status | Description |
|--------|-------------|
| `open` | Not started |
| `in_progress` | Currently being worked on |
| `blocked` | Waiting on dependencies |
| `closed` | Completed |

### Priorities

| Priority | Label |
|----------|-------|
| 0 | Critical |
| 1 | High |
| 2 | Medium |
| 3 | Low |
| 4 | Backlog |

## Examples

```bash
# Initialize a new project
pb init

# Create an epic
pb create "User Authentication" -t epic -p 1

# Create tasks under the epic
pb create "Login form" -t task --parent BEAD-abc123
pb create "Session management" -t task --parent BEAD-abc123 --blocked-by BEAD-def456

# Check what's ready to work on
pb ready -v

# Claim and work on an issue
pb claim BEAD-abc123
pb comments add BEAD-abc123 "Started implementation"

# Close with comment
pb close BEAD-abc123 -c "Implemented login form in src/auth/login.tsx"

# Link related issues (bidirectional, non-blocking)
pb dep relate BEAD-abc123 BEAD-def456

# View dependencies
pb dep list BEAD-abc123

# View dependency graph
pb graph --root BEAD-abc123

# Start the web UI
pb ui --port 3000
```

## Git Worktree Support

When running in a git worktree, Pebble automatically uses the main tree's `.pebble` directory by default. This enables sharing issues across worktrees.

### Configuration

Set `useMainTreePebble` in `.pebble/config.json`:

```json
{
  "prefix": "PROJ",
  "version": "0.1.0",
  "useMainTreePebble": true
}
```

- `true` (default): Use main tree's `.pebble` when in a worktree
- `false`: Always use local `.pebble` in each worktree

### Override with --local

Force local `.pebble` usage with the `--local` global flag:

```bash
pb --local create "Worktree-specific issue"
```

## Verbose Output

Commands with `-v, --verbose` show the full ancestry chain using titles:

```
BEAD-task1: Implement feature
  Type: Task | Priority: P2 | Created: 2 hours ago
  Ancestry: Root Epic → Parent Task
```

## Event Source Tracking

Every event records the git worktree/repository folder name where the command was executed. This enables tracking which worktree actions were taken from.

### How It Works

- **Source field**: All events in `issues.jsonl` include a `source` field with the worktree/repo folder name
- **Last source**: Issues track `lastSource` — the source from their most recent event
- **Detection**: Uses `git rev-parse --show-toplevel` to find the git root, then extracts the folder name

### Viewing Source

- **UI**: The issue list and detail views show the `lastSource` for each issue
- **History/Comments**: Each event shows which worktree it came from
- **JSON output**: The `lastSource` field appears in issue JSON

### Example

When working in a worktree called `feature-branch`:

```bash
pb create "New feature" -t task
```

The event is recorded with `"source": "feature-branch"`, and the issue's `lastSource` becomes `"feature-branch"`.
