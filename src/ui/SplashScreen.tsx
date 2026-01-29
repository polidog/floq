import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useTheme } from './theme/index.js';
import { VERSION } from '../version.js';

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

const TAGLINE = 'Flow your tasks, clear your mind';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

export function SplashScreen({ onComplete, duration = 1500 }: SplashScreenProps): React.ReactElement {
  const [frame, setFrame] = useState(0);
  const [showTagline, setShowTagline] = useState(false);
  const theme = useTheme();

  const isDosStyle = theme.name !== 'modern';
  const logo = isDosStyle ? LOGO_DOS : LOGO_MODERN;
  const [filled, empty] = theme.style.loadingChars;

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

    // Complete splash screen
    const completeTimer = setTimeout(() => {
      onComplete();
    }, duration);

    return () => {
      clearInterval(frameInterval);
      clearTimeout(taglineTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete, duration]);

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

      {/* Loading indicator */}
      <Box marginTop={2}>
        <Text color={theme.colors.primary}>
          {frame < 10
            ? filled.repeat(frame) + empty.repeat(10 - frame)
            : filled.repeat(10)}
        </Text>
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
