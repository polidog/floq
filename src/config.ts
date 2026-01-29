import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'fs';
import { dirname, join, isAbsolute } from 'path';
import { CONFIG_FILE, DATA_DIR } from './paths.js';
import type { ThemeName } from './ui/theme/types.js';

// Migrate legacy DB file names (including related metadata files)
function migrateDbFiles(): void {
  const legacyDb = join(DATA_DIR, 'gtd.db');
  const newDb = join(DATA_DIR, 'floq.db');
  const legacyTursoDb = join(DATA_DIR, 'gtd-turso.db');
  const newTursoDb = join(DATA_DIR, 'floq-turso.db');

  // Turso/libsql related file suffixes
  const tursoSuffixes = ['', '-info', '-shm', '-wal'];

  try {
    if (existsSync(legacyDb) && !existsSync(newDb)) {
      renameSync(legacyDb, newDb);
    }
    // Migrate Turso DB and all related metadata files
    for (const suffix of tursoSuffixes) {
      const legacyFile = legacyTursoDb + suffix;
      const newFile = newTursoDb + suffix;
      if (existsSync(legacyFile) && !existsSync(newFile)) {
        renameSync(legacyFile, newFile);
      }
    }
  } catch {
    // Ignore migration errors
  }
}

// Run DB file migration on module load
migrateDbFiles();

export type Locale = 'en' | 'ja';
export type ViewMode = 'gtd' | 'kanban';
export type { ThemeName };

export interface TursoConfig {
  url: string;       // libsql://xxx.turso.io
  authToken: string; // Turso auth token
}

export interface Config {
  locale: Locale;
  db_path?: string;  // カスタムDBパス（省略時はデフォルト）
  theme: ThemeName;  // UIテーマ
  viewMode: ViewMode; // GTD or Kanban view mode
  turso?: TursoConfig; // Turso sync config
  contexts?: string[]; // Available contexts for tasks
}

const DEFAULT_CONTEXTS = ['work', 'home'];

const DEFAULT_CONFIG: Config = {
  locale: 'en',
  theme: 'modern',
  viewMode: 'gtd',
  contexts: DEFAULT_CONTEXTS,
};

let configCache: Config | null = null;

export function loadConfig(): Config {
  if (configCache) {
    return configCache;
  }

  try {
    if (existsSync(CONFIG_FILE)) {
      const content = readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(content) as Partial<Config>;
      configCache = { ...DEFAULT_CONFIG, ...parsed };
      return configCache;
    }
  } catch {
    // Ignore errors
  }

  configCache = DEFAULT_CONFIG;
  return configCache;
}

export function saveConfig(updates: Partial<Config>): void {
  const current = loadConfig();
  const newConfig = { ...current, ...updates };

  try {
    const configDir = dirname(CONFIG_FILE);
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
    writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2));
    configCache = newConfig;
  } catch {
    // Ignore errors
  }
}

export function getTursoConfig(): TursoConfig | undefined {
  return loadConfig().turso;
}

export function setTursoConfig(config: TursoConfig | undefined): void {
  saveConfig({ turso: config });
}

export function isTursoEnabled(): boolean {
  const turso = getTursoConfig();
  return turso !== undefined && turso.url !== '' && turso.authToken !== '';
}

export function getDbPath(): string {
  const config = loadConfig();

  if (config.db_path) {
    // 絶対パスならそのまま、相対パスならDATA_DIRからの相対
    if (isAbsolute(config.db_path)) {
      return config.db_path;
    }
    return join(DATA_DIR, config.db_path);
  }

  // Turso モードでは別のDBファイルを使用（embedded replica 用）
  if (isTursoEnabled()) {
    return join(DATA_DIR, 'floq-turso.db');
  }

  return join(DATA_DIR, 'floq.db');
}

export function getLocale(): Locale {
  return loadConfig().locale;
}

export function setLocale(locale: Locale): void {
  saveConfig({ locale });
}

export function getThemeName(): ThemeName {
  return loadConfig().theme || 'modern';
}

export function setThemeName(theme: ThemeName): void {
  saveConfig({ theme });
}

export function getViewMode(): ViewMode {
  return loadConfig().viewMode || 'gtd';
}

export function setViewMode(viewMode: ViewMode): void {
  saveConfig({ viewMode });
}

export function isFirstRun(): boolean {
  return !existsSync(CONFIG_FILE);
}

export function getContexts(): string[] {
  return loadConfig().contexts || DEFAULT_CONTEXTS;
}

export function addContext(context: string): boolean {
  const contexts = getContexts();
  const normalized = context.toLowerCase().replace(/^@/, '');
  if (contexts.includes(normalized)) {
    return false;
  }
  saveConfig({ contexts: [...contexts, normalized] });
  return true;
}

export function removeContext(context: string): boolean {
  const contexts = getContexts();
  const normalized = context.toLowerCase().replace(/^@/, '');
  const index = contexts.indexOf(normalized);
  if (index === -1) {
    return false;
  }
  const newContexts = contexts.filter(c => c !== normalized);
  saveConfig({ contexts: newContexts });
  return true;
}
