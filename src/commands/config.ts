import { render } from 'ink';
import React from 'react';
import { createInterface } from 'readline';
import { unlinkSync, existsSync, readdirSync } from 'fs';
import { dirname, basename, join } from 'path';
import { loadConfig, saveConfig, getDbPath, getViewMode, setViewMode, isTursoEnabled, getTursoConfig, setTursoConfig, setTursoEnabled, getSplashDuration, setSplashDuration, type Locale, type ThemeName, type ViewMode } from '../config.js';
import { CONFIG_FILE } from '../paths.js';
import { ThemeSelector } from '../ui/ThemeSelector.js';
import { ModeSelector } from '../ui/ModeSelector.js';
import { syncDb } from '../db/index.js';
import { VALID_THEMES, themes } from '../ui/theme/themes.js';

const VALID_LOCALES: Locale[] = ['en', 'ja'];
const VALID_VIEW_MODES: ViewMode[] = ['gtd', 'kanban'];

export async function showConfig(): Promise<void> {
  const config = loadConfig();
  const splashDuration = getSplashDuration();

  console.log('GTD CLI Configuration');
  console.log('─'.repeat(40));
  console.log(`Config file: ${CONFIG_FILE}`);
  console.log(`Language: ${config.locale}`);
  console.log(`Database: ${getDbPath()}`);
  console.log(`Theme: ${config.theme || 'modern'}`);
  console.log(`View Mode: ${config.viewMode || 'gtd'}`);
  console.log(`Splash: ${splashDuration === 0 ? 'disabled' : splashDuration === -1 ? 'wait for key' : `${splashDuration}ms`}`);
  console.log(`Turso: ${isTursoEnabled() ? 'enabled' : 'disabled'}`);

  if (config.db_path) {
    console.log(`  (custom: ${config.db_path})`);
  }

  if (config.turso) {
    console.log(`  URL: ${config.turso.url}`);
  }
}

export async function setLanguage(locale: string): Promise<void> {
  if (!VALID_LOCALES.includes(locale as Locale)) {
    console.error(`Invalid locale: ${locale}`);
    console.error(`Valid locales: ${VALID_LOCALES.join(', ')}`);
    process.exit(1);
  }

  saveConfig({ locale: locale as Locale });

  const messages: Record<Locale, string> = {
    en: 'Language set to English',
    ja: '言語を日本語に設定しました',
  };

  console.log(messages[locale as Locale]);
}

export async function setDbPath(dbPath: string): Promise<void> {
  saveConfig({ db_path: dbPath });
  console.log(`Database path set to: ${getDbPath()}`);
}

export async function resetDbPath(): Promise<void> {
  saveConfig({ db_path: undefined });
  console.log(`Database path reset to default: ${getDbPath()}`);
}

export async function setTheme(theme: string): Promise<void> {
  if (!VALID_THEMES.includes(theme as ThemeName)) {
    console.error(`Invalid theme: ${theme}`);
    console.error(`Valid themes: ${VALID_THEMES.join(', ')}`);
    process.exit(1);
  }

  saveConfig({ theme: theme as ThemeName });

  const themeData = themes[theme as ThemeName];
  console.log(`Theme set to ${themeData.displayName}`);
}

export async function selectTheme(): Promise<void> {
  return new Promise((resolve) => {
    const { unmount } = render(
      React.createElement(ThemeSelector, {
        onSelect: (theme: ThemeName) => {
          unmount();
          saveConfig({ theme });

          const themeData = themes[theme];
          console.log(`Theme set to ${themeData.displayName}`);
          resolve();
        },
      })
    );
  });
}

export async function showViewMode(): Promise<void> {
  const mode = getViewMode();
  console.log(`Current view mode: ${mode}`);
}

export async function setViewModeCommand(mode: string): Promise<void> {
  if (!VALID_VIEW_MODES.includes(mode as ViewMode)) {
    console.error(`Invalid view mode: ${mode}`);
    console.error(`Valid modes: ${VALID_VIEW_MODES.join(', ')}`);
    process.exit(1);
  }

  setViewMode(mode as ViewMode);

  const messages: Record<ViewMode, string> = {
    gtd: 'View mode set to GTD',
    kanban: 'View mode set to Kanban',
  };

  console.log(messages[mode as ViewMode]);
}

export async function selectMode(): Promise<void> {
  return new Promise((resolve) => {
    const { unmount } = render(
      React.createElement(ModeSelector, {
        onSelect: (mode: ViewMode) => {
          unmount();
          setViewMode(mode);

          const messages: Record<ViewMode, string> = {
            gtd: 'View mode set to GTD',
            kanban: 'View mode set to Kanban',
          };

          console.log(messages[mode]);
          resolve();
        },
      })
    );
  });
}

export async function setTurso(url: string, token: string): Promise<void> {
  setTursoConfig({ url, authToken: token, enabled: true });
  console.log('Turso sync enabled');
  console.log(`  URL: ${url}`);
  console.log('Run "floq sync" to sync with Turso cloud');
}

export async function disableTurso(): Promise<void> {
  const turso = getTursoConfig();
  if (!turso || !turso.url || !turso.authToken) {
    console.error('Turso is not configured.');
    console.error('Use "floq config turso --url <url> --token <token>" to configure.');
    process.exit(1);
  }
  setTursoEnabled(false);
  console.log('Turso sync disabled (configuration preserved)');
  console.log('Use "floq config turso --enable" to re-enable');
}

export async function enableTurso(): Promise<void> {
  const turso = getTursoConfig();
  if (!turso || !turso.url || !turso.authToken) {
    console.error('Turso is not configured.');
    console.error('Use "floq config turso --url <url> --token <token>" to configure.');
    process.exit(1);
  }
  setTursoEnabled(true);
  console.log('Turso sync enabled');
  console.log(`  URL: ${turso.url}`);
}

export async function clearTurso(): Promise<void> {
  const turso = getTursoConfig();
  if (!turso) {
    console.log('Turso is not configured.');
    return;
  }
  setTursoConfig(undefined);
  console.log('Turso configuration cleared');
}

export async function setSplashCommand(duration: string): Promise<void> {
  let value: number;

  // Handle special keywords
  if (duration === 'key' || duration === 'wait') {
    value = -1;
  } else if (duration === 'off' || duration === 'disable') {
    value = 0;
  } else {
    value = parseInt(duration, 10);

    if (isNaN(value)) {
      console.error(`Invalid duration: ${duration}`);
      console.error('Usage: floq config splash <milliseconds|key|off>');
      console.error('  off/0 = disable splash screen');
      console.error('  key = wait for key press');
      console.error('  positive number = duration in milliseconds');
      process.exit(1);
    }

    if (value < 0) {
      console.error('Duration must be 0 (disabled) or positive number');
      console.error('Use "key" for wait-for-keypress mode');
      process.exit(1);
    }
  }

  setSplashDuration(value);

  if (value === 0) {
    console.log('Splash screen disabled');
  } else if (value === -1) {
    console.log('Splash screen set to wait for key press');
  } else {
    console.log(`Splash screen duration set to ${value}ms`);
  }
}

export async function showSplash(): Promise<void> {
  const duration = getSplashDuration();
  if (duration === 0) {
    console.log('Splash screen: disabled');
  } else if (duration === -1) {
    console.log('Splash screen: wait for key press');
  } else {
    console.log(`Splash screen: ${duration}ms`);
  }
}

export async function syncCommand(): Promise<void> {
  if (!isTursoEnabled()) {
    console.error('Turso sync is not enabled.');
    console.error('Use "floq config turso --url <url> --token <token>" to enable.');
    process.exit(1);
  }

  console.log('Syncing with Turso cloud...');
  try {
    await syncDb();
    console.log('Sync complete');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Sync failed: ${message}`);
    console.error('');
    console.error('Possible solutions:');
    console.error('  1. Check your Turso URL and auth token');
    console.error('  2. Verify network connectivity');
    console.error('  3. Try again later');
    process.exit(1);
  }
}

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function clearTursoData(): Promise<void> {
  const turso = getTursoConfig();
  if (!turso) return;

  const { createClient } = await import('@libsql/client');
  const client = createClient({
    url: turso.url,
    authToken: turso.authToken,
  });

  try {
    await client.execute('DELETE FROM comments');
    await client.execute('DELETE FROM tasks');
    console.log('Turso cloud data cleared.');
  } finally {
    client.close();
  }
}

export async function resetDatabase(force: boolean): Promise<void> {
  const dbPath = getDbPath();
  const dbDir = dirname(dbPath);
  const dbName = basename(dbPath, '.db');
  const tursoEnabled = isTursoEnabled();

  // Find all related database files
  const relatedFiles: string[] = [];
  if (existsSync(dbDir)) {
    const files = readdirSync(dbDir);
    for (const file of files) {
      // Match: floq.db, floq.db-wal, floq.db-shm, floq-turso.db-info, etc.
      if (file.startsWith(dbName)) {
        relatedFiles.push(join(dbDir, file));
      }
    }
  }

  if (relatedFiles.length === 0 && !tursoEnabled) {
    console.log('Database files do not exist.');
    return;
  }

  if (!force) {
    if (relatedFiles.length > 0) {
      console.log('This will delete the following local files:');
      for (const file of relatedFiles) {
        console.log(`  ${file}`);
      }
    }
    if (tursoEnabled) {
      console.log('This will also delete all data in Turso cloud.');
    }
    const confirmed = await confirm('Are you sure?');
    if (!confirmed) {
      console.log('Cancelled.');
      return;
    }
  }

  try {
    // Clear Turso cloud data first
    if (tursoEnabled) {
      await clearTursoData();
    }

    // Delete local files
    for (const file of relatedFiles) {
      unlinkSync(file);
    }
    console.log('Database reset complete.');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to reset database: ${message}`);
    process.exit(1);
  }
}
