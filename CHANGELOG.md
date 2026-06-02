# Changelog

## [0.2.0] - 2026-02-23

### Removed

- **Verification system**: Removed `verification` issue type, `pending_verification` status, `verifies` field, `pb verifications` command, and all associated logic. Issues now have 4 statuses (open, in_progress, blocked, closed) and 3 types (task, bug, epic).
- **Dead output functions**: Removed 6 unused exported functions from output.ts (~100 lines).
- **Dead UI code**: Removed `partitionByClosedStatus`, `pending` badge variant, `--status-pending` CSS variable.

### Changed

- **Close command simplified**: Close always sets status to `closed`. No more pending_verification intermediate state or auto-close cascading of verification issues.
- **CLI help improved**: `pb create --help` shows auto-reopen behavior and partial ID support. `pb dep add --help` shows "B is blocked by A" semantics with examples.

### Fixed

- **No-op useMemo**: `parentCandidates` in App.tsx simplified from identity useMemo to direct assignment.
- **Stale useMemo dependency**: Removed unused `sourcePathPrefix` from IssueList columns dependency array.

## [0.1.24] - 2026-02-22

### Added

- **Cascade reopen**: Creating a child under a closed parent auto-reopens the entire ancestor chain. Works in CLI (`pb create --parent`), `pb update --parent`, and UI.

## [0.1.23] - 2026-02-22

### Changed

- **UI redesign**: Soft/organic visual overhaul — foundation colors, primitives, app shell. Dark mode support with CSS variables.

## [0.1.22] - 2026-02-22

### Added

- **Cascade claim**: Claiming a child issue auto-sets open parent issues to in_progress.
