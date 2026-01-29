import React from 'react';
import { Box, Text } from 'ink';
import { Select } from '@inkjs/ui';
import { themes, VALID_THEMES } from './theme/themes.js';
import { getThemeName, type ThemeName } from '../config.js';

interface ThemeSelectorProps {
  onSelect: (theme: ThemeName) => void;
}

export function ThemeSelector({ onSelect }: ThemeSelectorProps): React.ReactElement {
  const currentTheme = getThemeName();

  const options = VALID_THEMES.map((themeName) => {
    const theme = themes[themeName];
    const isCurrent = themeName === currentTheme;
    return {
      label: `${theme.displayName}${isCurrent ? ' (current)' : ''}`,
      value: themeName,
    };
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Select a theme:</Text>
      <Box marginTop={1}>
        <Select
          options={options}
          onChange={(value) => onSelect(value as ThemeName)}
        />
      </Box>
    </Box>
  );
}
