export type PomodoroType = 'work' | 'short_break' | 'long_break';

export interface PomodoroState {
  taskId: string;
  taskTitle: string;
  type: PomodoroType;
  endTime: number;        // タイマー終了時刻（Unix timestamp）
  pausedAt: number | null; // 一時停止中の場合はその時刻
  completedCount: number;  // 完了したポモドーロ数
}

export interface PomodoroConfig {
  workDuration: number;      // デフォルト: 25分
  shortBreakDuration: number; // デフォルト: 5分
  longBreakDuration: number;  // デフォルト: 15分
  roundsBeforeLongBreak: number; // デフォルト: 4
}

export const DEFAULT_POMODORO_CONFIG: PomodoroConfig = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  roundsBeforeLongBreak: 4,
};
