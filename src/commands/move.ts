import { eq, like } from 'drizzle-orm';
import { getDb, schema } from '../db/index.js';
import { t, fmt } from '../i18n/index.js';
import type { TaskStatus } from '../db/schema.js';

export async function moveTask(
  taskId: string,
  targetStatus: string,
  waitingFor?: string
): Promise<void> {
  const db = getDb();
  const i18n = t();

  const validStatuses: TaskStatus[] = ['inbox', 'next', 'waiting', 'someday'];
  if (!validStatuses.includes(targetStatus as TaskStatus)) {
    console.error(fmt(i18n.commands.move.invalidStatus, { status: targetStatus }));
    console.error(fmt(i18n.commands.move.validStatuses, { statuses: validStatuses.join(', ') }));
    process.exit(1);
  }

  if (targetStatus === 'waiting' && !waitingFor) {
    console.error(i18n.commands.move.specifyWaiting);
    process.exit(1);
  }

  // Find task by ID prefix
  const tasks = await db
    .select()
    .from(schema.tasks)
    .where(like(schema.tasks.id, `${taskId}%`));

  if (tasks.length === 0) {
    console.error(fmt(i18n.commands.move.notFound, { id: taskId }));
    process.exit(1);
  }

  if (tasks.length > 1) {
    console.error(fmt(i18n.commands.move.multipleMatch, { id: taskId }));
    for (const task of tasks) {
      console.error(`  [${task.id.slice(0, 8)}] ${task.title}`);
    }
    process.exit(1);
  }

  const task = tasks[0];

  await db.update(schema.tasks)
    .set({
      status: targetStatus as TaskStatus,
      waitingFor: targetStatus === 'waiting' ? waitingFor : null,
      updatedAt: new Date(),
    })
    .where(eq(schema.tasks.id, task.id));

  console.log(fmt(i18n.commands.move.success, {
    title: task.title,
    status: i18n.status[targetStatus as TaskStatus]
  }));
  if (waitingFor) {
    console.log(fmt(i18n.commands.move.waitingFor, { person: waitingFor }));
  }
}
