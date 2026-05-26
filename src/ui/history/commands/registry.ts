import type { UndoableCommand } from '../types.js';
import { CreateTaskCommand } from './CreateTaskCommand.js';
import { DeleteTaskCommand } from './DeleteTaskCommand.js';
import { DeleteProjectCommand } from './DeleteProjectCommand.js';
import { MoveTaskCommand } from './MoveTaskCommand.js';
import { LinkTaskCommand } from './LinkTaskCommand.js';
import { ConvertToProjectCommand } from './ConvertToProjectCommand.js';
import { CreateCommentCommand } from './CreateCommentCommand.js';
import { DeleteCommentCommand } from './DeleteCommentCommand.js';
import { SetContextCommand } from './SetContextCommand.js';
import { SetFocusCommand } from './SetFocusCommand.js';
import { SetEffortCommand } from './SetEffortCommand.js';

type CommandDeserializer = (data: Record<string, unknown>) => UndoableCommand;

const registry: Record<string, CommandDeserializer> = {
  'create_task': (data) => CreateTaskCommand.fromJSON({ data }),
  'delete_task': (data) => DeleteTaskCommand.fromJSON({ data }),
  'delete_project': (data) => DeleteProjectCommand.fromJSON({ data }),
  'move_task': (data) => MoveTaskCommand.fromJSON({ data }),
  'link_task': (data) => LinkTaskCommand.fromJSON({ data }),
  'convert_to_project': (data) => ConvertToProjectCommand.fromJSON({ data }),
  'create_comment': (data) => CreateCommentCommand.fromJSON({ data }),
  'delete_comment': (data) => DeleteCommentCommand.fromJSON({ data }),
  'set_context': (data) => SetContextCommand.fromJSON({ data }),
  'set_focus': (data) => SetFocusCommand.fromJSON({ data }),
  'set_effort': (data) => SetEffortCommand.fromJSON({ data }),
};

export function deserializeCommand(type: string, data: Record<string, unknown>): UndoableCommand {
  const deserializer = registry[type];
  if (!deserializer) throw new Error(`Unknown command type: ${type}`);
  return deserializer(data);
}
