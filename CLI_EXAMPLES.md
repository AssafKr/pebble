# Pebble CLI Examples

Example commands and output for the Pebble issue tracker.

## pb list

### Default (tree, pretty)

```bash
pb list --pretty
```

```
## Issues

✓ BEAD-kwh0aw: Status dropdown missing options in UI [bug] P2 closed 1 day ago
✓ BEAD-mzass0: Related Issues UI section missing in IssueDetail.tsx [bug] P2 closed 1 day ago
○ BEAD-pe3dk1: README.md mentions removed Graph UI feature [bug] P3 open 1 day ago
○ BEAD-tnxde1: pb init ignores --pretty flag [bug] P3 open 1 day ago
✓ BEAD-32vlvy: CLI & UI Improvements Batch [epic] P1 closed 1 day ago
├─ ✓ BEAD-surxek: Create CLI reference documentation [task] P3 closed 1 day ago
├─ ✓ BEAD-u28r7o: Remove graph tab from UI [task] P3 closed 1 day ago
├─ ✓ BEAD-7wzlwx: History improvements: parent chain, type, priority [task] P3 closed 1 day ago
└─ ✓ BEAD-ocb3h4: Fix merge duplicates bug [bug] P2 closed 1 day ago

Total: 9 issue(s)
```

### JSON output

```bash
pb list --limit 3
```

```json
{
  "issues": [
    {
      "id": "BEAD-kwh0aw",
      "title": "Status dropdown missing options in UI",
      "type": "bug",
      "priority": 2,
      "status": "closed",
      "createdAt": "2026-01-17T15:05:54.900Z",
      "childrenCount": 0,
      "lastSource": "beads-lite"
    },
    {
      "id": "BEAD-mzass0",
      "title": "Related Issues UI section missing in IssueDetail.tsx",
      "type": "bug",
      "priority": 2,
      "status": "closed",
      "createdAt": "2026-01-17T15:05:46.311Z",
      "childrenCount": 0,
      "lastSource": "feature-branch"
    },
    {
      "id": "BEAD-9g3tk3",
      "title": "Create CLI reference documentation",
      "type": "task",
      "priority": 2,
      "status": "closed",
      "createdAt": "2026-01-17T07:55:48.359Z",
      "childrenCount": 0,
      "lastSource": "beads-lite"
    }
  ],
  "_meta": {
    "total": 90,
    "shown": 3,
    "limited": true
  }
}
```

### Verbose output

```bash
pb list -v --pretty
```

```
## Issues (90)

BEAD-kwh0aw: Status dropdown missing options in UI
  Type: Bug | Priority: P2 | Created: 1 day ago

BEAD-mzass0: Related Issues UI section missing in IssueDetail.tsx
  Type: Bug | Priority: P2 | Created: 1 day ago

BEAD-gwqly0: Multi-worktree: CLI --files option
  Type: Task | Priority: P2 | Created: 5 days ago
  Ancestry: Multi-Worktree Support → CLI --files option parent
  Blocking: BEAD-9qf0c5

---
Showing 30 of 90 issues. Use --all or --limit <n> to see more.
```

The `Ancestry` field shows the full parent chain from root to immediate parent, using titles.

### With limit flag

```bash
pb list --limit 5 --pretty
```

```
## Issues

✓ BEAD-kwh0aw: Status dropdown missing options [bug] P2 closed 1 day ago
✓ BEAD-mzass0: Related Issues UI section missing [bug] P2 closed 1 day ago
✓ BEAD-9g3tk3: Create CLI reference documentation [task] P2 closed 1 day ago
✓ BEAD-1sl9m9: Fix --parent null not clearing parent [bug] P1 closed 1 day ago
○ BEAD-pe3dk1: README.md mentions removed Graph UI feature [bug] P3 open 1 day ago

Total: 5 issue(s)

---
Showing 5 of 90 issues. Use --all or --limit <n> to see more.
```

## pb ready

### Default output (table)

```bash
pb ready --pretty
```

```
ID           │ Type   │ Pri  │ Status       │ Title
──────────────────────────────────────────────────────────────────────────────────────
BEAD-tnxde1  │ bug    │ P3   │ open         │ pb init ignores --pretty flag
BEAD-pe3dk1  │ bug    │ P3   │ open         │ README.md mentions removed Graph UI f...

Total: 2 issue(s)
```

### Verbose output

```bash
pb ready -v --pretty
```

```
## Ready Issues (2)

BEAD-pe3dk1: README.md mentions removed Graph UI feature
  Type: Bug | Priority: P3 | Created: 1 day ago
  Ancestry: CLI & UI Improvements Batch

BEAD-tnxde1: pb init ignores --pretty flag
  Type: Bug | Priority: P3 | Created: 1 day ago
```

## pb blocked

### Verbose output (shows WHY blocked)

```bash
pb blocked -v --pretty
```

```
## Blocked Issues (3)

BEAD-ghi789: Session management
  Type: Task | Priority: P2 | Created: 12 hours ago
  Ancestry: Implement authentication
  Blocked by: BEAD-def456

BEAD-pqr678: Deploy to production
  Type: Task | Priority: P1 | Created: 2 days ago
  Ancestry: Deployment Epic → Release Preparation
  Blocked by: BEAD-ghi789, BEAD-mno345
```

## pb dep add

### Using --needs flag

```bash
pb dep add BEAD-feature --needs BEAD-prereq --pretty
```

```
✓ BEAD-feature
```

This means: BEAD-feature is blocked by BEAD-prereq (feature needs prereq to be done first).

### Using --blocks flag

```bash
pb dep add BEAD-prereq --blocks BEAD-feature --pretty
```

```
✓ BEAD-feature
```

This means: BEAD-feature is blocked by BEAD-prereq (prereq blocks feature). Same result as above, but read from the blocker's perspective.

## pb dep tree

### Show full hierarchy

```bash
pb dep tree BEAD-32vlvy --pretty
```

```
✓ BEAD-32vlvy: CLI & UI Improvements Batch [epic] P1 ◀
├─ ✓ BEAD-ocb3h4: Fix merge duplicates bug [bug] P2
├─ ✓ BEAD-vr58vy: Add pb init command [task] P2
├─ ✓ BEAD-bf0bt1: Add --parent to pb update [task] P2
├─ ✓ BEAD-as2w5k: Add dependencies to pb create [task] P2
├─ ✓ BEAD-du79ja: Improve pb ready output [task] P2
├─ ✓ BEAD-fd14ov: Improve pb blocked output [task] P2
├─ ✓ BEAD-rxfwi2: ESC closes SourceManager modal [bug] P2
├─ ✓ BEAD-011a62: Search includes epic children [bug] P2
├─ ✓ BEAD-ml42cf: Issue nesting improvements [task] P2
├─ ✓ BEAD-irks0s: Visual distinction for closed issues [task] P3
├─ ✓ BEAD-7wzlwx: History improvements: parent chain, type, priority [task] P3
├─ ✓ BEAD-u28r7o: Remove graph tab from UI [task] P3
└─ ✓ BEAD-surxek: Create CLI reference documentation [task] P3
```

The `◀` marker indicates the requested issue.

## pb summary

### Default (open + recently closed)

```bash
pb summary --pretty
```

```
## Open Epics (1)

BEAD-abc123: Implement authentication
  Created: 2 days ago | Updated: 1 hour ago
  Issues: 1/3 done

  Build user authentication system with login, logout, and session management.

  Run `pb list --parent BEAD-abc123` to see all issues.

## Recently Closed Epics (last 72h) (1)

BEAD-32vlvy: CLI & UI Improvements Batch
  Created: 1 day ago | Updated: 1 day ago
  Issues: 13/13 done

  ## Purpose
Comprehensive batch of CLI and UI improvements...

  Run `pb list --parent BEAD-32vlvy` to see all issues.
```

### Filter by status

```bash
pb summary --status closed --pretty
```

Shows only closed epics (all time, not just 72h).

## pb show

### Detailed issue view

```bash
pb show BEAD-32vlvy --pretty
```

```
BEAD-32vlvy - CLI & UI Improvements Batch
────────────────────────────────────────────────────────────
Type:     Epic
Priority: P1 (high)
Status:   Closed
Ancestry: Root Epic

Description:
## Purpose
Comprehensive batch of CLI and UI improvements covering bugs, enhancements, cleanup, and documentation.

## Scope
15 items organized into 6 phases:
- Phase 1: CLI Bugs & Missing Features (merge duplicates, pb init, pb update --parent)
- Phase 2: CLI Enhancements (pb create deps, pb ready/blocked verbose)
...

Children (13/13 done):
  ✓ BEAD-ocb3h4 - Fix merge duplicates bug [closed]
  ✓ BEAD-vr58vy - Add pb init command [closed]
  ✓ BEAD-bf0bt1 - Add --parent to pb update [closed]
  ✓ BEAD-as2w5k - Add dependencies to pb create [closed]
  ...

Comments:
  [1/16/2026, 11:48:03 PM] unknown: All 13 tasks completed:
- Phase 1-2: CLI bugs/enhancements...

Created: 1/16/2026, 11:29:47 PM
Updated: 1/16/2026, 11:48:03 PM
```

## pb delete

### Delete a single issue

```bash
pb delete BEAD-abc123 --pretty
```

```
🗑️  BEAD-abc123 deleted
```

### Delete an epic (cascades to children)

```bash
pb delete BEAD-epic --pretty
```

```
🗑️  BEAD-epic deleted
  └─ BEAD-child1 deleted (cascade)
  └─ BEAD-child2 deleted (cascade)
```

### JSON output

```bash
pb delete BEAD-epic
```

```json
{
  "deleted": [
    { "id": "BEAD-epic", "cascade": false },
    { "id": "BEAD-child1", "cascade": true },
    { "id": "BEAD-child2", "cascade": true }
  ]
}
```

## pb restore

### Restore a deleted issue

```bash
pb restore BEAD-abc123 --pretty
```

```
↩️  BEAD-abc123 restored
```

### JSON output

```bash
pb restore BEAD-abc123
```

```json
{
  "id": "BEAD-abc123",
  "success": true
}
```

## JSON Output with Limit Metadata

When results are actually limited (more items exist than shown), JSON output includes `_meta`:

```bash
pb list --limit 3
```

```json
{
  "issues": [...],
  "_meta": {
    "total": 90,
    "shown": 3,
    "limited": true
  }
}
```

When results fit within the limit (or using `--all`), output is a plain array:

```bash
pb list --all
# or when total items < limit
pb ready
```

```json
[
  {
    "id": "BEAD-tnxde1",
    "title": "pb init ignores --pretty flag",
    "type": "bug",
    "priority": 3,
    "status": "open",
    "description": "...",
    "blockedBy": [],
    "relatedTo": [],
    "comments": [],
    "createdAt": "2026-01-17T07:52:12.401Z",
    "updatedAt": "2026-01-17T07:52:12.401Z",
    "lastSource": "beads-lite"
  },
  {...}
]
```

The `lastSource` field shows the worktree/folder name where the issue was most recently modified.

## Git Worktree Support

### Using pebble in a worktree

When running in a git worktree, Pebble automatically uses the main tree's `.pebble` directory:

```bash
# In main worktree
cd /path/to/main
pb create "Main issue"  # Creates in /path/to/main/.pebble

# In linked worktree
cd /path/to/worktree
pb create "Another issue"  # Still writes to /path/to/main/.pebble
pb list  # Shows all issues from main tree
```

### Force local .pebble

Use `--local` to force local `.pebble` directory usage:

```bash
cd /path/to/worktree
pb --local create "Worktree-specific issue"  # Creates local .pebble
pb --local list  # Shows only local worktree issues
```

### Disable worktree behavior

Set `useMainTreePebble: false` in `.pebble/config.json` to disable:

```json
{
  "prefix": "PROJ",
  "version": "0.1.0",
  "useMainTreePebble": false
}
```
