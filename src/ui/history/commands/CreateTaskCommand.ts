import { eq } from 'drizzle-orm';
import { getDb, schema } from '../../../db/index.js';
import type { UndoableCommand, SerializedCommand } from '../types.js';
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
    await db.delete(schema.tasks).where(eq(schema.tasks.id, this.createdTaskId));
  }

  toJSON(): SerializedCommand {
    return {
      type: 'create_task',
      data: {
        task: {
          ...this.task,
          dueDate: this.task.dueDate instanceof Date ? this.task.dueDate.toISOString() : this.task.dueDate ?? null,
          createdAt: this.task.createdAt instanceof Date ? this.task.createdAt.toISOString() : this.task.createdAt,
          updatedAt: this.task.updatedAt instanceof Date ? this.task.updatedAt.toISOString() : this.task.updatedAt,
        },
        description: this.description,
      },
    };
  }

  static fromJSON(json: { data: Record<string, unknown> }): CreateTaskCommand {
    const taskData = json.data.task as Record<string, unknown>;
    return new CreateTaskCommand({
      task: {
        ...taskData,
        dueDate: taskData.dueDate ? new Date(taskData.dueDate as string) : null,
        createdAt: new Date(taskData.createdAt as string),
        updatedAt: new Date(taskData.updatedAt as string),
      } as NewTask,
      description: json.data.description as string,
    });
  }
}
