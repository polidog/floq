import { useState, useEffect, useCallback, useRef } from 'react';
import type { PomodoroState, PomodoroType, PomodoroConfig } from './types.js';
import { DEFAULT_POMODORO_CONFIG } from './types.js';

export interface UsePomodoroTimerResult {
  state: PomodoroState | null;
  remainingSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  startPomodoro: (taskId: string, taskTitle: string) => void;
  pausePomodoro: () => void;
  resumePomodoro: () => void;
  stopPomodoro: () => void;
  skipPhase: () => void;
}

export function usePomodoroTimer(
  config: PomodoroConfig = DEFAULT_POMODORO_CONFIG,
  onPhaseComplete?: (type: PomodoroType, completedCount: number) => void
): UsePomodoroTimerResult {
  const [state, setState] = useState<PomodoroState | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const onPhaseCompleteRef = useRef(onPhaseComplete);
  onPhaseCompleteRef.current = onPhaseComplete;

  const getDuration = useCallback((type: PomodoroType): number => {
    switch (type) {
      case 'work':
        return config.workDuration * 60;
      case 'short_break':
        return config.shortBreakDuration * 60;
      case 'long_break':
        return config.longBreakDuration * 60;
    }
  }, [config]);

  const getNextPhase = useCallback((currentType: PomodoroType, completedCount: number): PomodoroType => {
    if (currentType === 'work') {
      // After work, check if it's time for long break
      const newCount = completedCount + 1;
      if (newCount % config.roundsBeforeLongBreak === 0) {
        return 'long_break';
      }
      return 'short_break';
    }
    // After any break, return to work
    return 'work';
  }, [config.roundsBeforeLongBreak]);

  const startPomodoro = useCallback((taskId: string, taskTitle: string) => {
    const duration = getDuration('work');
    const endTime = Date.now() + duration * 1000;
    setState({
      taskId,
      taskTitle,
      type: 'work',
      endTime,
      pausedAt: null,
      completedCount: 0,
    });
    setRemainingSeconds(duration);
  }, [getDuration]);

  const pausePomodoro = useCallback(() => {
    setState(prev => {
      if (!prev || prev.pausedAt !== null) return prev;
      return {
        ...prev,
        pausedAt: Date.now(),
      };
    });
  }, []);

  const resumePomodoro = useCallback(() => {
    setState(prev => {
      if (!prev || prev.pausedAt === null) return prev;
      // Calculate how long we were paused and adjust endTime
      const pausedDuration = Date.now() - prev.pausedAt;
      return {
        ...prev,
        endTime: prev.endTime + pausedDuration,
        pausedAt: null,
      };
    });
  }, []);

  const stopPomodoro = useCallback(() => {
    setState(null);
    setRemainingSeconds(0);
  }, []);

  const transitionToNextPhase = useCallback((currentState: PomodoroState) => {
    const nextType = getNextPhase(currentState.type, currentState.completedCount);
    const newCompletedCount = currentState.type === 'work'
      ? currentState.completedCount + 1
      : currentState.completedCount;

    // Notify about phase completion
    if (onPhaseCompleteRef.current) {
      onPhaseCompleteRef.current(currentState.type, newCompletedCount);
    }

    // Play terminal bell
    process.stdout.write('\x07');

    const duration = getDuration(nextType);
    const endTime = Date.now() + duration * 1000;
    setState({
      ...currentState,
      type: nextType,
      endTime,
      pausedAt: null,
      completedCount: newCompletedCount,
    });
    setRemainingSeconds(duration);
  }, [getDuration, getNextPhase]);

  const skipPhase = useCallback(() => {
    if (!state) return;
    transitionToNextPhase(state);
  }, [state, transitionToNextPhase]);

  // Timer tick effect
  useEffect(() => {
    if (!state || state.pausedAt !== null) return;

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((state.endTime - now) / 1000));
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        transitionToNextPhase(state);
      }
    };

    tick(); // Initial tick
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [state, transitionToNextPhase]);

  const isRunning = state !== null;
  const isPaused = state?.pausedAt !== null;

  return {
    state,
    remainingSeconds,
    isRunning,
    isPaused,
    startPomodoro,
    pausePomodoro,
    resumePomodoro,
    stopPomodoro,
    skipPhase,
  };
}
