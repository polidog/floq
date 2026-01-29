import { defineConfig } from 'drizzle-kit';
import { homedir } from 'os';
import { join } from 'path';

function getDataDir(): string {
  const xdgDataHome = process.env.XDG_DATA_HOME;
  if (xdgDataHome) {
    return join(xdgDataHome, 'gtd-cli');
  }
  return join(homedir(), '.local', 'share', 'gtd-cli');
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: join(getDataDir(), 'gtd.db'),
  },
});
