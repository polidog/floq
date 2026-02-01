import { eq } from 'drizzle-orm';
import { getDb, schema } from '../db/index.js';
import type { PomodoroState, PomodoroType } from './types.js';

const CURRENT_SESSION_ID = 'current';

/**
 * Load the current pomodoro state from the database
 */
export async function loadPomodoroState(): Promise<PomodoroState | null> {
  const db = getDb();
  const sessions = await db
    .select()
    .from(schema.pomodoroSessions)
    .where(eq(schema.pomodoroSessions.id, CURRENT_SESSION_ID));

  if (sessions.length === 0) {
    return null;
  }

  const session = sessions[0];
  return {
    taskId: session.taskId,
    taskTitle: session.taskTitle,
    type: session.type as PomodoroType,
    endTime: session.endTime,
    pausedAt: session.pausedAt,
    completedCount: session.completedCount,
  };
}

/**
 * Save the current pomodoro state to the database
 */
export async function savePomodoroState(state: PomodoroState): Promise<void> {
  const db = getDb();
  const now = new Date();

  await db
    .insert(schema.pomodoroSessions)
    .values({
      id: CURRENT_SESSION_ID,
      taskId: state.taskId,
      taskTitle: state.taskTitle,
      type: state.type,
      endTime: state.endTime,
      pausedAt: state.pausedAt,
      completedCount: state.completedCount,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.pomodoroSessions.id,
      set: {
        taskId: state.taskId,
        taskTitle: state.taskTitle,
        type: state.type,
        endTime: state.endTime,
        pausedAt: state.pausedAt,
        completedCount: state.completedCount,
        updatedAt: now,
      },
    });
}

/**
 * Clear the current pomodoro state from the database
 */
export async function clearPomodoroState(): Promise<void> {
  const db = getDb();
  await db
    .delete(schema.pomodoroSessions)
    .where(eq(schema.pomodoroSessions.id, CURRENT_SESSION_ID));
}
