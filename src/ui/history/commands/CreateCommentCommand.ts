import { eq } from 'drizzle-orm';
import { getDb, schema } from '../../../db/index.js';
import type { UndoableCommand } from '../types.js';
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
}
