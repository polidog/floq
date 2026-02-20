import { eq } from 'drizzle-orm';
import { getDb, schema } from '../../../db/index.js';
import type { UndoableCommand, SerializedCommand } from '../types.js';

interface SetContextParams {
  taskId: string;
  fromContext: string | null;
  toContext: string | null;
  description: string;
}

/**
 * Command to set/change a task's context
 */
export class SetContextCommand implements UndoableCommand {
  readonly description: string;
  private readonly taskId: string;
  private readonly fromContext: string | null;
  private readonly toContext: string | null;

  constructor(params: SetContextParams) {
    this.taskId = params.taskId;
    this.fromContext = params.fromContext;
    this.toContext = params.toContext;
    this.description = params.description;
  }

  async execute(): Promise<void> {
    const db = getDb();
    await db
      .update(schema.tasks)
      .set({
        context: this.toContext,
        updatedAt: new Date(),
      })
      .where(eq(schema.tasks.id, this.taskId));
  }

  async undo(): Promise<void> {
    const db = getDb();
    await db
      .update(schema.tasks)
      .set({
        context: this.fromContext,
        updatedAt: new Date(),
      })
      .where(eq(schema.tasks.id, this.taskId));
  }

  toJSON(): SerializedCommand {
    return {
      type: 'set_context',
      data: {
        taskId: this.taskId,
        fromContext: this.fromContext,
        toContext: this.toContext,
        description: this.description,
      },
    };
  }

  static fromJSON(json: { data: Record<string, unknown> }): SetContextCommand {
    return new SetContextCommand(json.data as unknown as SetContextParams);
  }
}
