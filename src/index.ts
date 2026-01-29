#!/usr/bin/env node
import { program } from './cli.js';
import { initDb } from './db/index.js';
import { isTursoEnabled, getTursoConfig } from './config.js';

async function main() {
  // 起動時にモードを表示（TUI以外のコマンド時）
  const args = process.argv.slice(2);
  const isTuiMode = args.length === 0;
  const isConfigCommand = args[0] === 'config';
  const isSyncCommand = args[0] === 'sync';

  // config/syncコマンド以外でTursoモードの場合は接続先を表示
  if (!isTuiMode && !isConfigCommand && !isSyncCommand && isTursoEnabled()) {
    const turso = getTursoConfig();
    if (turso) {
      const host = new URL(turso.url).host;
      console.log(`🔄 Turso sync: ${host}`);
    }
  }

  // configコマンドはDB不要なのでスキップ
  if (!isConfigCommand) {
    await initDb();
  }
  program.parse();
}

main().catch(console.error);
