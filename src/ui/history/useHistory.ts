import { useCallback } from 'react';
import { useHistoryContext } from './HistoryContext.js';
import type { UndoableCommand } from './types.js';

/**
 * Hook for undo/redo functionality
 */
export function useHistory() {
  const { execute, undo, redo, canUndo, canRedo, state, undoDescription, redoDescription } =
    useHistoryContext();

  const executeCommand = useCallback(
    async (command: UndoableCommand) => {
      await execute(command);
    },
    [execute]
  );

  return {
    /** Execute a command and add to history */
    execute: executeCommand,

    /** Undo the last command */
    undo,

    /** Redo the last undone command */
    redo,

    /** Whether undo is available */
    canUndo,

    /** Whether redo is available */
    canRedo,

    /** Number of commands that can be undone */
    undoCount: state.undoCount,

    /** Number of commands that can be redone */
    redoCount: state.redoCount,

    /** Description of what would be undone */
    undoDescription,

    /** Description of what would be redone */
    redoDescription,
  };
}
