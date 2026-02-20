import { eq } from 'drizzle-orm';
import { getDb, schema } from '../../../db/index.js';
import type { UndoableCommand, SerializedCommand } from '../types.js';
import type { TaskStatus } from '../../../db/schema.js';

interface MoveTaskParams {
  taskId: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  fromWaitingFor: string | null;
  toWaitingFor: string | null;
  fromCompletedAt: Date | null;
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
  private readonly fromCompletedAt: Date | null;

  constructor(params: MoveTaskParams) {
    this.taskId = params.taskId;
    this.fromStatus = params.fromStatus;
    this.toStatus = params.toStatus;
    this.fromWaitingFor = params.fromWaitingFor;
    this.toWaitingFor = params.toWaitingFor;
    this.fromCompletedAt = params.fromCompletedAt;
    this.description = params.description;
  }

  async execute(): Promise<void> {
    const db = getDb();
    await db
      .update(schema.tasks)
      .set({
        status: this.toStatus,
        waitingFor: this.toWaitingFor,
        completedAt: this.toStatus === 'done' ? new Date() : null,
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
        completedAt: this.fromCompletedAt,
        updatedAt: new Date(),
      })
      .where(eq(schema.tasks.id, this.taskId));
  }

  toJSON(): SerializedCommand {
    return {
      type: 'move_task',
      data: {
        taskId: this.taskId,
        fromStatus: this.fromStatus,
        toStatus: this.toStatus,
        fromWaitingFor: this.fromWaitingFor,
        toWaitingFor: this.toWaitingFor,
        fromCompletedAt: this.fromCompletedAt ? this.fromCompletedAt.toISOString() : null,
        description: this.description,
      },
    };
  }

  static fromJSON(json: { data: Record<string, unknown> }): MoveTaskCommand {
    const data = json.data;
    return new MoveTaskCommand({
      ...data,
      fromCompletedAt: data.fromCompletedAt ? new Date(data.fromCompletedAt as string) : null,
    } as unknown as MoveTaskParams);
  }
}
