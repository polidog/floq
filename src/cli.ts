import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { App } from './ui/App.js';
import { addTask } from './commands/add.js';
import { listTasks, listProjects } from './commands/list.js';
import { moveTask } from './commands/move.js';
import { markDone } from './commands/done.js';
import {
  addProject,
  listProjectsCommand,
  showProject,
  completeProject,
} from './commands/project.js';
import { showConfig, setLanguage, setDbPath, resetDbPath, setTheme, selectTheme, showViewMode, setViewModeCommand, selectMode, setTurso, disableTurso, syncCommand, resetDatabase, setSplashCommand, showSplash } from './commands/config.js';
import { addComment, listComments } from './commands/comment.js';
import { listContexts, addContextCommand, removeContextCommand } from './commands/context.js';
import { runSetupWizard } from './commands/setup.js';
import { VERSION } from './version.js';

const program = new Command();

program
  .name('floq')
  .description('Floq - Flow your tasks, clear your mind')
  .version(VERSION);

// Default command - launch TUI
program
  .action(() => {
    render(React.createElement(App));
  });

// Add task
program
  .command('add <title>')
  .description('Add a new task to Inbox')
  .option('-p, --project <name>', 'Add to a specific project')
  .option('-d, --description <text>', 'Add a description')
  .option('-c, --context <context>', 'Set context (e.g., work, home)')
  .action(async (title: string, options) => {
    await addTask(title, options);
  });

// List tasks
program
  .command('list [status]')
  .description('List tasks (inbox, next, waiting, someday, done, projects, all)')
  .action(async (status?: string) => {
    if (status === 'projects') {
      await listProjects();
    } else {
      await listTasks(status);
    }
  });

// Move task
program
  .command('move <id> <status> [waitingFor]')
  .description('Move a task to another list (inbox, next, waiting, someday)')
  .action(async (id: string, status: string, waitingFor?: string) => {
    await moveTask(id, status, waitingFor);
  });

// Mark task as done
program
  .command('done <id>')
  .description('Mark a task as done')
  .action(async (id: string) => {
    await markDone(id);
  });

// Project commands
const projectCmd = program
  .command('project')
  .description('Project management commands');

projectCmd
  .command('add <name>')
  .description('Create a new project')
  .option('-d, --description <text>', 'Add a description')
  .action(async (name: string, options) => {
    await addProject(name, options);
  });

projectCmd
  .command('list')
  .description('List all projects')
  .action(async () => {
    await listProjectsCommand();
  });

projectCmd
  .command('show <id>')
  .description('Show project details and tasks')
  .action(async (id: string) => {
    await showProject(id);
  });

projectCmd
  .command('complete <id>')
  .description('Mark a project as completed')
  .action(async (id: string) => {
    await completeProject(id);
  });

// Config commands
const configCmd = program
  .command('config')
  .description('Configuration commands');

configCmd
  .command('show')
  .description('Show current configuration')
  .action(async () => {
    await showConfig();
  });

configCmd
  .command('lang <locale>')
  .description('Set language (en, ja)')
  .action(async (locale: string) => {
    await setLanguage(locale);
  });

configCmd
  .command('db [path]')
  .description('Set database path (omit path to reset to default)')
  .action(async (path?: string) => {
    if (path) {
      await setDbPath(path);
    } else {
      await resetDbPath();
    }
  });

configCmd
  .command('theme [name]')
  .description('Set UI theme (interactive if no name provided)')
  .action(async (name?: string) => {
    if (name) {
      await setTheme(name);
    } else {
      await selectTheme();
    }
  });

configCmd
  .command('mode [mode]')
  .description('Set view mode (gtd, kanban) or select interactively')
  .action(async (mode?: string) => {
    if (mode) {
      await setViewModeCommand(mode);
    } else {
      await selectMode();
    }
  });

configCmd
  .command('turso')
  .description('Configure Turso cloud sync')
  .option('--url <url>', 'Turso database URL (libsql://xxx.turso.io)')
  .option('--token <token>', 'Turso auth token')
  .option('--disable', 'Disable Turso sync')
  .action(async (options: { url?: string; token?: string; disable?: boolean }) => {
    if (options.disable) {
      await disableTurso();
    } else if (options.url && options.token) {
      await setTurso(options.url, options.token);
    } else {
      console.error('Usage: floq config turso --url <url> --token <token>');
      console.error('       floq config turso --disable');
      process.exit(1);
    }
  });

configCmd
  .command('splash [duration]')
  .description('Set splash screen duration (ms, off=disable, key=wait for key)')
  .action(async (duration?: string) => {
    if (duration !== undefined) {
      await setSplashCommand(duration);
    } else {
      await showSplash();
    }
  });

// Sync command
program
  .command('sync')
  .description('Sync with Turso cloud')
  .action(async () => {
    await syncCommand();
  });

// Database commands
const dbCmd = program
  .command('db')
  .description('Database management commands');

dbCmd
  .command('reset')
  .description('Reset the database (delete all data)')
  .option('-f, --force', 'Skip confirmation')
  .action(async (options: { force?: boolean }) => {
    await resetDatabase(options.force ?? false);
  });

// Comment command
program
  .command('comment <taskId> [content]')
  .description('Add or list comments for a task')
  .action(async (taskId: string, content?: string) => {
    if (content) {
      await addComment(taskId, content);
    } else {
      await listComments(taskId);
    }
  });

// Context commands
const contextCmd = program
  .command('context')
  .description('Context management commands');

contextCmd
  .command('list')
  .description('List available contexts')
  .action(async () => {
    await listContexts();
  });

contextCmd
  .command('add <name>')
  .description('Add a new context')
  .action(async (name: string) => {
    await addContextCommand(name);
  });

contextCmd
  .command('remove <name>')
  .description('Remove a context')
  .action(async (name: string) => {
    await removeContextCommand(name);
  });

// Setup wizard command
program
  .command('setup')
  .description('Run the setup wizard')
  .action(async () => {
    await runSetupWizard();
  });

export { program };
