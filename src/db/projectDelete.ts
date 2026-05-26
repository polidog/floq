import { eq } from 'drizzle-orm';
import { getDb, schema } from './index.js';
import type { Task, Comment } from './schema.js';

/**
 * How to handle child tasks when deleting a project.
 * - `cascade`: delete the project together with all its child tasks (and their comments)
 * - `keep`: delete only the project, moving its child tasks back to Inbox (unlinked)
 */
export type ProjectDeleteMode = 'cascade' | 'keep';

export interface ProjectDeleteResult {
  /** Child tasks that were deleted (only populated for `cascade`). */
  deletedTasks: Task[];
  /** Child tasks moved to Inbox, in their original state (only populated for `keep`). */
  movedTasks: Task[];
  /** Comments that were deleted (project's own comments, plus child comments in `cascade`). */
  deletedComments: Comment[];
}

/**
 * Delete a project and handle its child tasks according to `mode`.
 * Returns the prior state so the operation can be undone.
 */
export async function deleteProject(
  project: Task,
  mode: ProjectDeleteMode
): Promise<ProjectDeleteResult> {
  const db = getDb();

  const children = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.parentId, project.id));

  const deletedTasks: Task[] = [];
  const movedTasks: Task[] = [];
  let deletedComments: Comment[] = [];

  // Always remove the project's own comments.
  const projectComments = await db
    .select()
    .from(schema.comments)
    .where(eq(schema.comments.taskId, project.id));
  deletedComments = deletedComments.concat(projectComments);
  await db.delete(schema.comments).where(eq(schema.comments.taskId, project.id));

  if (mode === 'cascade') {
    for (const child of children) {
      const childComments = await db
        .select()
        .from(schema.comments)
        .where(eq(schema.comments.taskId, child.id));
      deletedComments = deletedComments.concat(childComments);
      await db.delete(schema.comments).where(eq(schema.comments.taskId, child.id));
      await db.delete(schema.tasks).where(eq(schema.tasks.id, child.id));
      deletedTasks.push(child);
    }
  } else {
    // keep: unlink children and move them back to Inbox.
    const now = new Date();
    for (const child of children) {
      movedTasks.push(child);
      await db
        .update(schema.tasks)
        .set({ parentId: null, status: 'inbox', updatedAt: now })
        .where(eq(schema.tasks.id, child.id));
    }
  }

  // Finally remove the project itself.
  await db.delete(schema.tasks).where(eq(schema.tasks.id, project.id));

  return { deletedTasks, movedTasks, deletedComments };
}
