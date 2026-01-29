import { eq } from 'drizzle-orm';
import { getDb, schema } from '../../../db/index.js';
import type { UndoableCommand } from '../types.js';
import type { NewTask } from '../../../db/schema.js';

interface CreateTaskParams {
  task: NewTask;
  description: string;
}

/**
 * Command to create a new task
 */
export class CreateTaskCommand implements UndoableCommand {
  readonly description: string;
  private readonly task: NewTask;
  private createdTaskId: string;

  constructor(params: CreateTaskParams) {
    this.task = params.task;
    this.description = params.description;
    this.createdTaskId = params.task.id!;
  }

  async execute(): Promise<void> {
    const db = getDb();
    await db.insert(schema.tasks).values(this.task);
  }

  async undo(): Promise<void> {
    const db = getDb();
    // Delete the created task
    await db.delete(schema.tasks).where(eq(schema.tasks.id, this.createdTaskId));
  }
}
