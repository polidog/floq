import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../theme/index.js';

interface FunctionKey {
  key: string;
  label: string;
}

interface FunctionKeyBarProps {
  keys?: FunctionKey[];
}

const DEFAULT_KEYS: FunctionKey[] = [
  { key: 'F1', label: 'Help' },
  { key: 'F2', label: 'Add' },
  { key: 'F3', label: 'Done' },
  { key: 'F4', label: 'Next' },
  { key: 'F5', label: 'Rfrsh' },
  { key: 'F6', label: '' },
  { key: 'F7', label: '' },
  { key: 'F8', label: '' },
  { key: 'F9', label: '' },
  { key: 'F10', label: 'Quit' },
];

export function FunctionKeyBar({ keys = DEFAULT_KEYS }: FunctionKeyBarProps): React.ReactElement {
  const theme = useTheme();

  return (
    <Box>
      {keys.map((fn, index) => (
        <Box key={index} marginRight={0}>
          <Text backgroundColor={theme.colors.fnKeyLabel} color="white" bold>
            {fn.key}
          </Text>
          <Text backgroundColor={theme.colors.fnKeyText} color="black">
            {fn.label.padEnd(5, ' ')}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
