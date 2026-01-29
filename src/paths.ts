import { homedir } from 'os';
import { join } from 'path';
import { existsSync, renameSync, mkdirSync, readdirSync } from 'fs';

// XDG Base Directory Specification
// https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html

const APP_NAME = 'floq';
const LEGACY_APP_NAME = 'gtd-cli';

function getLegacyConfigDir(): string {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  if (xdgConfigHome) {
    return join(xdgConfigHome, LEGACY_APP_NAME);
  }
  return join(homedir(), '.config', LEGACY_APP_NAME);
}

function getLegacyDataDir(): string {
  const xdgDataHome = process.env.XDG_DATA_HOME;
  if (xdgDataHome) {
    return join(xdgDataHome, LEGACY_APP_NAME);
  }
  return join(homedir(), '.local', 'share', LEGACY_APP_NAME);
}

export function getConfigDir(): string {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  if (xdgConfigHome) {
    return join(xdgConfigHome, APP_NAME);
  }
  return join(homedir(), '.config', APP_NAME);
}

export function getDataDir(): string {
  const xdgDataHome = process.env.XDG_DATA_HOME;
  if (xdgDataHome) {
    return join(xdgDataHome, APP_NAME);
  }
  return join(homedir(), '.local', 'share', APP_NAME);
}

/**
 * Migrate from legacy gtd-cli directories to floq directories
 */
function migrateDirectory(legacyDir: string, newDir: string): void {
  // Only migrate if legacy exists and new doesn't
  if (existsSync(legacyDir) && !existsSync(newDir)) {
    try {
      // Create parent directory if needed
      const parentDir = join(newDir, '..');
      if (!existsSync(parentDir)) {
        mkdirSync(parentDir, { recursive: true });
      }
      // Rename (move) the directory
      renameSync(legacyDir, newDir);
    } catch {
      // If rename fails (cross-device), copy files manually
      try {
        mkdirSync(newDir, { recursive: true });
        const files = readdirSync(legacyDir);
        for (const file of files) {
          const legacyPath = join(legacyDir, file);
          const newPath = join(newDir, file);
          renameSync(legacyPath, newPath);
        }
      } catch {
        // Ignore migration errors, user can migrate manually
      }
    }
  }
}

/**
 * Run migration from legacy paths if needed
 */
export function runMigration(): void {
  migrateDirectory(getLegacyConfigDir(), getConfigDir());
  migrateDirectory(getLegacyDataDir(), getDataDir());
}

// Run migration on module load
runMigration();

export const CONFIG_DIR = getConfigDir();
export const DATA_DIR = getDataDir();
export const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
export const DB_PATH = join(DATA_DIR, 'floq.db');
