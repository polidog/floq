import type { UndoableCommand, HistoryState } from './types.js';
import { MAX_HISTORY_SIZE } from './types.js';

/**
 * Manages undo/redo history using the Command Pattern
 */
export class HistoryManager {
  private undoStack: UndoableCommand[] = [];
  private redoStack: UndoableCommand[] = [];
  private listeners: Set<() => void> = new Set();

  /**
   * Execute a command and add it to the undo stack
   */
  async execute(command: UndoableCommand): Promise<void> {
    await command.execute();

    // Add to undo stack
    this.undoStack.push(command);

    // Clear redo stack (new action invalidates redo history)
    this.redoStack = [];

    // Enforce max history size
    if (this.undoStack.length > MAX_HISTORY_SIZE) {
      this.undoStack.shift();
    }

    this.notifyListeners();
  }

  /**
   * Undo the last command
   * @returns true if undo was performed, false if nothing to undo
   */
  async undo(): Promise<boolean> {
    const command = this.undoStack.pop();
    if (!command) {
      return false;
    }

    try {
      await command.undo();
      this.redoStack.push(command);
      this.notifyListeners();
      return true;
    } catch (error) {
      // Re-add command to undo stack if undo fails
      this.undoStack.push(command);
      throw error;
    }
  }

  /**
   * Redo the last undone command
   * @returns true if redo was performed, false if nothing to redo
   */
  async redo(): Promise<boolean> {
    const command = this.redoStack.pop();
    if (!command) {
      return false;
    }

    try {
      await command.execute();
      this.undoStack.push(command);
      this.notifyListeners();
      return true;
    } catch (error) {
      // Re-add command to redo stack if redo fails
      this.redoStack.push(command);
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
          ? this.undoStack[this.undoStack.length - 1].description
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
      ? this.undoStack[this.undoStack.length - 1].description
      : null;
  }

  /**
   * Get description of the command that would be redone
   */
  getRedoDescription(): string | null {
    return this.redoStack.length > 0
      ? this.redoStack[this.redoStack.length - 1].description
      : null;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notifyListeners();
  }

  /**
   * Subscribe to history changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
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
