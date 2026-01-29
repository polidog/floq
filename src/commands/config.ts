import { render } from 'ink';
import React from 'react';
import { loadConfig, saveConfig, getDbPath, isTursoEnabled, setTursoConfig, type Locale, type ThemeName } from '../config.js';
import { CONFIG_FILE } from '../paths.js';
import { ThemeSelector } from '../ui/ThemeSelector.js';
import { syncDb } from '../db/index.js';
import { VALID_THEMES, themes } from '../ui/theme/themes.js';

const VALID_LOCALES: Locale[] = ['en', 'ja'];

export async function showConfig(): Promise<void> {
  const config = loadConfig();

  console.log('GTD CLI Configuration');
  console.log('─'.repeat(40));
  console.log(`Config file: ${CONFIG_FILE}`);
  console.log(`Language: ${config.locale}`);
  console.log(`Database: ${getDbPath()}`);
  console.log(`Theme: ${config.theme || 'modern'}`);
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

export async function setTurso(url: string, token: string): Promise<void> {
  setTursoConfig({ url, authToken: token });
  console.log('Turso sync enabled');
  console.log(`  URL: ${url}`);
  console.log('Run "floq sync" to sync with Turso cloud');
}

export async function disableTurso(): Promise<void> {
  setTursoConfig(undefined);
  console.log('Turso sync disabled');
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
