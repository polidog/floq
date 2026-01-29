import { eq, like } from 'drizzle-orm';
import { getDb, schema } from '../db/index.js';
import { t, fmt } from '../i18n/index.js';

export async function markDone(taskId: string): Promise<void> {
  const db = getDb();
  const i18n = t();

  // Find task by ID prefix
  const tasks = await db
    .select()
    .from(schema.tasks)
    .where(like(schema.tasks.id, `${taskId}%`));

  if (tasks.length === 0) {
    console.error(fmt(i18n.commands.done.notFound, { id: taskId }));
    process.exit(1);
  }

  if (tasks.length > 1) {
    console.error(fmt(i18n.commands.done.multipleMatch, { id: taskId }));
    for (const task of tasks) {
      console.error(`  [${task.id.slice(0, 8)}] ${task.title}`);
    }
    process.exit(1);
  }

  const task = tasks[0];

  if (task.status === 'done') {
    console.log(fmt(i18n.commands.done.alreadyDone, { title: task.title }));
    return;
  }

  await db.update(schema.tasks)
    .set({
      status: 'done',
      updatedAt: new Date(),
    })
    .where(eq(schema.tasks.id, task.id));

  console.log(fmt(i18n.commands.done.success, { title: task.title }));
}
