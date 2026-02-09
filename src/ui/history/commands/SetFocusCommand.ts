import { eq } from 'drizzle-orm';
import { getDb, schema } from '../../../db/index.js';
import type { UndoableCommand } from '../types.js';

interface SetFocusParams {
  taskId: string;
  fromFocused: boolean;
  toFocused: boolean;
  description: string;
}

/**
 * Command to toggle a task's focus state
 */
export class SetFocusCommand implements UndoableCommand {
  readonly description: string;
  private readonly taskId: string;
  private readonly fromFocused: boolean;
  private readonly toFocused: boolean;

  constructor(params: SetFocusParams) {
    this.taskId = params.taskId;
    this.fromFocused = params.fromFocused;
    this.toFocused = params.toFocused;
    this.description = params.description;
  }

  async execute(): Promise<void> {
    const db = getDb();
    await db
      .update(schema.tasks)
      .set({
        isFocused: this.toFocused,
        updatedAt: new Date(),
      })
      .where(eq(schema.tasks.id, this.taskId));
  }

  async undo(): Promise<void> {
    const db = getDb();
    await db
      .update(schema.tasks)
      .set({
        isFocused: this.fromFocused,
        updatedAt: new Date(),
      })
      .where(eq(schema.tasks.id, this.taskId));
  }
}
