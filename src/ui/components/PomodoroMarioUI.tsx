import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../theme/index.js';
import { getLocale } from '../../config.js';
import type { PomodoroState, PomodoroConfig } from '../../pomodoro/types.js';
import { DEFAULT_POMODORO_CONFIG } from '../../pomodoro/types.js';

// Mario running animation frames
const MARIO_FRAMES = [
  ' ᗧ',
  ' ᗣ',
];

// Goal post
const GOAL_POST = '🏁';

// World map icons
const MAP_ICONS = {
  cleared: '●',
  current: '★',
  next: '○',
  path: '─',
  castle: '🏰',
  ghostHouse: '👻',
  switchPalace: '!',
};

// Stage decorations
const CLOUD = '☁';
const HILL = '∧';
const BUSH = '♣';
const COIN = '○';
const BLOCK = '□';
const PIPE = '┃';

// Yoshi
const YOSHI = '🦖';

interface PomodoroMarioUIProps {
  state: PomodoroState;
  remainingSeconds: number;
  isPaused: boolean;
  config?: PomodoroConfig;
  score: number;
  coins: number;
  lives: number;
  world: string;
  width: number;
  compact?: boolean;
  animationFrame?: number;
  selectedCommand?: number;
}

export function PomodoroMarioUI({
  state,
  remainingSeconds,
  isPaused,
  config = DEFAULT_POMODORO_CONFIG,
  score,
  coins,
  lives,
  world,
  width,
  compact = false,
  animationFrame = 0,
}: PomodoroMarioUIProps): React.ReactElement {
  const theme = useTheme();
  const isJapanese = getLocale() === 'ja';
  const isWork = state.type === 'work';

  // Calculate progress
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
  const progress = 1 - (remainingSeconds / totalSeconds);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Truncate task title for stage name
  const maxTitleLength = compact ? 15 : Math.min(25, width - 40);
  const stageName = state.taskTitle.length > maxTitleLength
    ? state.taskTitle.slice(0, maxTitleLength - 1) + '…'
    : state.taskTitle;

  // Mario character (animated)
  const mario = MARIO_FRAMES[animationFrame % MARIO_FRAMES.length];

  // Compact mode - single line
  if (compact) {
    const compactBarWidth = 12;
    const marioPos = Math.min(Math.floor(progress * compactBarWidth), compactBarWidth - 1);
    const trackBefore = '─'.repeat(Math.max(0, marioPos));
    const trackAfter = '─'.repeat(Math.max(0, compactBarWidth - marioPos - 1));

    return (
      <Box>
        <Text color={theme.colors.secondary}>W{world} </Text>
        <Text color={theme.colors.textMuted}>[</Text>
        <Text color={theme.colors.muted}>{trackBefore}</Text>
        <Text color={isPaused ? theme.colors.textMuted : theme.colors.primary}>{isPaused ? '■' : mario}</Text>
        <Text color={theme.colors.muted}>{trackAfter}</Text>
        <Text color={theme.colors.accent}>{GOAL_POST}</Text>
        <Text color={theme.colors.textMuted}>]</Text>
        <Text color={isPaused ? theme.colors.textMuted : theme.colors.text}> {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, '0')}</Text>
        <Text color={theme.colors.textMuted}> {stageName}</Text>
        {isPaused && <Text color={theme.colors.textMuted}> (PAUSE)</Text>}
      </Box>
    );
  }

  // Full stage UI - use full width
  const stageWidth = width - 6;
  const marioPosition = Math.floor(progress * (stageWidth - 4));

  // Build the stage track
  const buildStageTrack = (): { sky: string; ground: string; undergroundBefore: string; undergroundAfter: string } => {
    const skyChars: string[] = [];
    const groundChars: string[] = [];

    for (let i = 0; i < stageWidth; i++) {
      // Sky layer - clouds scattered
      if (i % 12 === 3 || i % 12 === 7) {
        skyChars.push(CLOUD);
      } else {
        skyChars.push(' ');
      }

      // Ground layer - Mario runs here
      if (i === marioPosition) {
        groundChars.push(isPaused ? '■' : mario);
      } else if (i === stageWidth - 2) {
        groundChars.push(GOAL_POST);
      } else if (i % 8 === 0 && i !== marioPosition && i < stageWidth - 3) {
        groundChars.push(COIN);
      } else {
        groundChars.push(' ');
      }
    }

    // Underground layer - progress bar style
    const progressWidth = Math.max(0, marioPosition);
    const remainingWidth = Math.max(0, stageWidth - marioPosition);

    return {
      sky: skyChars.join(''),
      ground: groundChars.join(''),
      undergroundBefore: '█'.repeat(progressWidth),
      undergroundAfter: '░'.repeat(remainingWidth),
    };
  };

  const track = buildStageTrack();

  // World map for break time
  const buildWorldMap = (): string[] => {
    const clearedStages = state.completedCount;
    const totalRounds = config.roundsBeforeLongBreak;
    const mapLines: string[] = [];

    let line1 = '  ';
    let line2 = '  ';

    for (let i = 0; i < totalRounds; i++) {
      if (i < clearedStages) {
        line1 += MAP_ICONS.cleared + MAP_ICONS.path;
      } else if (i === clearedStages) {
        line1 += MAP_ICONS.current + MAP_ICONS.path;
      } else {
        line1 += MAP_ICONS.next + MAP_ICONS.path;
      }
    }
    line1 += MAP_ICONS.castle;

    mapLines.push(line1);
    return mapLines;
  };

  if (!isWork) {
    // Break time - Show world map
    const mapLines = buildWorldMap();

    return (
      <Box flexDirection="column" width={width}>
        {/* HUD */}
        <Box justifyContent="space-between" marginBottom={1} width={width}>
          <Box>
            <Text color={theme.colors.text}>MARIO  </Text>
            <Text color={theme.colors.primary} bold>{score.toString().padStart(6, '0')}</Text>
          </Box>
          <Box>
            <Text color={theme.colors.secondary}>🪙×{coins.toString().padStart(2, '0')}</Text>
          </Box>
          <Box>
            <Text color={theme.colors.text}>WORLD </Text>
            <Text color={theme.colors.primary} bold>{world}</Text>
          </Box>
          <Box>
            <Text color={theme.colors.text}>TIME </Text>
            <Text color={theme.colors.primary} bold>{formatTime(remainingSeconds)}</Text>
          </Box>
        </Box>

        {/* World Map Title */}
        <Box justifyContent="center" marginBottom={1} width={width}>
          <Text color={theme.colors.accent} bold>
            ～ {isJapanese ? 'ワールドマップ' : 'WORLD MAP'} ～
          </Text>
        </Box>

        {/* Map */}
        <Box flexDirection="column" borderStyle="round" borderColor={theme.colors.border} paddingX={2} paddingY={1} width={width}>
          <Box justifyContent="center" marginBottom={1}>
            <Text color={theme.colors.secondary}>
              {isJapanese ? 'つぎの ステージまで やすもう!' : 'Rest until the next stage!'}
            </Text>
          </Box>

          {mapLines.map((line, i) => (
            <Box key={i} justifyContent="center">
              <Text color={theme.colors.text}>{line}</Text>
            </Box>
          ))}

          <Box justifyContent="center" marginTop={1}>
            <Text color={theme.colors.textMuted}>
              {isJapanese ? 'クリア: ' : 'Cleared: '}{state.completedCount}/{config.roundsBeforeLongBreak}
            </Text>
          </Box>
        </Box>

        {/* Footer */}
        <Box marginTop={1} justifyContent="center" width={width}>
          <Text color={theme.colors.textMuted}>
            {isPaused
              ? (isJapanese ? 'PAUSE - Space で さいかい' : 'PAUSE - Press Space to resume')
              : (isJapanese ? 'ゆっくり やすんでね...' : 'Take a good rest...')}
          </Text>
        </Box>
      </Box>
    );
  }

  // Work time - Stage view
  return (
    <Box flexDirection="column" width={width}>
      {/* HUD */}
      <Box justifyContent="space-between" marginBottom={1} width={width}>
        <Box>
          <Text color={theme.colors.text}>MARIO  </Text>
          <Text color={theme.colors.primary} bold>{score.toString().padStart(6, '0')}</Text>
        </Box>
        <Box>
          <Text color={theme.colors.secondary}>🪙×{coins.toString().padStart(2, '0')}</Text>
        </Box>
        <Box>
          <Text color={theme.colors.text}>WORLD </Text>
          <Text color={theme.colors.primary} bold>{world}</Text>
        </Box>
        <Box>
          <Text color={theme.colors.text}>TIME </Text>
          <Text color={isPaused ? theme.colors.textMuted : (remainingSeconds <= 60 ? theme.colors.accent : theme.colors.primary)} bold>
            {formatTime(remainingSeconds)}
          </Text>
        </Box>
      </Box>

      {/* Stage Name */}
      <Box justifyContent="center" marginBottom={1} width={width}>
        <Text color={theme.colors.accent} bold>
          ～ {stageName} ～
        </Text>
      </Box>

      {/* Stage Area */}
      <Box flexDirection="column" borderStyle="round" borderColor={theme.colors.border} paddingX={1} width={width}>
        {/* Sky */}
        <Box>
          <Text color={theme.colors.muted}>{track.sky}</Text>
        </Box>

        {/* Ground - Mario runs here */}
        <Box>
          <Text color={theme.colors.primary}>{track.ground}</Text>
        </Box>

        {/* Underground - progress bar */}
        <Box>
          <Text color="#D2691E">{track.undergroundBefore}</Text>
          <Text color="#8B4513">{track.undergroundAfter}</Text>
        </Box>
      </Box>

      {/* Progress info */}
      <Box marginTop={1} justifyContent="center" width={width}>
        <Text color={theme.colors.textMuted}>
          {isJapanese ? 'すすんだ: ' : 'Progress: '}
        </Text>
        <Text color={theme.colors.secondary} bold>
          {Math.round(progress * 100)}%
        </Text>
      </Box>

      {/* Status message */}
      <Box marginTop={1} justifyContent="center" width={width}>
        <Text color={theme.colors.textMuted}>
          {isPaused
            ? (isJapanese ? 'PAUSE - Space で さいかい, S でスキップ, X でやめる' : 'PAUSE - Space:Resume S:Skip X:Stop')
            : (isJapanese ? 'ゴールを めざせ!' : 'Head for the goal!')}
        </Text>
      </Box>
    </Box>
  );
}

// Message component
interface MarioMessageProps {
  message: string;
  isNew?: boolean;
}

export function MarioMessage({ message, isNew = false }: MarioMessageProps): React.ReactElement {
  const theme = useTheme();

  return (
    <Box marginTop={1}>
      <Text color={theme.colors.secondary}>★ </Text>
      <Text color={isNew ? theme.colors.textHighlight : theme.colors.text}>{message}</Text>
    </Box>
  );
}

// Message generator
export function getMarioMessage(
  type: 'start' | 'pause' | 'resume' | 'complete' | 'break_start' | 'break_end' | 'stop',
  taskTitle?: string
): string {
  const isJapanese = getLocale() === 'ja';
  const shortTitle = taskTitle && taskTitle.length > 20
    ? taskTitle.slice(0, 19) + '…'
    : taskTitle;

  switch (type) {
    case 'start':
      return isJapanese
        ? `ステージ「${shortTitle}」スタート!`
        : `Stage "${shortTitle}" START!`;
    case 'pause':
      return isJapanese
        ? 'PAUSE'
        : 'PAUSE';
    case 'resume':
      return isJapanese
        ? 'ゲームさいかい!'
        : 'Game resumed!';
    case 'complete':
      return isJapanese
        ? 'COURSE CLEAR!! コインゲット!'
        : 'COURSE CLEAR!! Got coins!';
    case 'break_start':
      return isJapanese
        ? 'ステージクリア! きゅうけいしよう'
        : 'Stage clear! Take a break';
    case 'break_end':
      return isJapanese
        ? 'つぎの ステージへ いこう!'
        : "Let's go to the next stage!";
    case 'stop':
      return isJapanese
        ? 'ゲームオーバー...'
        : 'GAME OVER...';
    default:
      return '';
  }
}

// Export commands for compatibility (not used in this version but kept for interface)
export const MARIO_COMMANDS = ['attack', 'defend', 'fireball', 'flee'] as const;
export type MarioCommand = typeof MARIO_COMMANDS[number];
