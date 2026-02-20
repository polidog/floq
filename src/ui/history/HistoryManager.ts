import { v4 as uuidv4 } from 'uuid';
import { eq, desc, asc } from 'drizzle-orm';
import { getDb, schema } from '../../db/index.js';
import { deserializeCommand } from './commands/registry.js';
import type { UndoableCommand, HistoryState } from './types.js';
import { MAX_HISTORY_SIZE } from './types.js';

interface TrackedCommand {
  dbId: string;
  command: UndoableCommand;
}

/**
 * Manages undo/redo history using the Command Pattern
 * with DB persistence for crash-safe undo
 */
export class HistoryManager {
  private undoStack: TrackedCommand[] = [];
  private redoStack: TrackedCommand[] = [];
  private listeners: Set<() => void> = new Set();
  private initialized = false;

  /**
   * Initialize by loading history from DB
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      await this.loadFromDb();
    } catch {
      // DB may not have the table yet - that's OK, just use in-memory
    }
    this.initialized = true;
  }

  /**
   * Execute a command and add it to the undo stack
   */
  async execute(command: UndoableCommand): Promise<void> {
    await command.execute();

    const dbId = uuidv4();

    // Persist to DB
    try {
      const serialized = command.toJSON();
      const db = getDb();
      await db.insert(schema.operationHistory).values({
        id: dbId,
        commandType: serialized.type,
        commandData: JSON.stringify(serialized.data),
        executedAt: new Date(),
        isUndone: false,
      });
    } catch {
      // If DB write fails, in-memory undo still works
    }

    // Add to undo stack
    this.undoStack.push({ dbId, command });

    // Clear redo stack (new action invalidates redo history)
    // Also clean up DB records for redo items
    await this.clearRedoFromDb();
    this.redoStack = [];

    // Enforce max history size
    if (this.undoStack.length > MAX_HISTORY_SIZE) {
      const removed = this.undoStack.shift();
      if (removed) {
        try {
          const db = getDb();
          await db.delete(schema.operationHistory).where(eq(schema.operationHistory.id, removed.dbId));
        } catch {
          // ignore
        }
      }
    }

    this.notifyListeners();
  }

  /**
   * Undo the last command
   * @returns true if undo was performed, false if nothing to undo
   */
  async undo(): Promise<boolean> {
    const tracked = this.undoStack.pop();
    if (!tracked) {
      return false;
    }

    try {
      await tracked.command.undo();

      // Mark as undone in DB
      try {
        const db = getDb();
        await db.update(schema.operationHistory)
          .set({ isUndone: true })
          .where(eq(schema.operationHistory.id, tracked.dbId));
      } catch {
        // ignore DB errors
      }

      this.redoStack.push(tracked);
      this.notifyListeners();
      return true;
    } catch (error) {
      // Re-add command to undo stack if undo fails
      this.undoStack.push(tracked);
      throw error;
    }
  }

  /**
   * Redo the last undone command
   * @returns true if redo was performed, false if nothing to redo
   */
  async redo(): Promise<boolean> {
    const tracked = this.redoStack.pop();
    if (!tracked) {
      return false;
    }

    try {
      await tracked.command.execute();

      // Mark as not undone in DB
      try {
        const db = getDb();
        await db.update(schema.operationHistory)
          .set({ isUndone: false })
          .where(eq(schema.operationHistory.id, tracked.dbId));
      } catch {
        // ignore DB errors
      }

      this.undoStack.push(tracked);
      this.notifyListeners();
      return true;
    } catch (error) {
      // Re-add command to redo stack if redo fails
      this.redoStack.push(tracked);
      throw error;
    }
  }

  /**
   * Get the current history state
   */
  getState(): HistoryState {
    return {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      lastCommandDescription:
        this.undoStack.length > 0
          ? this.undoStack[this.undoStack.length - 1].command.description
          : null,
    };
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Get description of the command that would be undone
   */
  getUndoDescription(): string | null {
    return this.undoStack.length > 0
      ? this.undoStack[this.undoStack.length - 1].command.description
      : null;
  }

  /**
   * Get description of the command that would be redone
   */
  getRedoDescription(): string | null {
    return this.redoStack.length > 0
      ? this.redoStack[this.redoStack.length - 1].command.description
      : null;
  }

  /**
   * Clear all history
   */
  async clear(): Promise<void> {
    this.undoStack = [];
    this.redoStack = [];

    try {
      const db = getDb();
      await db.delete(schema.operationHistory);
    } catch {
      // ignore DB errors
    }

    this.notifyListeners();
  }

  /**
   * Subscribe to history changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async loadFromDb(): Promise<void> {
    const db = getDb();

    // Load undo stack: non-undone operations, oldest first
    const undoRows = await db
      .select()
      .from(schema.operationHistory)
      .where(eq(schema.operationHistory.isUndone, false))
      .orderBy(asc(schema.operationHistory.executedAt))
      .limit(MAX_HISTORY_SIZE);

    for (const row of undoRows) {
      try {
        const data = JSON.parse(row.commandData) as Record<string, unknown>;
        const command = deserializeCommand(row.commandType, data);
        this.undoStack.push({ dbId: row.id, command });
      } catch {
        // Skip commands that can't be deserialized
      }
    }

    // Load redo stack: undone operations, most recent first (so most recent undo is on top)
    const redoRows = await db
      .select()
      .from(schema.operationHistory)
      .where(eq(schema.operationHistory.isUndone, true))
      .orderBy(desc(schema.operationHistory.executedAt))
      .limit(MAX_HISTORY_SIZE);

    for (const row of redoRows) {
      try {
        const data = JSON.parse(row.commandData) as Record<string, unknown>;
        const command = deserializeCommand(row.commandType, data);
        this.redoStack.push({ dbId: row.id, command });
      } catch {
        // Skip commands that can't be deserialized
      }
    }
  }

  private async clearRedoFromDb(): Promise<void> {
    if (this.redoStack.length === 0) return;
    try {
      const db = getDb();
      for (const tracked of this.redoStack) {
        await db.delete(schema.operationHistory).where(eq(schema.operationHistory.id, tracked.dbId));
      }
    } catch {
      // ignore
    }
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

// Singleton instance
let historyManagerInstance: HistoryManager | null = null;

/**
 * Get the singleton HistoryManager instance
 */
export function getHistoryManager(): HistoryManager {
  if (!historyManagerInstance) {
    historyManagerInstance = new HistoryManager();
  }
  return historyManagerInstance;
}
