import { eq } from 'drizzle-orm';
import { getDb, schema } from '../../../db/index.js';
import type { UndoableCommand, SerializedCommand } from '../types.js';

interface SetEffortParams {
  taskId: string;
  fromEffort: string | null;
  toEffort: string | null;
  description: string;
}

/**
 * Command to set/change a task's effort size
 */
export class SetEffortCommand implements UndoableCommand {
  readonly description: string;
  private readonly taskId: string;
  private readonly fromEffort: string | null;
  private readonly toEffort: string | null;

  constructor(params: SetEffortParams) {
    this.taskId = params.taskId;
    this.fromEffort = params.fromEffort;
    this.toEffort = params.toEffort;
    this.description = params.description;
  }

  async execute(): Promise<void> {
    const db = getDb();
    await db
      .update(schema.tasks)
      .set({
        effort: this.toEffort,
        updatedAt: new Date(),
      })
      .where(eq(schema.tasks.id, this.taskId));
  }

  async undo(): Promise<void> {
    const db = getDb();
    await db
      .update(schema.tasks)
      .set({
        effort: this.fromEffort,
        updatedAt: new Date(),
      })
      .where(eq(schema.tasks.id, this.taskId));
  }

  toJSON(): SerializedCommand {
    return {
      type: 'set_effort',
      data: {
        taskId: this.taskId,
        fromEffort: this.fromEffort,
        toEffort: this.toEffort,
        description: this.description,
      },
    };
  }

  static fromJSON(json: { data: Record<string, unknown> }): SetEffortCommand {
    return new SetEffortCommand(json.data as unknown as SetEffortParams);
  }
}
