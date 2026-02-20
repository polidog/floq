import { eq } from 'drizzle-orm';
import { getDb, schema } from '../../../db/index.js';
import type { UndoableCommand, SerializedCommand } from '../types.js';
import type { NewComment } from '../../../db/schema.js';

interface CreateCommentParams {
  comment: NewComment;
  description: string;
}

/**
 * Command to create a new comment
 */
export class CreateCommentCommand implements UndoableCommand {
  readonly description: string;
  private readonly comment: NewComment;
  private createdCommentId: string;

  constructor(params: CreateCommentParams) {
    this.comment = params.comment;
    this.description = params.description;
    this.createdCommentId = params.comment.id!;
  }

  async execute(): Promise<void> {
    const db = getDb();
    await db.insert(schema.comments).values(this.comment);
  }

  async undo(): Promise<void> {
    const db = getDb();
    await db.delete(schema.comments).where(eq(schema.comments.id, this.createdCommentId));
  }

  toJSON(): SerializedCommand {
    return {
      type: 'create_comment',
      data: {
        comment: {
          ...this.comment,
          createdAt: this.comment.createdAt instanceof Date ? this.comment.createdAt.toISOString() : this.comment.createdAt,
        },
        description: this.description,
      },
    };
  }

  static fromJSON(json: { data: Record<string, unknown> }): CreateCommentCommand {
    const commentData = json.data.comment as Record<string, unknown>;
    return new CreateCommentCommand({
      comment: {
        ...commentData,
        createdAt: new Date(commentData.createdAt as string),
      } as NewComment,
      description: json.data.description as string,
    });
  }
}
