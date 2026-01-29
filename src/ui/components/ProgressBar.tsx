import React from 'react';
import { Text } from 'ink';
import { useTheme } from '../theme/index.js';

export interface ProgressBarProps {
  completed: number;
  total: number;
  width?: number;
}

export function ProgressBar({ completed, total, width = 10 }: ProgressBarProps): React.ReactElement {
  const theme = useTheme();
  const [filledChar, emptyChar] = theme.style.loadingChars;

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const filledCount = total > 0 ? Math.round((completed / total) * width) : 0;
  const emptyCount = width - filledCount;

  const filledBar = filledChar.repeat(filledCount);
  const emptyBar = emptyChar.repeat(emptyCount);

  return (
    <Text color={theme.colors.textMuted}>
      {' '}{filledBar}
      <Text color={theme.colors.muted}>{emptyBar}</Text>
      <Text color={theme.colors.textMuted}> {percentage}% ({completed}/{total})</Text>
    </Text>
  );
}
