import { eq } from 'drizzle-orm';
import { getDb, schema } from '../../../db/index.js';
import { deleteProject, type ProjectDeleteMode } from '../../../db/projectDelete.js';
import type { UndoableCommand, SerializedCommand } from '../types.js';
import type { Task, Comment } from '../../../db/schema.js';

interface DeleteProjectParams {
  project: Task;
  mode: ProjectDeleteMode;
  description: string;
  deletedTasks?: Task[];
  movedTasks?: Task[];
  deletedComments?: Comment[];
}

function taskToValues(task: Task): schema.NewTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    isProject: task.isProject,
    parentId: task.parentId,
    waitingFor: task.waitingFor,
    context: task.context,
    isFocused: task.isFocused,
    effort: task.effort,
    dueDate: task.dueDate,
    completedAt: task.completedAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

function serializeTask(task: Task): Record<string, unknown> {
  return {
    ...task,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

function deserializeTask(data: Record<string, unknown>): Task {
  return {
    ...data,
    dueDate: data.dueDate ? new Date(data.dueDate as string) : null,
    completedAt: data.completedAt ? new Date(data.completedAt as string) : null,
    createdAt: new Date(data.createdAt as string),
    updatedAt: new Date(data.updatedAt as string),
  } as Task;
}

/**
 * Command to delete a project, handling its child tasks via `mode`
 * (cascade = delete children too, keep = move children back to Inbox).
 */
export class DeleteProjectCommand implements UndoableCommand {
  readonly description: string;
  private readonly project: Task;
  private readonly mode: ProjectDeleteMode;
  private deletedTasks: Task[] = [];
  private movedTasks: Task[] = [];
  private deletedComments: Comment[] = [];

  constructor(params: DeleteProjectParams) {
    this.project = params.project;
    this.mode = params.mode;
    this.description = params.description;
    if (params.deletedTasks) this.deletedTasks = params.deletedTasks;
    if (params.movedTasks) this.movedTasks = params.movedTasks;
    if (params.deletedComments) this.deletedComments = params.deletedComments;
  }

  async execute(): Promise<void> {
    const result = await deleteProject(this.project, this.mode);
    this.deletedTasks = result.deletedTasks;
    this.movedTasks = result.movedTasks;
    this.deletedComments = result.deletedComments;
  }

  async undo(): Promise<void> {
    const db = getDb();

    // Restore the project.
    await db.insert(schema.tasks).values(taskToValues(this.project));

    if (this.mode === 'cascade') {
      // Re-create deleted child tasks.
      for (const task of this.deletedTasks) {
        await db.insert(schema.tasks).values(taskToValues(task));
      }
    } else {
      // Re-link moved children and restore their original status.
      for (const task of this.movedTasks) {
        await db
          .update(schema.tasks)
          .set({
            parentId: task.parentId,
            status: task.status,
            updatedAt: task.updatedAt,
          })
          .where(eq(schema.tasks.id, task.id));
      }
    }

    // Restore deleted comments.
    for (const comment of this.deletedComments) {
      await db.insert(schema.comments).values({
        id: comment.id,
        taskId: comment.taskId,
        content: comment.content,
        createdAt: comment.createdAt,
      });
    }
  }

  toJSON(): SerializedCommand {
    return {
      type: 'delete_project',
      data: {
        project: serializeTask(this.project),
        mode: this.mode,
        deletedTasks: this.deletedTasks.map(serializeTask),
        movedTasks: this.movedTasks.map(serializeTask),
        deletedComments: this.deletedComments.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
        })),
        description: this.description,
      },
    };
  }

  static fromJSON(json: { data: Record<string, unknown> }): DeleteProjectCommand {
    const deletedTasksData = (json.data.deletedTasks as Record<string, unknown>[]) || [];
    const movedTasksData = (json.data.movedTasks as Record<string, unknown>[]) || [];
    const commentsData = (json.data.deletedComments as Record<string, unknown>[]) || [];
    return new DeleteProjectCommand({
      project: deserializeTask(json.data.project as Record<string, unknown>),
      mode: json.data.mode as ProjectDeleteMode,
      deletedTasks: deletedTasksData.map(deserializeTask),
      movedTasks: movedTasksData.map(deserializeTask),
      deletedComments: commentsData.map((c) => ({
        ...c,
        createdAt: new Date(c.createdAt as string),
      })) as Comment[],
      description: json.data.description as string,
    });
  }
}
