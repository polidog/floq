/**
 * Interface for undoable commands (Command Pattern)
 */
export interface UndoableCommand {
  /** Human-readable description of the command for display */
  readonly description: string;

  /** Execute the command */
  execute(): Promise<void>;

  /** Undo the command (reverse the operation) */
  undo(): Promise<void>;
}

/**
 * State of the history manager
 */
export interface HistoryState {
  /** Number of commands that can be undone */
  undoCount: number;

  /** Number of commands that can be redone */
  redoCount: number;

  /** Description of the last executed command (if any) */
  lastCommandDescription: string | null;
}

/**
 * Maximum number of commands to keep in history
 */
export const MAX_HISTORY_SIZE = 50;
