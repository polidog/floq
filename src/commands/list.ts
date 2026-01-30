import { eq, and, gte } from 'drizzle-orm';
import { getDb, schema } from '../db/index.js';
import { t, fmt } from '../i18n/index.js';
import type { TaskStatus } from '../db/schema.js';

export async function listTasks(status?: string): Promise<void> {
  const db = getDb();
  const i18n = t();

  if (status && status !== 'all') {
    const validStatuses: TaskStatus[] = ['inbox', 'next', 'waiting', 'someday', 'done'];
    if (!validStatuses.includes(status as TaskStatus)) {
      console.error(fmt(i18n.commands.list.invalidStatus, { status }));
      console.error(fmt(i18n.commands.list.validStatuses, { statuses: validStatuses.join(', ') }));
      process.exit(1);
    }

    // For done status, only show tasks from the last week by default
    let tasks;
    if (status === 'done') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      tasks = await db
        .select()
        .from(schema.tasks)
        .where(and(
          eq(schema.tasks.status, 'done'),
          gte(schema.tasks.updatedAt, oneWeekAgo)
        ));
    } else {
      tasks = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.status, status as TaskStatus));
    }

    console.log(`\n${i18n.status[status as TaskStatus]} (${tasks.length})`);
    console.log('─'.repeat(40));

    if (tasks.length === 0) {
      console.log(`  ${i18n.commands.list.noTasks}`);
    } else {
      for (const task of tasks) {
        const shortId = task.id.slice(0, 8);
        let line = `  [${shortId}] ${task.title}`;
        if (task.waitingFor) {
          line += ` (${i18n.status.waiting.toLowerCase()}: ${task.waitingFor})`;
        }
        if (task.dueDate) {
          line += ` (due: ${task.dueDate.toLocaleDateString()})`;
        }
        console.log(line);
      }
    }
    console.log();
    return;
  }

  // Show all lists
  const statuses: TaskStatus[] = ['inbox', 'next', 'waiting', 'someday'];

  for (const s of statuses) {
    const tasks = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.status, s));

    console.log(`\n${i18n.status[s]} (${tasks.length})`);
    console.log('─'.repeat(40));

    if (tasks.length === 0) {
      console.log(`  ${i18n.commands.list.noTasks}`);
    } else {
      for (const task of tasks) {
        const shortId = task.id.slice(0, 8);
        let line = `  [${shortId}] ${task.title}`;
        if (task.waitingFor) {
          line += ` (${i18n.status.waiting.toLowerCase()}: ${task.waitingFor})`;
        }
        console.log(line);
      }
    }
  }
  console.log();
}

export async function listProjects(): Promise<void> {
  const db = getDb();
  const i18n = t();

  const allProjects = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.isProject, true));

  const projects = allProjects.filter(p => p.status !== 'done');

  console.log(`\n${i18n.projectStatus.active} (${projects.length})`);
  console.log('─'.repeat(40));

  if (projects.length === 0) {
    console.log(`  ${i18n.commands.list.noProjects}`);
  } else {
    for (const project of projects) {
      const childTasks = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.parentId, project.id));

      const activeTasks = childTasks.filter(t => t.status !== 'done').length;
      const shortId = project.id.slice(0, 8);
      console.log(`  [${shortId}] ${project.title} (${fmt(i18n.commands.list.tasks, { count: activeTasks })})`);
      if (project.description) {
        console.log(`            ${project.description}`);
      }
    }
  }
  console.log();
}
