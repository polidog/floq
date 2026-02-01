import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../theme/index.js';
import { t } from '../../i18n/index.js';
import type { PomodoroState, PomodoroConfig } from '../../pomodoro/types.js';
import { DEFAULT_POMODORO_CONFIG } from '../../pomodoro/types.js';

interface PomodoroTimerProps {
  state: PomodoroState | null;
  remainingSeconds: number;
  isPaused: boolean;
  config?: PomodoroConfig;
}

export function PomodoroTimer({
  state,
  remainingSeconds,
  isPaused,
  config = DEFAULT_POMODORO_CONFIG,
}: PomodoroTimerProps): React.ReactElement | null {
  const theme = useTheme();
  const i18n = t();

  if (!state) return null;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTypeLabel = (): string => {
    const pomodoro = i18n.tui.pomodoro;
    switch (state.type) {
      case 'work':
        return pomodoro?.work || 'Work';
      case 'short_break':
        return pomodoro?.shortBreak || 'Short Break';
      case 'long_break':
        return pomodoro?.longBreak || 'Long Break';
    }
  };

  const getTypeIcon = (): string => {
    switch (state.type) {
      case 'work':
        return theme.name === 'modern' ? '🍅' : '[*]';
      case 'short_break':
      case 'long_break':
        return theme.name === 'modern' ? '☕' : '[~]';
    }
  };

  const getTimerColor = (): string => {
    if (isPaused) return theme.colors.textMuted;
    if (remainingSeconds <= 60) return theme.colors.accent;
    return state.type === 'work' ? theme.colors.primary : theme.colors.secondary;
  };

  // Truncate task title if too long
  const maxTitleLength = 20;
  const displayTitle = state.taskTitle.length > maxTitleLength
    ? state.taskTitle.slice(0, maxTitleLength - 3) + '...'
    : state.taskTitle;

  return (
    <Box>
      <Text color={getTimerColor()}>
        {getTypeIcon()} {formatTime(remainingSeconds)}
      </Text>
      <Text color={theme.colors.text}>
        {' '}{getTypeLabel()}
        {state.type === 'work' && ` - ${displayTitle}`}
      </Text>
      {isPaused && (
        <Text color={theme.colors.textMuted}>
          {' '}({i18n.tui.pomodoro?.paused || 'Paused'})
        </Text>
      )}
      <Text color={theme.colors.textMuted}>
        {' '}[{state.completedCount}/{config.roundsBeforeLongBreak}]
      </Text>
    </Box>
  );
}
