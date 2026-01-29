// Types
export type { UndoableCommand, HistoryState } from './types.js';
export { MAX_HISTORY_SIZE } from './types.js';

// Manager
export { HistoryManager, getHistoryManager } from './HistoryManager.js';

// React integration
export { HistoryProvider, useHistoryContext } from './HistoryContext.js';
export { useHistory } from './useHistory.js';

// Commands
export {
  CreateTaskCommand,
  DeleteTaskCommand,
  MoveTaskCommand,
  LinkTaskCommand,
  ConvertToProjectCommand,
  CreateCommentCommand,
  DeleteCommentCommand,
} from './commands/index.js';
