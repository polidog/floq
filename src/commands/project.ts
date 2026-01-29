import { v4 as uuidv4 } from 'uuid';
import { eq, like, and } from 'drizzle-orm';
import { getDb, schema } from '../db/index.js';
import { t, fmt } from '../i18n/index.js';

interface AddProjectOptions {
  description?: string;
}

export async function addProject(name: string, options: AddProjectOptions): Promise<void> {
  const db = getDb();
  const now = new Date();
  const i18n = t();

  // Check if project already exists
  const existingProjects = await db
    .select()
    .from(schema.tasks)
    .where(and(eq(schema.tasks.title, name), eq(schema.tasks.isProject, true)));

  if (existingProjects.length > 0) {
    console.error(fmt(i18n.commands.project.alreadyExists, { name }));
    process.exit(1);
  }

  const project: schema.NewTask = {
    id: uuidv4(),
    title: name,
    description: options.description,
    status: 'next',
    isProject: true,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(schema.tasks).values(project);

  console.log(fmt(i18n.commands.project.created, { name }));
}

export async function listProjectsCommand(): Promise<void> {
  const db = getDb();
  const i18n = t();

  const statuses = ['next', 'someday', 'done'] as const;
  const statusLabels = {
    next: i18n.projectStatus.active,
    someday: i18n.projectStatus.someday,
    done: i18n.projectStatus.completed,
  };

  for (const status of statuses) {
    const projects = await db
      .select()
      .from(schema.tasks)
      .where(and(eq(schema.tasks.isProject, true), eq(schema.tasks.status, status)));

    if (projects.length === 0 && status !== 'next') continue;

    console.log(`\n${statusLabels[status]} (${projects.length})`);
    console.log('─'.repeat(40));

    if (projects.length === 0) {
      console.log(`  ${i18n.commands.project.noProjects}`);
    } else {
      for (const project of projects) {
        const childTasks = await db
          .select()
          .from(schema.tasks)
          .where(eq(schema.tasks.parentId, project.id));

        const activeTasks = childTasks.filter(t => t.status !== 'done').length;
        const doneTasks = childTasks.filter(t => t.status === 'done').length;
        const shortId = project.id.slice(0, 8);
        console.log(`  [${shortId}] ${project.title} (${fmt(i18n.commands.list.activeDone, { active: activeTasks, done: doneTasks })})`);
        if (project.description) {
          console.log(`            ${project.description}`);
        }
      }
    }
  }
  console.log();
}

export async function showProject(projectId: string): Promise<void> {
  const db = getDb();
  const i18n = t();

  // Find project by ID prefix or name
  let projects = await db
    .select()
    .from(schema.tasks)
    .where(and(eq(schema.tasks.isProject, true), like(schema.tasks.id, `${projectId}%`)));

  if (projects.length === 0) {
    projects = await db
      .select()
      .from(schema.tasks)
      .where(and(eq(schema.tasks.isProject, true), eq(schema.tasks.title, projectId)));
  }

  if (projects.length === 0) {
    console.error(fmt(i18n.commands.project.notFound, { id: projectId }));
    process.exit(1);
  }

  if (projects.length > 1) {
    console.error(fmt(i18n.commands.project.multipleMatch, { id: projectId }));
    for (const project of projects) {
      console.error(`  [${project.id.slice(0, 8)}] ${project.title}`);
    }
    process.exit(1);
  }

  const project = projects[0];
  const childTasks = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.parentId, project.id));

  console.log(`\nProject: ${project.title}`);
  console.log('─'.repeat(40));
  if (project.description) {
    console.log(fmt(i18n.commands.project.description, { description: project.description }));
  }
  console.log(fmt(i18n.commands.project.statusLabel, { status: project.status }));
  console.log(fmt(i18n.commands.project.tasksCount, { count: childTasks.length }));
  console.log();

  const groupedTasks = {
    inbox: childTasks.filter(t => t.status === 'inbox'),
    next: childTasks.filter(t => t.status === 'next'),
    waiting: childTasks.filter(t => t.status === 'waiting'),
    someday: childTasks.filter(t => t.status === 'someday'),
    done: childTasks.filter(t => t.status === 'done'),
  };

  for (const [status, statusTasks] of Object.entries(groupedTasks)) {
    if (statusTasks.length === 0) continue;

    console.log(`  ${i18n.status[status as keyof typeof i18n.status]}:`);
    for (const task of statusTasks) {
      const shortId = task.id.slice(0, 8);
      let line = `    [${shortId}] ${task.title}`;
      if (task.waitingFor) {
        line += ` (${i18n.status.waiting.toLowerCase()}: ${task.waitingFor})`;
      }
      console.log(line);
    }
  }
  console.log();
}

export async function completeProject(projectId: string): Promise<void> {
  const db = getDb();
  const i18n = t();

  const projects = await db
    .select()
    .from(schema.tasks)
    .where(and(eq(schema.tasks.isProject, true), like(schema.tasks.id, `${projectId}%`)));

  if (projects.length === 0) {
    console.error(fmt(i18n.commands.project.notFound, { id: projectId }));
    process.exit(1);
  }

  if (projects.length > 1) {
    console.error(fmt(i18n.commands.project.multipleMatch, { id: projectId }));
    process.exit(1);
  }

  const project = projects[0];

  await db.update(schema.tasks)
    .set({
      status: 'done',
      updatedAt: new Date(),
    })
    .where(eq(schema.tasks.id, project.id));

  console.log(fmt(i18n.commands.project.completed, { name: project.title }));
}
