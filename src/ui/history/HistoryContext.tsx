import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { HistoryManager, getHistoryManager } from './HistoryManager.js';
import type { UndoableCommand, HistoryState } from './types.js';

interface HistoryContextValue {
  /** Execute a command and add to history */
  execute: (command: UndoableCommand) => Promise<void>;

  /** Undo the last command */
  undo: () => Promise<boolean>;

  /** Redo the last undone command */
  redo: () => Promise<boolean>;

  /** Check if undo is available */
  canUndo: boolean;

  /** Check if redo is available */
  canRedo: boolean;

  /** Get the current history state */
  state: HistoryState;

  /** Description of command that would be undone */
  undoDescription: string | null;

  /** Description of command that would be redone */
  redoDescription: string | null;
}

const HistoryContext = createContext<HistoryContextValue | null>(null);

interface HistoryProviderProps {
  children: React.ReactNode;
}

export function HistoryProvider({ children }: HistoryProviderProps): React.ReactElement {
  const manager = useMemo(() => getHistoryManager(), []);
  const [state, setState] = useState<HistoryState>(manager.getState());

  useEffect(() => {
    const unsubscribe = manager.subscribe(() => {
      setState(manager.getState());
    });
    return unsubscribe;
  }, [manager]);

  const execute = useCallback(
    async (command: UndoableCommand) => {
      await manager.execute(command);
    },
    [manager]
  );

  const undo = useCallback(async () => {
    return manager.undo();
  }, [manager]);

  const redo = useCallback(async () => {
    return manager.redo();
  }, [manager]);

  const value: HistoryContextValue = useMemo(
    () => ({
      execute,
      undo,
      redo,
      canUndo: manager.canUndo(),
      canRedo: manager.canRedo(),
      state,
      undoDescription: manager.getUndoDescription(),
      redoDescription: manager.getRedoDescription(),
    }),
    [execute, undo, redo, state, manager]
  );

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

/**
 * Hook to access history context
 */
export function useHistoryContext(): HistoryContextValue {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistoryContext must be used within a HistoryProvider');
  }
  return context;
}
