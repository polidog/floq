import { eq } from 'drizzle-orm';
import { getDb, schema } from '../../../db/index.js';
import type { UndoableCommand, SerializedCommand } from '../types.js';
import type { Task, Comment } from '../../../db/schema.js';

interface DeleteTaskParams {
  task: Task;
  description: string;
  savedComments?: Comment[];
}

/**
 * Command to delete a task (and its comments)
 */
export class DeleteTaskCommand implements UndoableCommand {
  readonly description: string;
  private readonly task: Task;
  private savedComments: Comment[] = [];

  constructor(params: DeleteTaskParams) {
    this.task = params.task;
    this.description = params.description;
    if (params.savedComments) {
      this.savedComments = params.savedComments;
    }
  }

  async execute(): Promise<void> {
    const db = getDb();

    // Save comments before deleting
    this.savedComments = await db
      .select()
      .from(schema.comments)
      .where(eq(schema.comments.taskId, this.task.id));

    // Delete comments first
    await db.delete(schema.comments).where(eq(schema.comments.taskId, this.task.id));

    // Delete the task
    await db.delete(schema.tasks).where(eq(schema.tasks.id, this.task.id));
  }

  async undo(): Promise<void> {
    const db = getDb();

    // Restore the task
    await db.insert(schema.tasks).values({
      id: this.task.id,
      title: this.task.title,
      description: this.task.description,
      status: this.task.status,
      isProject: this.task.isProject,
      parentId: this.task.parentId,
      waitingFor: this.task.waitingFor,
      dueDate: this.task.dueDate,
      createdAt: this.task.createdAt,
      updatedAt: this.task.updatedAt,
    });

    // Restore comments
    for (const comment of this.savedComments) {
      await db.insert(schema.comments).values({
        id: comment.id,
        taskId: comment.taskId,
        content: comment.content,
        createdAt: comment.createdAt,
      });
    }
  }

  toJSON(): SerializedCommand {
    return {
      type: 'delete_task',
      data: {
        task: {
          ...this.task,
          dueDate: this.task.dueDate ? this.task.dueDate.toISOString() : null,
          createdAt: this.task.createdAt.toISOString(),
          updatedAt: this.task.updatedAt.toISOString(),
        },
        savedComments: this.savedComments.map(c => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
        })),
        description: this.description,
      },
    };
  }

  static fromJSON(json: { data: Record<string, unknown> }): DeleteTaskCommand {
    const taskData = json.data.task as Record<string, unknown>;
    const commentsData = (json.data.savedComments as Record<string, unknown>[]) || [];
    return new DeleteTaskCommand({
      task: {
        ...taskData,
        dueDate: taskData.dueDate ? new Date(taskData.dueDate as string) : null,
        createdAt: new Date(taskData.createdAt as string),
        updatedAt: new Date(taskData.updatedAt as string),
      } as Task,
      savedComments: commentsData.map(c => ({
        ...c,
        createdAt: new Date(c.createdAt as string),
      })) as Comment[],
      description: json.data.description as string,
    });
  }
}
