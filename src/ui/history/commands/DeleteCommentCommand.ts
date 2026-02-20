import { eq } from 'drizzle-orm';
import { getDb, schema } from '../../../db/index.js';
import type { UndoableCommand, SerializedCommand } from '../types.js';
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

  toJSON(): SerializedCommand {
    return {
      type: 'delete_comment',
      data: {
        comment: {
          ...this.comment,
          createdAt: this.comment.createdAt.toISOString(),
        },
        description: this.description,
      },
    };
  }

  static fromJSON(json: { data: Record<string, unknown> }): DeleteCommentCommand {
    const commentData = json.data.comment as Record<string, unknown>;
    return new DeleteCommentCommand({
      comment: {
        ...commentData,
        createdAt: new Date(commentData.createdAt as string),
      } as Comment,
      description: json.data.description as string,
    });
  }
}
