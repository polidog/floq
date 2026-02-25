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
  enabled?: boolean; // Whether Turso sync is enabled (default: true when url/token are set)
}

export interface CalendarOAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp (ms)
}

export interface GoogleOAuthClient {
  clientId: string;
  clientSecret: string;
}

export interface CalendarOAuthConfig {
  tokens: CalendarOAuthTokens;
  calendarId: string;
  calendarName: string;
}

export interface CalendarConfig {
  // iCal mode
  url?: string;        // iCal URL (webcal:// or https://)
  name?: string;       // Display name
  enabled?: boolean;   // Display ON/OFF

  // OAuth mode
  type?: 'ical' | 'oauth';
  googleOAuth?: GoogleOAuthClient; // OAuth client credentials
  oauth?: CalendarOAuthConfig;     // OAuth tokens and selected calendar
}

// Date format options for clock display
// auto = locale-based default (en: 'ddd, MMM D', ja: 'MM/DD(ddd)')
export type DateFormat = 'auto' | 'ddd, MMM D' | 'MM/DD(ddd)' | 'YYYY-MM-DD' | 'MM-DD' | 'DD/MM' | 'none';

export interface Config {
  locale: Locale;
  db_path?: string;  // カスタムDBパス（省略時はデフォルト）
  theme: ThemeName;  // UIテーマ
  viewMode: ViewMode; // GTD or Kanban view mode
  turso?: TursoConfig; // Turso sync config
  contexts?: string[]; // Available contexts for tasks
  splashDuration?: number; // Splash screen duration in ms (0=disable, -1=wait for key)
  contextFilter?: string | null; // Current context filter (null = all, '' = no context, string = specific context)
  focusFilter?: boolean; // Focus filter ON/OFF (default: false)
  pomodoroFocusMode?: boolean; // Hide other tasks during pomodoro (default: false)
  dateFormat?: DateFormat; // Date format for clock display (default: 'MM/DD(ddd)')
  calendar?: CalendarConfig; // Google Calendar (iCal) config
  insightsWeeks?: number; // Number of weeks for insights (default: 2)
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
  return turso !== undefined && turso.url !== '' && turso.authToken !== '' && turso.enabled !== false;
}

export function setTursoEnabled(enabled: boolean): void {
  const turso = getTursoConfig();
  if (turso) {
    setTursoConfig({ ...turso, enabled });
  }
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

const DEFAULT_SPLASH_DURATION = 2500; // 2.5 seconds

export function getSplashDuration(): number {
  const duration = loadConfig().splashDuration;
  // undefined means use default, 0 means disabled
  if (duration === undefined) {
    return DEFAULT_SPLASH_DURATION;
  }
  return duration;
}

export function setSplashDuration(duration: number): void {
  // Allow -1 (wait for key), 0 (disabled), or positive values
  saveConfig({ splashDuration: duration >= 0 ? duration : -1 });
}

export function getContextFilter(): string | null {
  const config = loadConfig();
  // undefined means not set (default to null = all)
  return config.contextFilter === undefined ? null : config.contextFilter;
}

export function setContextFilter(contextFilter: string | null): void {
  saveConfig({ contextFilter });
}

export function getFocusFilter(): boolean {
  return loadConfig().focusFilter ?? false;
}

export function setFocusFilter(enabled: boolean): void {
  saveConfig({ focusFilter: enabled });
}

export function getPomodoroFocusMode(): boolean {
  return loadConfig().pomodoroFocusMode ?? true;
}

export function setPomodoroFocusMode(enabled: boolean): void {
  saveConfig({ pomodoroFocusMode: enabled });
}

export function getDateFormat(): DateFormat {
  return loadConfig().dateFormat ?? 'auto';
}

export function setDateFormat(format: DateFormat): void {
  saveConfig({ dateFormat: format });
}

export function getCalendarConfig(): CalendarConfig | undefined {
  return loadConfig().calendar;
}

export function setCalendarConfig(config: CalendarConfig | undefined): void {
  saveConfig({ calendar: config });
}

export function isCalendarEnabled(): boolean {
  const calendar = getCalendarConfig();
  if (!calendar || calendar.enabled === false) return false;

  // OAuth mode
  if (calendar.type === 'oauth' && calendar.oauth) {
    return true;
  }

  // iCal mode
  if (calendar.url && calendar.url !== '') {
    return true;
  }

  return false;
}

export function setCalendarEnabled(enabled: boolean): void {
  const calendar = getCalendarConfig();
  if (calendar) {
    setCalendarConfig({ ...calendar, enabled });
  }
}

export function getGoogleOAuthClient(): GoogleOAuthClient | undefined {
  // Environment variables take priority
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }
  // Fallback to config file
  return getCalendarConfig()?.googleOAuth;
}

export function setGoogleOAuthClient(client: GoogleOAuthClient): void {
  const calendar = getCalendarConfig() || {};
  setCalendarConfig({ ...calendar, googleOAuth: client });
}

export function getCalendarOAuthConfig(): CalendarOAuthConfig | undefined {
  return getCalendarConfig()?.oauth;
}

export function setCalendarOAuthConfig(oauth: CalendarOAuthConfig | undefined): void {
  const calendar = getCalendarConfig() || {};
  if (oauth) {
    setCalendarConfig({ ...calendar, type: 'oauth', oauth, enabled: true });
  } else {
    // Clear OAuth config
    const { oauth: _removed, ...rest } = calendar;
    setCalendarConfig(rest);
  }
}

export function getCalendarType(): 'ical' | 'oauth' | undefined {
  const calendar = getCalendarConfig();
  if (!calendar) return undefined;
  return calendar.type || (calendar.url ? 'ical' : undefined);
}

const DEFAULT_INSIGHTS_WEEKS = 2;

export function getInsightsWeeks(): number {
  const weeks = loadConfig().insightsWeeks;
  if (weeks === undefined || weeks < 1) {
    return DEFAULT_INSIGHTS_WEEKS;
  }
  return weeks;
}

export function setInsightsWeeks(weeks: number): void {
  saveConfig({ insightsWeeks: Math.max(1, weeks) });
}
