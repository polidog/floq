import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import * as schema from './schema.js';
import { getDbPath } from '../config.js';

function ensureDbDir(dbPath: string): void {
  const dbDir = dirname(dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
}

function initializeSchema(sqlite: Database.Database): void {
  // Check if we need to migrate from old schema
  const tableInfo = sqlite.prepare("PRAGMA table_info(tasks)").all() as { name: string }[];
  const hasProjectId = tableInfo.some(col => col.name === 'project_id');
  const hasIsProject = tableInfo.some(col => col.name === 'is_project');
  const tableExists = tableInfo.length > 0;

  if (tableExists && hasProjectId && !hasIsProject) {
    // Migration: old schema -> new schema
    // Add new columns
    sqlite.prepare("ALTER TABLE tasks ADD COLUMN is_project INTEGER NOT NULL DEFAULT 0").run();
    sqlite.prepare("ALTER TABLE tasks ADD COLUMN parent_id TEXT").run();

    // Migrate: convert projects to tasks with is_project=1
    const projects = sqlite.prepare("SELECT * FROM projects").all() as {
      id: string; name: string; description: string | null; status: string;
      created_at: number; updated_at: number;
    }[];

    const insertStmt = sqlite.prepare(`
      INSERT INTO tasks (id, title, description, status, is_project, parent_id, waiting_for, due_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, NULL, NULL, NULL, ?, ?)
    `);

    for (const p of projects) {
      const newStatus = p.status === 'active' ? 'next' : (p.status === 'completed' ? 'done' : p.status);
      insertStmt.run(p.id, p.name, p.description, newStatus, p.created_at, p.updated_at);
    }

    // Update parent_id from old project_id
    sqlite.prepare("UPDATE tasks SET parent_id = project_id WHERE project_id IS NOT NULL").run();

    // Create new indexes
    sqlite.prepare("CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id)").run();
    sqlite.prepare("CREATE INDEX IF NOT EXISTS idx_tasks_is_project ON tasks(is_project)").run();
  } else if (!tableExists) {
    // Fresh install: create new schema
    sqlite.prepare(`
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
    `).run();

    sqlite.prepare("CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)").run();
    sqlite.prepare("CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id)").run();
    sqlite.prepare("CREATE INDEX IF NOT EXISTS idx_tasks_is_project ON tasks(is_project)").run();
  }
}

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!dbInstance) {
    const dbPath = getDbPath();
    ensureDbDir(dbPath);
    const sqlite = new Database(dbPath);
    initializeSchema(sqlite);
    dbInstance = drizzle(sqlite, { schema });
  }
  return dbInstance;
}

export { schema };
