#!/usr/bin/env node
import { program } from './cli.js';
import { initDb } from './db/index.js';
import { isTursoEnabled, getTursoConfig, isFirstRun } from './config.js';
import { runSetupWizard } from './commands/setup.js';

async function main() {
  // 起動時にモードを表示（TUI以外のコマンド時）
  const args = process.argv.slice(2);
  const isTuiMode = args.length === 0;
  const isConfigCommand = args[0] === 'config';
  const isSyncCommand = args[0] === 'sync';
  const isSetupCommand = args[0] === 'setup';
  const isMcpCommand = args[0] === 'mcp';

  // 初回起動時（引数なし + config未作成）はウィザードを起動
  if (isTuiMode && isFirstRun()) {
    await runSetupWizard();
    // ウィザード完了後、DBを初期化してTUIを起動
    await initDb();
    program.parse();
    return;
  }

  // config/syncコマンド以外でTursoモードの場合は接続先を表示
  if (!isTuiMode && !isConfigCommand && !isSyncCommand && !isSetupCommand && !isMcpCommand && isTursoEnabled()) {
    const turso = getTursoConfig();
    if (turso) {
      const host = new URL(turso.url).host;
      console.log(`🔄 Turso sync: ${host}`);
    }
  }

  // config/setupコマンドはDB不要なのでスキップ
  if (!isConfigCommand && !isSetupCommand) {
    await initDb();
  }
  program.parse();
}

main().catch(console.error);
