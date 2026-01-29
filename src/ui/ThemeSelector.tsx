import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { themes, VALID_THEMES } from './theme/themes.js';
import type { ThemeName } from './theme/types.js';
import { getThemeName } from '../config.js';

interface ThemeSelectorProps {
  onSelect: (theme: ThemeName) => void;
}

export function ThemeSelector({ onSelect }: ThemeSelectorProps): React.ReactElement {
  const currentTheme = getThemeName();
  const initialIndex = VALID_THEMES.indexOf(currentTheme);
  const [selectedIndex, setSelectedIndex] = useState(initialIndex >= 0 ? initialIndex : 0);

  useInput((input, key) => {
    // j or down arrow: move down
    if (input === 'j' || key.downArrow) {
      setSelectedIndex((prev) => (prev < VALID_THEMES.length - 1 ? prev + 1 : 0));
    }
    // k or up arrow: move up
    if (input === 'k' || key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : VALID_THEMES.length - 1));
    }
    // Enter: select
    if (key.return) {
      onSelect(VALID_THEMES[selectedIndex]);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Select a theme:</Text>
      <Text dimColor>j/k: select, Enter: confirm</Text>
      <Box flexDirection="column" marginTop={1}>
        {VALID_THEMES.map((themeName, index) => {
          const theme = themes[themeName];
          const isSelected = index === selectedIndex;
          const isCurrent = themeName === currentTheme;

          return (
            <Box key={themeName}>
              <Text color={isSelected ? 'cyan' : undefined}>
                {isSelected ? '› ' : '  '}
                {theme.displayName}
                {isCurrent ? ' (current)' : ''}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
