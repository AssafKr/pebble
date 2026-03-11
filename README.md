# Pebble

Pebble is a lightweight local issue tracker for people who want fast CLI workflows without giving up a usable UI.

It stores everything in append-only JSONL, works well in git repos, and keeps the whole system easy to inspect, script, and version.

## Why people use it

Most issue trackers are great until you want something simpler:

- no hosted service
- no account setup
- no database to babysit
- no slow UI for everyday actions
- no hiding your data behind an API

Pebble gives you a local-first tracker that still feels like a real product, not just a pile of text files.

## What Pebble gives you

- local issue tracking with plain JSONL storage
- a fast CLI built for daily use
- a browser UI for browsing, editing, and visualizing work
- dependency tracking and ready queues
- parent/child issue structure for epics and tasks
- history that stays inspectable because events are append-only

## Install

Pebble requires Node 18+.

```bash
npm install -g @markmdev/pebble
```

After install, use the `pb` command.

## Quick start

Initialize a repo:

```bash
pb init
```

Create a few issues:

```bash
pb create "Set up auth flow" -t epic -p 1
pb create "Build login screen" --parent ISSUE-ID
pb create "Fix OAuth callback bug" -t bug -p 0
```

See what is ready to work on:

```bash
pb ready --pretty
```

Open the UI:

```bash
pb ui
```

## How it works

Pebble stores events in `.pebble/issues.jsonl`.

That means:

- issue history is append-only
- state can be rebuilt from the log
- the data format is easy to inspect and script
- there is no separate database layer to manage

Pebble also auto-discovers the nearest `.pebble/` directory as you move around a repo. In git worktrees, `--local` forces the current worktree's local `.pebble/` directory.

## Core workflow

### Create and organize work

- `pb create` — create tasks, bugs, or epics
- `pb update` — change title, description, priority, status, or parent
- `pb claim` — move work into `in_progress`
- `pb close` — close completed work
- `pb reopen` — reopen closed work

### Work from queues

- `pb ready` — issues with no open blockers
- `pb blocked` — issues waiting on other work
- `pb list` — filtered issue listing
- `pb summary` — epic summary with child completion status

### Model dependencies

- `pb dep add` — add a blocker
- `pb dep remove` — remove a blocker
- `pb dep list` — inspect dependencies
- `pb dep tree` — visualize blocker chains

### Track activity

- `pb comments add` — leave notes on issues
- `pb history` — inspect recent activity
- `pb search` — search titles, descriptions, and comments

### Manage data safely

- `pb delete` — soft delete issues
- `pb restore` — restore deleted issues
- `pb merge` — merge multiple issue logs
- `pb import` — import from older Beads issue files

## UI

`pb ui` starts a local React app for people who want a visual layer on top of the CLI.

The UI includes:

- issue lists with filtering and sorting
- issue editing
- comments and history
- dependency graph views
- parent/child navigation
- real-time updates from CLI changes

## Output style

Pebble is JSON-first by default, which makes it easy to script.

Use `--pretty` when you want human-readable terminal output:

```bash
pb list --pretty
pb ready --pretty
pb blocked --pretty
```

## Business rules worth knowing

- issues can be `open`, `in_progress`, `blocked`, or `closed`
- issue types are `task`, `bug`, and `epic`
- ready issues are issues with no open blockers
- closing an epic is blocked if any child is still open
- dependency cycles are rejected
- partial IDs work, so you usually do not need to type the full identifier

## Example commands

```bash
# Show current work
pb list --pretty

# Claim a task
pb claim ISSUE-ID

# Add a blocker
pb dep add ISSUE-B ISSUE-A

# Show what is blocked and why
pb blocked --pretty

# Show issue details
pb show ISSUE-ID
```

## Learn more

- [CLI Reference](docs/cli-reference.md)
- [CLI Examples](CLI_EXAMPLES.md)
- [CLI Spec](CLI_SPEC.md)

## License

MIT
