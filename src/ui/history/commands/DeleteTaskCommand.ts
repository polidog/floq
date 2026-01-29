import { eq } from 'drizzle-orm';
import { getDb, schema } from '../../../db/index.js';
import type { UndoableCommand } from '../types.js';
import type { Task, Comment } from '../../../db/schema.js';

interface DeleteTaskParams {
  task: Task;
  description: string;
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
}
