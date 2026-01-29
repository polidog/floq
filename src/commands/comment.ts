import { eq, like } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDb, schema } from '../db/index.js';
import { t, fmt } from '../i18n/index.js';

export async function addComment(taskId: string, content: string): Promise<void> {
  const db = getDb();
  const i18n = t();

  // Find task by ID prefix
  const tasks = await db
    .select()
    .from(schema.tasks)
    .where(like(schema.tasks.id, `${taskId}%`));

  if (tasks.length === 0) {
    console.error(fmt(i18n.commands.comment.notFound, { id: taskId }));
    process.exit(1);
  }

  if (tasks.length > 1) {
    console.error(fmt(i18n.commands.comment.multipleMatch, { id: taskId }));
    for (const task of tasks) {
      console.error(`  [${task.id.slice(0, 8)}] ${task.title}`);
    }
    process.exit(1);
  }

  const task = tasks[0];

  await db.insert(schema.comments).values({
    id: uuidv4(),
    taskId: task.id,
    content: content.trim(),
    createdAt: new Date(),
  });

  console.log(fmt(i18n.commands.comment.added, { title: task.title }));
}

export async function listComments(taskId: string): Promise<void> {
  const db = getDb();
  const i18n = t();

  // Find task by ID prefix
  const tasks = await db
    .select()
    .from(schema.tasks)
    .where(like(schema.tasks.id, `${taskId}%`));

  if (tasks.length === 0) {
    console.error(fmt(i18n.commands.comment.notFound, { id: taskId }));
    process.exit(1);
  }

  if (tasks.length > 1) {
    console.error(fmt(i18n.commands.comment.multipleMatch, { id: taskId }));
    for (const task of tasks) {
      console.error(`  [${task.id.slice(0, 8)}] ${task.title}`);
    }
    process.exit(1);
  }

  const task = tasks[0];

  const comments = await db
    .select()
    .from(schema.comments)
    .where(eq(schema.comments.taskId, task.id));

  if (comments.length === 0) {
    console.log(fmt(i18n.commands.comment.listHeader, { title: task.title }));
    console.log(`  ${i18n.commands.comment.noComments}`);
    return;
  }

  console.log(fmt(i18n.commands.comment.listHeader, { title: task.title }));
  for (const comment of comments) {
    const date = comment.createdAt.toLocaleString();
    console.log(`  [${date}] ${comment.content}`);
  }
}
