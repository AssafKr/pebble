import {execSync} from 'child_process';
import path from 'path';

/**
 * Check if current directory is inside a git worktree (not the main tree).
 * Returns false if not in a git repo or if already in the main tree.
 */
export function isGitWorktree(): boolean {
  try {
    // Get the path to the common git directory (shared across worktrees)
    const gitCommonDir = execSync('git rev-parse --git-common-dir', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    // Get the path to the current worktree's git directory
    const gitDir = execSync('git rev-parse --git-dir', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    // If they differ, we're in a linked worktree
    // Normalize paths for comparison
    const normalizedCommon = path.resolve(gitCommonDir);
    const normalizedGit = path.resolve(gitDir);

    return normalizedCommon !== normalizedGit;
  } catch {
    // Not in a git repository or git not installed
    return false;
  }
}

/**
 * Get the path to the main worktree's root directory.
 * Returns null if not in a git repo, already in main tree, or can't determine.
 */
export function getMainWorktreeRoot(): string | null {
  try {
    // Get the common git directory
    const gitCommonDir = execSync('git rev-parse --git-common-dir', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    // Get the current worktree's git directory
    const gitDir = execSync('git rev-parse --git-dir', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    // Normalize paths for comparison
    const normalizedCommon = path.resolve(gitCommonDir);
    const normalizedGit = path.resolve(gitDir);

    // If they're the same, we're already in the main tree
    if (normalizedCommon === normalizedGit) {
      return null;
    }

    // The main worktree root is the parent of the common git directory
    // For a typical repo, .git is in the root, so we go up one level
    // For worktrees, gitCommonDir is the main repo's .git directory
    const mainRoot = path.dirname(normalizedCommon);

    return mainRoot;
  } catch {
    // Not in a git repository or git not installed
    return null;
  }
}

/**
 * Get the folder name of the current worktree/repo root.
 * Used to record which worktree a command was executed from.
 * Returns null if not in a git repo.
 */
export function getCurrentWorktreeName(): string | null {
  try {
    // Get the current worktree/repo root (works for both main tree and worktrees)
    const toplevel = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    return path.basename(toplevel);
  } catch {
    // Not in a git repository or git not installed
    return null;
  }
}
