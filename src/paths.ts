import { homedir } from 'os';
import { join } from 'path';

// XDG Base Directory Specification
// https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html

export function getConfigDir(): string {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  if (xdgConfigHome) {
    return join(xdgConfigHome, 'gtd-cli');
  }
  return join(homedir(), '.config', 'gtd-cli');
}

export function getDataDir(): string {
  const xdgDataHome = process.env.XDG_DATA_HOME;
  if (xdgDataHome) {
    return join(xdgDataHome, 'gtd-cli');
  }
  return join(homedir(), '.local', 'share', 'gtd-cli');
}

export const CONFIG_DIR = getConfigDir();
export const DATA_DIR = getDataDir();
export const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
export const DB_PATH = join(DATA_DIR, 'gtd.db');
