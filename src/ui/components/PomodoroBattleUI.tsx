import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../theme/index.js';
import { t } from '../../i18n/index.js';
import { getLocale } from '../../config.js';
import type { PomodoroState, PomodoroConfig } from '../../pomodoro/types.js';
import { DEFAULT_POMODORO_CONFIG } from '../../pomodoro/types.js';

// Round border characters
const BORDER = {
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
  horizontal: '─',
  vertical: '│',
};

const SHADOW = '░';

// Monster icons based on completed count
const MONSTER_ICONS = ['🐉', '👹', '💀', '🦇', '🐍', '👻', '🔥', '⚔️'];

// Get display width for Japanese characters
function getDisplayWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    const code = char.charCodeAt(0);
    if (
      (code >= 0x1100 && code <= 0x115F) ||
      (code >= 0x2E80 && code <= 0x9FFF) ||
      (code >= 0xAC00 && code <= 0xD7AF) ||
      (code >= 0xF900 && code <= 0xFAFF) ||
      (code >= 0xFE10 && code <= 0xFE1F) ||
      (code >= 0xFE30 && code <= 0xFE6F) ||
      (code >= 0xFF00 && code <= 0xFF60) ||
      (code >= 0xFFE0 && code <= 0xFFE6) ||
      (code >= 0x20000 && code <= 0x2FFFF)
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

// Pad string to target width (right pad)
function padToWidth(str: string, targetWidth: number): string {
  const currentWidth = getDisplayWidth(str);
  if (currentWidth >= targetWidth) return str;
  return str + ' '.repeat(targetWidth - currentWidth);
}

// Center string within target width
function centerToWidth(str: string, targetWidth: number): string {
  const currentWidth = getDisplayWidth(str);
  if (currentWidth >= targetWidth) return str;
  const totalPadding = targetWidth - currentWidth;
  const leftPad = Math.floor(totalPadding / 2);
  const rightPad = totalPadding - leftPad;
  return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
}

interface BattleBoxProps {
  title: string;
  children: React.ReactNode;
  width: number;
  minHeight?: number;
  showShadow?: boolean;
}

function BattleBox({
  title,
  children,
  width,
  minHeight = 1,
  showShadow = true,
}: BattleBoxProps): React.ReactElement {
  const theme = useTheme();
  const color = theme.colors.border;
  const shadowColor = theme.colors.muted;
  const innerWidth = width - 2;

  const titleLength = getDisplayWidth(title);
  const leftDashes = 3;
  const titlePadding = 2;
  const rightDashes = Math.max(0, innerWidth - leftDashes - titlePadding - titleLength);

  const childArray = React.Children.toArray(children);
  const contentRows = childArray.length || 1;
  const emptyRowsNeeded = Math.max(0, minHeight - contentRows);

  return (
    <Box flexDirection="column" width={width + (showShadow ? 1 : 0)}>
      {/* Top border */}
      <Box>
        <Text color={color}>{BORDER.topLeft}</Text>
        <Text color={color}>{BORDER.horizontal.repeat(leftDashes)} </Text>
        <Text color={theme.colors.accent} bold>{title}</Text>
        <Text color={color}> {BORDER.horizontal.repeat(rightDashes)}</Text>
        <Text color={color}>{BORDER.topRight}</Text>
        {showShadow && <Text> </Text>}
      </Box>

      {/* Content */}
      {childArray.length > 0 ? (
        childArray.map((child, i) => (
          <Box key={i}>
            <Text color={color}>{BORDER.vertical}</Text>
            <Box flexGrow={1} paddingX={1}>
              {child}
            </Box>
            <Text color={color}>{BORDER.vertical}</Text>
            {showShadow && <Text color={shadowColor}>{SHADOW}</Text>}
          </Box>
        ))
      ) : (
        <Box>
          <Text color={color}>{BORDER.vertical}</Text>
          <Box flexGrow={1} paddingX={1}>
            <Text> </Text>
          </Box>
          <Text color={color}>{BORDER.vertical}</Text>
          {showShadow && <Text color={shadowColor}>{SHADOW}</Text>}
        </Box>
      )}

      {/* Empty rows */}
      {Array.from({ length: emptyRowsNeeded }).map((_, i) => (
        <Box key={`empty-${i}`}>
          <Text color={color}>{BORDER.vertical}</Text>
          <Box flexGrow={1} paddingX={1}>
            <Text> </Text>
          </Box>
          <Text color={color}>{BORDER.vertical}</Text>
          {showShadow && <Text color={shadowColor}>{SHADOW}</Text>}
        </Box>
      ))}

      {/* Bottom border */}
      <Box>
        <Text color={color}>{BORDER.bottomLeft}</Text>
        <Text color={color}>{BORDER.horizontal.repeat(innerWidth)}</Text>
        <Text color={color}>{BORDER.bottomRight}</Text>
        {showShadow && <Text color={shadowColor}>{SHADOW}</Text>}
      </Box>

      {/* Bottom shadow */}
      {showShadow && (
        <Box>
          <Text color={shadowColor}> {SHADOW.repeat(width)}</Text>
        </Box>
      )}
    </Box>
  );
}

interface PomodoroBattleUIProps {
  state: PomodoroState;
  remainingSeconds: number;
  isPaused: boolean;
  config?: PomodoroConfig;
  jobClass: string;
  level: number;
  totalCompleted: number;
  width: number;
  compact?: boolean;
}

export function PomodoroBattleUI({
  state,
  remainingSeconds,
  isPaused,
  config = DEFAULT_POMODORO_CONFIG,
  jobClass,
  level,
  totalCompleted,
  width,
  compact = false,
}: PomodoroBattleUIProps): React.ReactElement {
  const theme = useTheme();
  const i18n = t();
  const isJapanese = getLocale() === 'ja';

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate HP bar for monster (remaining time)
  const getTotalSeconds = (): number => {
    switch (state.type) {
      case 'work':
        return config.workDuration * 60;
      case 'short_break':
        return config.shortBreakDuration * 60;
      case 'long_break':
        return config.longBreakDuration * 60;
    }
  };

  const totalSeconds = getTotalSeconds();
  const progress = remainingSeconds / totalSeconds;

  // Dynamic sizing based on width
  const barWidth = compact ? 16 : Math.max(24, Math.floor((width - 20) * 0.6));
  const filledCount = Math.round(progress * barWidth);
  const emptyCount = barWidth - filledCount;
  const hpBar = '█'.repeat(filledCount) + '░'.repeat(emptyCount);

  // Get monster icon
  const monsterIcon = MONSTER_ICONS[state.completedCount % MONSTER_ICONS.length];

  // Truncate task title - dynamic based on width
  const maxTitleLength = compact ? 18 : Math.max(20, width - 20);
  const displayTitle = state.taskTitle.length > maxTitleLength
    ? state.taskTitle.slice(0, maxTitleLength - 1) + '…'
    : state.taskTitle;

  // Experience points (completed pomodoros * 50)
  const exp = totalCompleted * 50;

  // Battle messages
  const getBattleTitle = (): string => {
    if (state.type === 'work') {
      return isJapanese ? 'まものが あらわれた!' : 'A monster appeared!';
    }
    return isJapanese ? 'やすらぎの ほこら' : 'Sanctuary of Rest';
  };

  const getPhaseMessage = (): string => {
    if (isPaused) {
      return isJapanese ? 'コマンド？' : 'Command?';
    }
    if (state.type === 'work') {
      return isJapanese ? 'たたかっている...' : 'Fighting...';
    }
    return isJapanese ? 'HPが かいふくしていく...' : 'HP is recovering...';
  };

  // Dynamic box widths - split available width between command and status boxes
  const totalBoxWidth = width - 4; // Account for margin between boxes
  const commandBoxWidth = compact ? 18 : Math.floor(totalBoxWidth * 0.45);
  const statusBoxWidth = compact ? 20 : Math.floor(totalBoxWidth * 0.55);

  if (compact) {
    // Compact mode: single line display
    return (
      <Box>
        <Text color={theme.colors.accent}>
          {state.type === 'work' ? monsterIcon : '☕'}
        </Text>
        <Text color={theme.colors.text}> </Text>
        <Text color={isPaused ? theme.colors.textMuted : theme.colors.statusNext}>
          {formatTime(remainingSeconds)}
        </Text>
        <Text color={theme.colors.text}> </Text>
        <Text color={theme.colors.textMuted}>
          {state.type === 'work' ? displayTitle : (isJapanese ? 'きゅうけい' : 'Break')}
        </Text>
        {isPaused && (
          <Text color={theme.colors.textMuted}>
            {' '}({isJapanese ? 'いちじていし' : 'Paused'})
          </Text>
        )}
        <Text color={theme.colors.textMuted}>
          {' '}[{state.completedCount}/{config.roundsBeforeLongBreak}]
        </Text>
      </Box>
    );
  }

  // Full battle UI
  return (
    <Box flexDirection="column">
      {/* Monster/Rest area */}
      <BattleBox title={getBattleTitle()} width={width} minHeight={3}>
        <Box justifyContent="center">
          <Text color={theme.colors.accent} bold>
            {state.type === 'work' ? `${monsterIcon}  ${displayTitle}` : '☕  ' + (isJapanese ? 'きゅうけいちゅう' : 'Resting')}
          </Text>
        </Box>
        <Box justifyContent="center">
          <Text color={theme.colors.textMuted}>
            {state.type === 'work' ? 'HP ' : (isJapanese ? 'かいふく ' : 'Recovery ')}
          </Text>
          <Text color={isPaused ? theme.colors.textMuted : (state.type === 'work' ? theme.colors.statusNext : theme.colors.secondary)}>
            {hpBar}
          </Text>
          <Text color={theme.colors.text}> {formatTime(remainingSeconds)}</Text>
        </Box>
        <Box justifyContent="center">
          <Text color={theme.colors.textMuted} italic>{getPhaseMessage()}</Text>
        </Box>
      </BattleBox>

      {/* Command and Status windows */}
      <Box marginTop={1}>
        {/* Command window */}
        <Box marginRight={2}>
          <BattleBox title={isJapanese ? 'コマンド' : 'Command'} width={commandBoxWidth} minHeight={4}>
            <Text color={theme.colors.textSelected} bold>
              ▶ {isJapanese ? 'たたかう' : 'Fight'}
            </Text>
            <Text color={theme.colors.text}>
              {'  '}{isJapanese ? 'ぼうぎょ' : 'Defend'} <Text color={theme.colors.textMuted}>(Space)</Text>
            </Text>
            <Text color={theme.colors.text}>
              {'  '}{isJapanese ? 'スキップ' : 'Skip'} <Text color={theme.colors.textMuted}>(S)</Text>
            </Text>
            <Text color={theme.colors.text}>
              {'  '}{isJapanese ? 'にげる' : 'Flee'} <Text color={theme.colors.textMuted}>(X)</Text>
            </Text>
          </BattleBox>
        </Box>

        {/* Player status window */}
        <BattleBox title={`${jobClass} Lv.${level}`} width={statusBoxWidth} minHeight={4}>
          <Text color={theme.colors.text}>
            {isJapanese ? 'ターン' : 'Turn'}: <Text color={theme.colors.accent} bold>{state.completedCount}</Text>/{config.roundsBeforeLongBreak}
          </Text>
          <Text color={theme.colors.text}>
            {isJapanese ? 'けいけんち' : 'EXP'}: <Text color={theme.colors.secondary} bold>{exp}</Text>
          </Text>
          <Text color={theme.colors.text}>
            {isJapanese ? 'つぎのLv' : 'Next Lv'}: <Text color={theme.colors.textMuted}>{(level + 1) * 5 - totalCompleted}</Text>
          </Text>
        </BattleBox>
      </Box>
    </Box>
  );
}

interface BattleMessageProps {
  message: string;
  isNew?: boolean;
}

export function BattleMessage({ message, isNew = false }: BattleMessageProps): React.ReactElement {
  const theme = useTheme();
  const isJapanese = getLocale() === 'ja';

  return (
    <Box marginTop={1}>
      <Text color={theme.colors.textMuted}>{isJapanese ? '▶ ' : '> '}</Text>
      <Text color={isNew ? theme.colors.textHighlight : theme.colors.text}>{message}</Text>
    </Box>
  );
}

// Battle message generator
export function getBattleMessage(
  type: 'start' | 'pause' | 'resume' | 'complete' | 'break_start' | 'break_end' | 'flee',
  taskTitle?: string
): string {
  const isJapanese = getLocale() === 'ja';
  const shortTitle = taskTitle && taskTitle.length > 15
    ? taskTitle.slice(0, 14) + '…'
    : taskTitle;

  switch (type) {
    case 'start':
      return isJapanese
        ? `${shortTitle}が あらわれた!`
        : `${shortTitle} appeared!`;
    case 'pause':
      return isJapanese
        ? 'コマンド?'
        : 'Command?';
    case 'resume':
      return isJapanese
        ? 'こうげきを かいした!'
        : 'Resumed attack!';
    case 'complete':
      return isJapanese
        ? 'まものを たおした! けいけんちを かくとく!'
        : 'Defeated the monster! Gained experience!';
    case 'break_start':
      return isJapanese
        ? 'やすらぎの ほこらに たどりついた'
        : 'Arrived at the Sanctuary of Rest';
    case 'break_end':
      return isJapanese
        ? 'HPが かいふくした! たびを つづけよう!'
        : 'HP recovered! Continue the journey!';
    case 'flee':
      return isJapanese
        ? 'にげだした!'
        : 'Fled from battle!';
    default:
      return '';
  }
}
