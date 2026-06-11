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
  deleteProjectCommand,
} from './commands/project.js';
import { showConfig, setLanguage, setDbPath, resetDbPath, setTheme, selectTheme, showViewMode, setViewModeCommand, selectMode, setTurso, disableTurso, enableTurso, clearTurso, showTursoQr, syncCommand, resetDatabase, setSplashCommand, showSplash, showDateFormatCommand, setDateFormatCommand } from './commands/config.js';
import { addComment, listComments } from './commands/comment.js';
import { listContexts, addContextCommand, removeContextCommand } from './commands/context.js';
import { showInsights } from './commands/insights.js';
import { runSetupWizard } from './commands/setup.js';
import { addCalendar, removeCalendar, showCalendar, syncCalendar, enableCalendar, disableCalendar, configOAuthClient, loginCalendar, logoutCalendar, selectCalendar, listCalendarSourcesCommand } from './commands/calendar.js';
import { showSchedule } from './commands/schedule.js';
import { VERSION } from './version.js';

const program = new Command();

program
  .name('floq')
  .description('Floq - Flow your tasks, clear your mind')
  .version(VERSION);

// Default command - launch TUI
program
  .action(() => {
    // Enter alternate screen buffer (like btop/vim)
    process.stdout.write('\x1b[?1049h');
    process.stdout.write('\x1b[H'); // Move cursor to top-left

    const { waitUntilExit } = render(React.createElement(App));

    waitUntilExit().then(() => {
      // Leave alternate screen buffer
      process.stdout.write('\x1b[?1049l');
    });
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

projectCmd
  .command('delete <id>')
  .alias('rm')
  .description('Delete a project (prompts how to handle its tasks)')
  .option('--with-tasks', 'Delete the project together with all its tasks')
  .option('--keep-tasks', 'Delete the project but move its tasks to Inbox')
  .option('-f, --force', 'Skip confirmation prompts')
  .action(async (id: string, options: { withTasks?: boolean; keepTasks?: boolean; force?: boolean }) => {
    await deleteProjectCommand(id, options);
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
  .option('--disable', 'Temporarily disable Turso sync (preserves config)')
  .option('--enable', 'Re-enable Turso sync')
  .option('--clear', 'Remove Turso configuration completely')
  .option('--qr', 'Display Turso config as QR code')
  .action(async (options: { url?: string; token?: string; disable?: boolean; enable?: boolean; clear?: boolean; qr?: boolean }) => {
    if (options.qr) {
      await showTursoQr();
    } else if (options.clear) {
      await clearTurso();
    } else if (options.disable) {
      await disableTurso();
    } else if (options.enable) {
      await enableTurso();
    } else if (options.url && options.token) {
      await setTurso(options.url, options.token);
    } else {
      console.error('Usage: floq config turso --url <url> --token <token>');
      console.error('       floq config turso --disable  (temporarily disable, keeps config)');
      console.error('       floq config turso --enable   (re-enable)');
      console.error('       floq config turso --clear    (remove config completely)');
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

configCmd
  .command('dateformat [format]')
  .description('Set date format for clock (auto, "ddd, MMM D", "MM/DD(ddd)", etc.)')
  .action(async (format?: string) => {
    if (format !== undefined) {
      await setDateFormatCommand(format);
    } else {
      await showDateFormatCommand();
    }
  });

configCmd
  .command('insights-weeks [weeks]')
  .description('Set number of weeks for insights (default: 2)')
  .action(async (weeks?: string) => {
    const { getInsightsWeeks, setInsightsWeeks } = await import('./config.js');
    if (weeks !== undefined) {
      const n = parseInt(weeks, 10);
      if (isNaN(n) || n < 1) {
        console.error('Weeks must be a positive integer');
        process.exit(1);
      }
      setInsightsWeeks(n);
      console.log(`Insights weeks set to ${n}`);
    } else {
      console.log(`Insights weeks: ${getInsightsWeeks()}`);
    }
  });

configCmd
  .command('pomodoro')
  .description('Configure pomodoro settings')
  .option('--focus <on|off>', 'Enable/disable focus mode (hide other tasks during pomodoro)')
  .action(async (options: { focus?: string }) => {
    const { getPomodoroFocusMode, setPomodoroFocusMode } = await import('./config.js');
    if (options.focus) {
      const enabled = options.focus === 'on' || options.focus === 'true';
      setPomodoroFocusMode(enabled);
      console.log(`Pomodoro focus mode ${enabled ? 'enabled' : 'disabled'}`);
    } else {
      const enabled = getPomodoroFocusMode();
      console.log(`Pomodoro focus mode: ${enabled ? 'on' : 'off'}`);
    }
  });

// Insights command
program
  .command('insights')
  .description('Show task completion insights and statistics')
  .option('-w, --weeks <n>', 'Number of weeks to analyze (uses config default)')
  .action(async (options: { weeks?: string }) => {
    const { getInsightsWeeks } = await import('./config.js');
    const defaultWeeks = getInsightsWeeks();
    const weeks = options.weeks
      ? Math.max(1, parseInt(options.weeks, 10) || defaultWeeks)
      : defaultWeeks;
    await showInsights(weeks);
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

// Schedule command
program
  .command('schedule [period]')
  .description('Show schedule from registered calendars (today, tomorrow, week)')
  .option('-d, --days <n>', 'Number of days to show')
  .action(async (period: string | undefined, options: { days?: string }) => {
    await showSchedule(period, options);
  });

// Calendar commands
const calendarCmd = program
  .command('calendar')
  .description('Google Calendar (iCal) integration');

calendarCmd
  .command('add <url>')
  .description('Add a calendar by iCal URL (multiple calendars supported)')
  .option('-n, --name <name>', 'Display name for the calendar')
  .action(async (url: string, options: { name?: string }) => {
    await addCalendar(url, options);
  });

calendarCmd
  .command('list')
  .alias('ls')
  .description('List registered calendars')
  .action(async () => {
    await listCalendarSourcesCommand();
  });

calendarCmd
  .command('remove [id]')
  .alias('rm')
  .description('Remove a calendar by id/number/name')
  .option('--all', 'Remove all calendar configuration')
  .action(async (id: string | undefined, options: { all?: boolean }) => {
    await removeCalendar(id, options);
  });

calendarCmd
  .command('show')
  .description("Show calendar config and today's events")
  .action(async () => {
    await showCalendar();
  });

calendarCmd
  .command('sync')
  .description('Refresh calendar cache')
  .action(async () => {
    await syncCalendar();
  });

calendarCmd
  .command('enable [id]')
  .description('Enable calendar display (all, or a specific calendar by id)')
  .action(async (id?: string) => {
    await enableCalendar(id);
  });

calendarCmd
  .command('disable [id]')
  .description('Disable calendar display (all, or a specific calendar by id)')
  .action(async (id?: string) => {
    await disableCalendar(id);
  });

// OAuth commands
calendarCmd
  .command('config')
  .description('Configure OAuth client credentials')
  .option('--client-id <id>', 'Google OAuth Client ID')
  .option('--client-secret <secret>', 'Google OAuth Client Secret')
  .action(async (options: { clientId?: string; clientSecret?: string }) => {
    if (options.clientId && options.clientSecret) {
      await configOAuthClient(options.clientId, options.clientSecret);
    } else {
      console.log('Usage: floq calendar config --client-id <id> --client-secret <secret>');
      console.log('');
      console.log('Or set environment variables:');
      console.log('  export GOOGLE_CLIENT_ID="your-client-id"');
      console.log('  export GOOGLE_CLIENT_SECRET="your-client-secret"');
      process.exit(1);
    }
  });

calendarCmd
  .command('login')
  .description('Login with Google OAuth')
  .action(async () => {
    await loginCalendar();
  });

calendarCmd
  .command('logout')
  .description('Logout from Google OAuth')
  .action(async () => {
    await logoutCalendar();
  });

calendarCmd
  .command('select')
  .description('Select Google calendars to register (multiple supported)')
  .action(async () => {
    await selectCalendar();
  });

// MCP server command
program
  .command('mcp')
  .description('Start MCP server for LLM integration')
  .action(async () => {
    const { startMcpServer } = await import('./mcp/server.js');
    await startMcpServer();
  });

export { program };
