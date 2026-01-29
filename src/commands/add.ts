import { v4 as uuidv4 } from 'uuid';
import { eq, and } from 'drizzle-orm';
import { getDb, schema } from '../db/index.js';
import { t, fmt } from '../i18n/index.js';

interface AddOptions {
  project?: string;
  description?: string;
}

export async function addTask(title: string, options: AddOptions): Promise<void> {
  const db = getDb();
  const now = new Date();
  const i18n = t();

  let parentId: string | undefined;

  if (options.project) {
    const projects = await db
      .select()
      .from(schema.tasks)
      .where(and(eq(schema.tasks.isProject, true), eq(schema.tasks.title, options.project)));

    if (projects.length === 0) {
      console.error(fmt(i18n.commands.add.projectNotFound, { project: options.project }));
      process.exit(1);
    }
    parentId = projects[0].id;
  }

  const task: schema.NewTask = {
    id: uuidv4(),
    title,
    description: options.description,
    status: 'inbox',
    parentId,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(schema.tasks).values(task);

  console.log(fmt(i18n.commands.add.success, { title }));
  if (parentId) {
    console.log(fmt(i18n.commands.add.withProject, { project: options.project! }));
  }
}
