import { eq } from 'drizzle-orm';
import { getDb, schema } from '../../../db/index.js';
import type { UndoableCommand } from '../types.js';
import type { TaskStatus } from '../../../db/schema.js';

interface ConvertToProjectParams {
  taskId: string;
  originalStatus: TaskStatus;
  description: string;
}

/**
 * Command to convert a task to a project
 */
export class ConvertToProjectCommand implements UndoableCommand {
  readonly description: string;
  private readonly taskId: string;
  private readonly originalStatus: TaskStatus;

  constructor(params: ConvertToProjectParams) {
    this.taskId = params.taskId;
    this.originalStatus = params.originalStatus;
    this.description = params.description;
  }

  async execute(): Promise<void> {
    const db = getDb();
    await db
      .update(schema.tasks)
      .set({
        isProject: true,
        status: 'next',
        updatedAt: new Date(),
      })
      .where(eq(schema.tasks.id, this.taskId));
  }

  async undo(): Promise<void> {
    const db = getDb();
    await db
      .update(schema.tasks)
      .set({
        isProject: false,
        status: this.originalStatus,
        updatedAt: new Date(),
      })
      .where(eq(schema.tasks.id, this.taskId));
  }
}
