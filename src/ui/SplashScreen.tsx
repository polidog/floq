import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from './theme/index.js';
import { VERSION } from '../version.js';
import { t } from '../i18n/index.js';

const LOGO_MODERN = `
  ███████╗██╗      ██████╗  ██████╗
  ██╔════╝██║     ██╔═══██╗██╔═══██╗
  █████╗  ██║     ██║   ██║██║   ██║
  ██╔══╝  ██║     ██║   ██║██║▄▄ ██║
  ██║     ███████╗╚██████╔╝╚██████╔╝
  ╚═╝     ╚══════╝ ╚═════╝  ╚══▀▀═╝
`;

const LOGO_DOS = `
  ╔═══════════════════════════════════╗
  ║  ███████ ██       ██████   ██████ ║
  ║  ██      ██      ██    ██ ██    ██║
  ║  █████   ██      ██    ██ ██    ██║
  ║  ██      ██      ██    ██ ██ ▄▄ ██║
  ║  ██      ███████  ██████   ██████ ║
  ╚═══════════════════════════════════╝
`;

// Dragon Quest style FLOQ logo with wings and sword
const FLOQ_LOGO = [
  '                    /\\',
  '        __         /  \\         __',
  '       /  \\       / || \\       /  \\',
  '      / /\\ \\     /  ||  \\     / /\\ \\',
  '     / /  \\ \\   /   ||   \\   / /  \\ \\',
  '    / /    \\ \\_/    ||    \\_/ /    \\ \\',
  '   /_/      \\__/    ||    \\__/      \\_\\',
  '                    ||',
  '   =================[##]=================',
  '',
  '    ########  ##        ######    ######',
  '    ##        ##       ##    ##  ##    ##',
  '    ######    ##       ##    ##  ##    ##',
  '    ##        ##       ##    ##  ##  # ##',
  '    ##        ########  ######    #### ##',
  '',
  '   =====================================',
  '          ~ Flow Your Tasks ~',
];

// Dragon Quest style border characters
const DQ_BORDER = {
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
  horizontal: '─',
  vertical: '│',
};

const TAGLINE = 'Flow your tasks, clear your mind';

// Mario/Nintendo style splash - SFC boot screen inspired
const MARIO_LOGO = [
  '          ★  ★  ★  ★  ★  ★  ★  ★  ★',
  '',
  '    ████████ ██       ██████   ██████',
  '    ██       ██      ██    ██ ██    ██',
  '    ██████   ██      ██    ██ ██    ██',
  '    ██       ██      ██    ██ ██ ▄▄ ██',
  '    ██       ███████  ██████   ██████',
  '',
  '          ★  ★  ★  ★  ★  ★  ★  ★  ★',
];

const MARIO_QUOTES_JA = [
  'イッツァミー！タスクマネージャー！',
  'マンマミーア！タスクがいっぱいだ！',
  'レッツァゴー！',
  'ヤッフー！',
  'スーパータスククリア！',
  'コインをゲット！',
  '1UPキノコ！',
  'ファイアフラワー！',
  'スターパワー！',
];

const MARIO_QUOTES_EN = [
  "It's-a me! Task Manager!",
  'Mamma mia! So many tasks!',
  "Let's-a go!",
  'Yahoo!',
  'Super Task Clear!',
  'Got a coin!',
  '1-UP Mushroom!',
  'Fire Flower!',
  'Star Power!',
];

// Dragon Quest famous quotes for splash screen
const DQ_QUOTES_JA = [
  'へんじがない。ただのしかばねのようだ。',
  'おきのどくですが ぼうけんのしょは きえてしまいました。',
  'レベルがあがった！',
  'しかし まわりこまれてしまった！',
  'たたかいに やぶれた...',
  'どうぐがいっぱいで もてません。',
  'やくそうを つかった！',
  'かいしんのいちげき！',
  'しかし なにも おこらなかった',
  'そのほうこうには すすめません',
];

const DQ_QUOTES_EN = [
  'No response. It seems to be just a corpse.',
  'Unfortunately, your adventure log has been erased.',
  'Level up!',
  'But you were surrounded!',
  'You have been defeated...',
  'Your inventory is full.',
  'Used an herb!',
  'Critical hit!',
  'But nothing happened.',
  'You cannot go that way.',
];

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
  viewMode?: 'gtd' | 'kanban';
}

export function SplashScreen({ onComplete, duration = 1500, viewMode = 'gtd' }: SplashScreenProps): React.ReactElement {
  const [frame, setFrame] = useState(0);
  const [showTagline, setShowTagline] = useState(false);
  const [blinkVisible, setBlinkVisible] = useState(true);
  const theme = useTheme();
  const i18n = t();

  const isDqStyle = theme.uiStyle === 'titled-box';
  const isMarioStyle = theme.uiStyle === 'mario-block';
  const isDosStyle = theme.name !== 'modern' && !isMarioStyle;
  const logo = isDosStyle ? LOGO_DOS : LOGO_MODERN;
  const [filled, empty] = theme.style.loadingChars;

  // Pick a random quote (stable across re-renders)
  const [randomQuote] = useState(() => {
    const isJapanese = i18n.splash?.welcome === 'ようこそ！';
    if (isMarioStyle) {
      const quotes = isJapanese ? MARIO_QUOTES_JA : MARIO_QUOTES_EN;
      return quotes[Math.floor(Math.random() * quotes.length)];
    }
    const quotes = isJapanese ? DQ_QUOTES_JA : DQ_QUOTES_EN;
    return quotes[Math.floor(Math.random() * quotes.length)];
  });

  // Adventure subtitle based on view mode
  const adventureSubtitle = viewMode === 'kanban'
    ? (i18n.splash?.subtitleKanban || 'Kanbanの冒険がはじまる')
    : (i18n.splash?.subtitle || 'GTDの冒険がはじまる');

  // Wait for key press mode (duration = -1)
  const waitForKeyPress = duration < 0;

  // Handle key press to skip splash
  useInput(() => {
    onComplete();
  });

  useEffect(() => {
    // Animate logo appearance
    const frameInterval = setInterval(() => {
      setFrame((prev) => {
        if (prev >= 10) {
          clearInterval(frameInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 50);

    // Show tagline after logo appears
    const taglineTimer = setTimeout(() => {
      setShowTagline(true);
    }, 600);

    // Blink effect for DQ style, Mario style, or wait-for-key mode
    let blinkInterval: ReturnType<typeof setInterval> | null = null;
    if (isDqStyle || isMarioStyle || waitForKeyPress) {
      blinkInterval = setInterval(() => {
        setBlinkVisible((prev) => !prev);
      }, 500);
    }

    // Complete splash screen (only if not waiting for key press)
    let completeTimer: ReturnType<typeof setTimeout> | null = null;
    if (!waitForKeyPress) {
      completeTimer = setTimeout(() => {
        onComplete();
      }, duration);
    }

    return () => {
      clearInterval(frameInterval);
      clearTimeout(taglineTimer);
      if (completeTimer) clearTimeout(completeTimer);
      if (blinkInterval) clearInterval(blinkInterval);
    };
  }, [onComplete, duration, isDqStyle, isMarioStyle, waitForKeyPress]);

  // Mario / Nintendo style splash (SFC boot screen inspired)
  if (isMarioStyle) {
    return (
      <Box
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        padding={2}
      >
        {/* Top decoration */}
        <Box marginBottom={1}>
          <Text color={theme.colors.secondary}>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>
        </Box>

        {/* FLOQ Logo */}
        <Box flexDirection="column" alignItems="center" marginBottom={1}>
          {MARIO_LOGO.map((line, index) => (
            <Text
              key={index}
              color={index === 0 || index === 8 ? theme.colors.secondary : theme.colors.primary}
              bold
            >
              {line}
            </Text>
          ))}
        </Box>

        {/* Subtitle */}
        <Box marginBottom={1}>
          <Text color={theme.colors.text} bold>
            ～ SUPER TASK MANAGER ～
          </Text>
        </Box>

        {/* Random quote */}
        <Box marginBottom={1}>
          <Text color={theme.colors.accent}>
            🍄 {randomQuote}
          </Text>
        </Box>

        {/* Bottom decoration */}
        <Box marginBottom={1}>
          <Text color={theme.colors.secondary}>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>
        </Box>

        {/* Press key hint */}
        <Box marginTop={1}>
          <Text color={theme.colors.textMuted}>
            {blinkVisible ? '- PRESS START -' : '               '}
          </Text>
        </Box>

        {/* Version & Copyright */}
        <Box marginTop={2} flexDirection="column" alignItems="center">
          <Text color={theme.colors.textMuted}>VER {VERSION}</Text>
          <Text color={theme.colors.textMuted}>© 2026 polidog/PartyHard Inc.</Text>
        </Box>
      </Box>
    );
  }

  // Dragon Quest style splash
  if (isDqStyle) {
    const boxWidth = 40;
    const innerWidth = boxWidth - 2;
    const title = 'FLOQ';
    const leftDashes = 3;
    const rightDashes = innerWidth - leftDashes - title.length - 2;
    const shadowColor = theme.colors.muted;

    return (
      <Box
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        padding={2}
      >
        {/* FLOQ Logo with wings */}
        <Box flexDirection="column" alignItems="center" marginBottom={1}>
          {FLOQ_LOGO.map((line, index) => (
            <Text key={index} color={index === 4 ? theme.colors.text : theme.colors.accent} bold={index === 4}>
              {line}
            </Text>
          ))}
        </Box>

        {/* DQ-style message box */}
        <Box flexDirection="column">
          {/* Top border */}
          <Box>
            <Text color={theme.colors.border}>{DQ_BORDER.topLeft}</Text>
            <Text color={theme.colors.border}>{DQ_BORDER.horizontal.repeat(leftDashes)} </Text>
            <Text color={theme.colors.accent} bold>{title}</Text>
            <Text color={theme.colors.border}> {DQ_BORDER.horizontal.repeat(rightDashes)}</Text>
            <Text color={theme.colors.border}>{DQ_BORDER.topRight}</Text>
            <Text> </Text>
          </Box>

          {/* Content rows */}
          <Box>
            <Text color={theme.colors.border}>{DQ_BORDER.vertical}</Text>
            <Box width={innerWidth} justifyContent="center">
              <Text color={theme.colors.text}> </Text>
            </Box>
            <Text color={theme.colors.border}>{DQ_BORDER.vertical}</Text>
            <Text color={shadowColor}>░</Text>
          </Box>

          <Box>
            <Text color={theme.colors.border}>{DQ_BORDER.vertical}</Text>
            <Box width={innerWidth} justifyContent="center">
              <Text color={theme.colors.text} bold>
                {adventureSubtitle}
              </Text>
            </Box>
            <Text color={theme.colors.border}>{DQ_BORDER.vertical}</Text>
            <Text color={shadowColor}>░</Text>
          </Box>

          {/* Empty row for spacing */}
          <Box>
            <Text color={theme.colors.border}>{DQ_BORDER.vertical}</Text>
            <Box width={innerWidth} justifyContent="center">
              <Text color={theme.colors.text}> </Text>
            </Box>
            <Text color={theme.colors.border}>{DQ_BORDER.vertical}</Text>
            <Text color={shadowColor}>░</Text>
          </Box>

          <Box>
            <Text color={theme.colors.border}>{DQ_BORDER.vertical}</Text>
            <Box width={innerWidth} justifyContent="center">
              <Text color={theme.colors.textMuted}>
                {randomQuote}
              </Text>
            </Box>
            <Text color={theme.colors.border}>{DQ_BORDER.vertical}</Text>
            <Text color={shadowColor}>░</Text>
          </Box>

          <Box>
            <Text color={theme.colors.border}>{DQ_BORDER.vertical}</Text>
            <Box width={innerWidth} justifyContent="center">
              <Text color={theme.colors.text}> </Text>
            </Box>
            <Text color={theme.colors.border}>{DQ_BORDER.vertical}</Text>
            <Text color={shadowColor}>░</Text>
          </Box>

          <Box>
            <Text color={theme.colors.border}>{DQ_BORDER.vertical}</Text>
            <Box width={innerWidth} justifyContent="center">
              <Text color={theme.colors.textMuted}>
                {blinkVisible ? (i18n.splash?.pressKey || '▼ キーを押してください') : ' '}
              </Text>
            </Box>
            <Text color={theme.colors.border}>{DQ_BORDER.vertical}</Text>
            <Text color={shadowColor}>░</Text>
          </Box>

          <Box>
            <Text color={theme.colors.border}>{DQ_BORDER.vertical}</Text>
            <Box width={innerWidth} justifyContent="center">
              <Text color={theme.colors.text}> </Text>
            </Box>
            <Text color={theme.colors.border}>{DQ_BORDER.vertical}</Text>
            <Text color={shadowColor}>░</Text>
          </Box>

          {/* Bottom border */}
          <Box>
            <Text color={theme.colors.border}>{DQ_BORDER.bottomLeft}</Text>
            <Text color={theme.colors.border}>{DQ_BORDER.horizontal.repeat(innerWidth)}</Text>
            <Text color={theme.colors.border}>{DQ_BORDER.bottomRight}</Text>
            <Text color={shadowColor}>░</Text>
          </Box>

          {/* Shadow bottom */}
          <Box>
            <Text> </Text>
            <Text color={shadowColor}>{'░'.repeat(boxWidth)}</Text>
          </Box>
        </Box>

        {/* Version */}
        <Box marginTop={1}>
          <Text color={theme.colors.textMuted}>VER {VERSION}</Text>
        </Box>
      </Box>
    );
  }

  // Standard splash (modern / DOS style)
  const logoLines = logo.split('\n');
  const visibleLines = Math.min(Math.floor(frame * logoLines.length / 10), logoLines.length);

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      padding={2}
    >
      {/* Logo with fade-in effect */}
      <Box flexDirection="column" alignItems="center">
        {logoLines.slice(0, visibleLines).map((line, index) => (
          <Text key={index} color={theme.colors.secondary} bold>
            {line}
          </Text>
        ))}
      </Box>

      {/* Tagline */}
      {showTagline && (
        <Box marginTop={1}>
          <Text color={theme.colors.textMuted} italic={!isDosStyle}>
            {isDosStyle ? `[ ${TAGLINE.toUpperCase()} ]` : TAGLINE}
          </Text>
        </Box>
      )}

      {/* Loading indicator or press key hint */}
      <Box marginTop={2}>
        {waitForKeyPress ? (
          <Text color={theme.colors.textMuted}>
            {blinkVisible ? (i18n.splash?.pressKey || '▼ Press any key') : ' '}
          </Text>
        ) : (
          <Text color={theme.colors.primary}>
            {frame < 10
              ? filled.repeat(frame) + empty.repeat(10 - frame)
              : filled.repeat(10)}
          </Text>
        )}
      </Box>

      {/* Version */}
      <Box marginTop={1}>
        <Text color={isDosStyle ? theme.colors.textMuted : theme.colors.muted}>
          {isDosStyle ? `VER ${VERSION}` : `v${VERSION}`}
        </Text>
      </Box>
    </Box>
  );
}
