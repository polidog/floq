import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../theme/index.js';
import { t } from '../../i18n/index.js';

interface ActionKey {
  key: string;
  label: string;
}

interface ActionKeyBarProps {
  keys?: ActionKey[];
}

export function ActionKeyBar({ keys }: ActionKeyBarProps): React.ReactElement {
  const theme = useTheme();
  const i18n = t();
  const kb = i18n.tui.keyBar;

  const defaultKeys: ActionKey[] = [
    { key: 'a', label: kb.add },
    { key: 'd', label: kb.done },
    { key: 'n', label: kb.next },
    { key: 's', label: kb.someday },
    { key: 'i', label: kb.inbox },
    { key: 'p', label: kb.project },
    { key: '?', label: kb.help },
    { key: 'q', label: kb.quit },
  ];

  const displayKeys = keys || defaultKeys;

  return (
    <Box>
      {displayKeys.map((action, index) => (
        <Box key={index} marginRight={1}>
          <Text color={theme.colors.fnKeyLabel} bold>[{action.key}]</Text>
          <Text color={theme.colors.fnKeyText}>{action.label}</Text>
        </Box>
      ))}
    </Box>
  );
}

// Alias for backward compatibility
export const FunctionKeyBar = ActionKeyBar;
