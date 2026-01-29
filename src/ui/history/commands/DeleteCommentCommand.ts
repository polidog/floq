import { eq } from 'drizzle-orm';
import { getDb, schema } from '../../../db/index.js';
import type { UndoableCommand } from '../types.js';
import type { Comment } from '../../../db/schema.js';

interface DeleteCommentParams {
  comment: Comment;
  description: string;
}

/**
 * Command to delete a comment
 */
export class DeleteCommentCommand implements UndoableCommand {
  readonly description: string;
  private readonly comment: Comment;

  constructor(params: DeleteCommentParams) {
    this.comment = params.comment;
    this.description = params.description;
  }

  async execute(): Promise<void> {
    const db = getDb();
    await db.delete(schema.comments).where(eq(schema.comments.id, this.comment.id));
  }

  async undo(): Promise<void> {
    const db = getDb();
    await db.insert(schema.comments).values({
      id: this.comment.id,
      taskId: this.comment.taskId,
      content: this.comment.content,
      createdAt: this.comment.createdAt,
    });
  }
}
