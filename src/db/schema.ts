import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['inbox', 'next', 'waiting', 'someday', 'done'] }).notNull().default('inbox'),
  isProject: integer('is_project', { mode: 'boolean' }).notNull().default(false),
  parentId: text('parent_id'),
  waitingFor: text('waiting_for'),
  context: text('context'),
  dueDate: integer('due_date', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskStatus = 'inbox' | 'next' | 'waiting' | 'someday' | 'done';

export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
