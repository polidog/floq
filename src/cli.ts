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
import { showConfig, setLanguage, setDbPath, resetDbPath, setTheme, selectTheme, setTurso, disableTurso, syncCommand } from './commands/config.js';
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

// Sync command
program
  .command('sync')
  .description('Sync with Turso cloud')
  .action(async () => {
    await syncCommand();
  });

export { program };
