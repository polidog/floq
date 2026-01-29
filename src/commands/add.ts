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
    const project = db
      .select()
      .from(schema.tasks)
      .where(and(eq(schema.tasks.isProject, true), eq(schema.tasks.title, options.project)))
      .get();

    if (!project) {
      console.error(fmt(i18n.commands.add.projectNotFound, { project: options.project }));
      process.exit(1);
    }
    parentId = project.id;
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

  db.insert(schema.tasks).values(task).run();

  console.log(fmt(i18n.commands.add.success, { title }));
  if (parentId) {
    console.log(fmt(i18n.commands.add.withProject, { project: options.project! }));
  }
}
