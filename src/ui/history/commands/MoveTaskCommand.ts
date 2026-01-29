import { eq } from 'drizzle-orm';
import { getDb, schema } from '../../../db/index.js';
import type { UndoableCommand } from '../types.js';
import type { TaskStatus } from '../../../db/schema.js';

interface MoveTaskParams {
  taskId: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  fromWaitingFor: string | null;
  toWaitingFor: string | null;
  description: string;
}

/**
 * Command to move a task to a different status
 */
export class MoveTaskCommand implements UndoableCommand {
  readonly description: string;
  private readonly taskId: string;
  private readonly fromStatus: TaskStatus;
  private readonly toStatus: TaskStatus;
  private readonly fromWaitingFor: string | null;
  private readonly toWaitingFor: string | null;

  constructor(params: MoveTaskParams) {
    this.taskId = params.taskId;
    this.fromStatus = params.fromStatus;
    this.toStatus = params.toStatus;
    this.fromWaitingFor = params.fromWaitingFor;
    this.toWaitingFor = params.toWaitingFor;
    this.description = params.description;
  }

  async execute(): Promise<void> {
    const db = getDb();
    await db
      .update(schema.tasks)
      .set({
        status: this.toStatus,
        waitingFor: this.toWaitingFor,
        updatedAt: new Date(),
      })
      .where(eq(schema.tasks.id, this.taskId));
  }

  async undo(): Promise<void> {
    const db = getDb();
    await db
      .update(schema.tasks)
      .set({
        status: this.fromStatus,
        waitingFor: this.fromWaitingFor,
        updatedAt: new Date(),
      })
      .where(eq(schema.tasks.id, this.taskId));
  }
}
