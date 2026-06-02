#!/usr/bin/env node

import {Command} from 'commander';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';
import {createCommand} from './commands/create.js';
import {updateCommand} from './commands/update.js';
import {closeCommand} from './commands/close.js';
import {reopenCommand} from './commands/reopen.js';
import {deleteCommand} from './commands/delete.js';
import {restoreCommand} from './commands/restore.js';
import {claimCommand} from './commands/claim.js';
import {listCommand} from './commands/list.js';
import {showCommand} from './commands/show.js';
import {readyCommand} from './commands/ready.js';
import {blockedCommand} from './commands/blocked.js';
import {depCommand} from './commands/dep.js';
import {commentsCommand} from './commands/comments.js';
import {graphCommand} from './commands/graph.js';
import {uiCommand} from './commands/ui.js';
import {importCommand} from './commands/import.js';
import {mergeCommand} from './commands/merge.js';
import {summaryCommand} from './commands/summary.js';
import {historyCommand} from './commands/history.js';
import {searchCommand} from './commands/search.js';
import {initCommand} from './commands/init.js';

// Read version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));

const program = new Command();

program
  .name('pebble')
  .description('A lightweight JSONL-based issue tracker')
  .version(packageJson.version)
  .addHelpText('after', '\nAll commands accept partial IDs (e.g., "abc" matches "PROJ-abc123")');

// Global options
program.option('-P, --pretty', 'Human-readable output (default: JSON)');
program.option('--json', 'JSON output (this is the default, flag not needed)');
program.option('--local', 'Use local .pebble directory even in a git worktree');

// Handle --local flag by setting environment variable before commands run
program.hook('preAction', () => {
  if (program.opts().local) {
    process.env.PEBBLE_LOCAL = '1';
  }
});

// Register all commands
createCommand(program);
updateCommand(program);
closeCommand(program);
reopenCommand(program);
deleteCommand(program);
restoreCommand(program);
claimCommand(program);
listCommand(program);
showCommand(program);
readyCommand(program);
blockedCommand(program);
depCommand(program);
commentsCommand(program);
graphCommand(program);
uiCommand(program);
importCommand(program);
mergeCommand(program);
summaryCommand(program);
historyCommand(program);
searchCommand(program);
initCommand(program);

program.parse();
