import { eq } from 'drizzle-orm';
import { getDb, schema } from '../../../db/index.js';
import type { UndoableCommand } from '../types.js';

interface LinkTaskParams {
  taskId: string;
  fromParentId: string | null;
  toParentId: string | null;
  description: string;
}

/**
 * Command to link/unlink a task to a project
 */
export class LinkTaskCommand implements UndoableCommand {
  readonly description: string;
  private readonly taskId: string;
  private readonly fromParentId: string | null;
  private readonly toParentId: string | null;

  constructor(params: LinkTaskParams) {
    this.taskId = params.taskId;
    this.fromParentId = params.fromParentId;
    this.toParentId = params.toParentId;
    this.description = params.description;
  }

  async execute(): Promise<void> {
    const db = getDb();
    await db
      .update(schema.tasks)
      .set({
        parentId: this.toParentId,
        updatedAt: new Date(),
      })
      .where(eq(schema.tasks.id, this.taskId));
  }

  async undo(): Promise<void> {
    const db = getDb();
    await db
      .update(schema.tasks)
      .set({
        parentId: this.fromParentId,
        updatedAt: new Date(),
      })
      .where(eq(schema.tasks.id, this.taskId));
  }
}
