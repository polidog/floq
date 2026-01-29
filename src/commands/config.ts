import { loadConfig, saveConfig, getDbPath, type Locale, type ThemeName } from '../config.js';
import { CONFIG_FILE } from '../paths.js';

const VALID_LOCALES: Locale[] = ['en', 'ja'];
const VALID_THEMES: ThemeName[] = ['modern', 'norton-commander', 'dos-prompt', 'turbo-pascal'];

export async function showConfig(): Promise<void> {
  const config = loadConfig();

  console.log('GTD CLI Configuration');
  console.log('─'.repeat(40));
  console.log(`Config file: ${CONFIG_FILE}`);
  console.log(`Language: ${config.locale}`);
  console.log(`Database: ${getDbPath()}`);
  console.log(`Theme: ${config.theme || 'modern'}`);

  if (config.db_path) {
    console.log(`  (custom: ${config.db_path})`);
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

  const messages: Record<ThemeName, string> = {
    'modern': 'Theme set to Modern',
    'norton-commander': 'Theme set to Norton Commander (MS-DOS style)',
    'dos-prompt': 'Theme set to DOS Prompt (green on black)',
    'turbo-pascal': 'Theme set to Turbo Pascal IDE',
  };

  console.log(messages[theme as ThemeName]);
}
