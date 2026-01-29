import { drizzle } from 'drizzle-orm/libsql';
import { createClient, type Client } from '@libsql/client';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import * as schema from './schema.js';
import { getDbPath, isTursoEnabled, getTursoConfig } from '../config.js';

function ensureDbDir(dbPath: string): void {
  const dbDir = dirname(dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
}

export type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

let client: Client | null = null;
let dbInstance: DbInstance | null = null;

// リモート DB のスキーマを初期化
async function initializeRemoteSchema(tursoUrl: string, authToken: string): Promise<void> {
  // リモート専用クライアントでスキーマを作成
  const remoteClient = createClient({
    url: tursoUrl,
    authToken: authToken,
  });

  try {
    const tableInfoResult = await remoteClient.execute("PRAGMA table_info(tasks)");
    const tableInfo = tableInfoResult.rows as unknown as { name: string }[];
    const tableExists = tableInfo.length > 0;

    if (!tableExists) {
      // Fresh install: create new schema on remote
      await remoteClient.execute(`
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          status TEXT NOT NULL DEFAULT 'inbox' CHECK(status IN ('inbox', 'next', 'waiting', 'someday', 'done')),
          is_project INTEGER NOT NULL DEFAULT 0,
          parent_id TEXT,
          waiting_for TEXT,
          due_date INTEGER,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `);

      await remoteClient.execute("CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)");
      await remoteClient.execute("CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id)");
      await remoteClient.execute("CREATE INDEX IF NOT EXISTS idx_tasks_is_project ON tasks(is_project)");
    }
  } finally {
    remoteClient.close();
  }
}

// ローカル DB のスキーマを初期化（ローカルモード用）
async function initializeLocalSchema(): Promise<void> {
  if (!client) return;

  const tableInfoResult = await client.execute("PRAGMA table_info(tasks)");
  const tableInfo = tableInfoResult.rows as unknown as { name: string }[];
  const hasProjectId = tableInfo.some(col => col.name === 'project_id');
  const hasIsProject = tableInfo.some(col => col.name === 'is_project');
  const tableExists = tableInfo.length > 0;

  if (tableExists && hasProjectId && !hasIsProject) {
    // Migration: old schema -> new schema
    await client.execute("ALTER TABLE tasks ADD COLUMN is_project INTEGER NOT NULL DEFAULT 0");
    await client.execute("ALTER TABLE tasks ADD COLUMN parent_id TEXT");

    const projectsResult = await client.execute("SELECT * FROM projects");
    const projects = projectsResult.rows as unknown as {
      id: string; name: string; description: string | null; status: string;
      created_at: number; updated_at: number;
    }[];

    for (const p of projects) {
      const newStatus = p.status === 'active' ? 'next' : (p.status === 'completed' ? 'done' : p.status);
      await client.execute({
        sql: `INSERT INTO tasks (id, title, description, status, is_project, parent_id, waiting_for, due_date, created_at, updated_at)
              VALUES (?, ?, ?, ?, 1, NULL, NULL, NULL, ?, ?)`,
        args: [p.id, p.name, p.description, newStatus, p.created_at, p.updated_at]
      });
    }

    await client.execute("UPDATE tasks SET parent_id = project_id WHERE project_id IS NOT NULL");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_tasks_is_project ON tasks(is_project)");
  } else if (!tableExists) {
    // Fresh install: create new schema
    await client.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'inbox' CHECK(status IN ('inbox', 'next', 'waiting', 'someday', 'done')),
        is_project INTEGER NOT NULL DEFAULT 0,
        parent_id TEXT,
        waiting_for TEXT,
        due_date INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    await client.execute("CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_tasks_is_project ON tasks(is_project)");
  }
}

// DB 初期化
export async function initDb(): Promise<void> {
  if (dbInstance) return;

  const dbPath = getDbPath();
  ensureDbDir(dbPath);

  if (isTursoEnabled()) {
    // Turso embedded replica モード
    const turso = getTursoConfig()!;

    // 1. まずリモートにスキーマを作成
    await initializeRemoteSchema(turso.url, turso.authToken);

    // 2. embedded replica クライアントを作成
    client = createClient({
      url: `file:${dbPath}`,
      syncUrl: turso.url,
      authToken: turso.authToken,
      syncInterval: 60, // 60秒ごとに自動同期
    });

    // 3. 初回同期（リモートからローカルにデータをプル）
    await client.sync();
  } else {
    // ローカルモード（libsql でローカルファイルのみ）
    client = createClient({
      url: `file:${dbPath}`,
    });

    // ローカルモードではスキーマをローカルに作成
    await initializeLocalSchema();
  }

  dbInstance = drizzle(client, { schema });
}

// DB インスタンス取得
export function getDb(): DbInstance {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return dbInstance;
}

// 手動同期（Turso モード時のみ有効）
export async function syncDb(): Promise<void> {
  if (!client) {
    throw new Error('Database not initialized');
  }
  if (!isTursoEnabled()) {
    throw new Error('Turso sync is not enabled');
  }
  await client.sync();
}

export { schema };
