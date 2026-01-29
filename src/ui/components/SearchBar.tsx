import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { t } from '../../i18n/index.js';
import { useTheme } from '../theme/index.js';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
}

export function SearchBar({ value, onChange, onSubmit }: SearchBarProps): React.ReactElement {
  const i18n = t();
  const theme = useTheme();
  const search = i18n.tui.search;

  return (
    <Box marginTop={1}>
      <Text color={theme.colors.secondary} bold>
        {search.prefix}
      </Text>
      <TextInput
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder={search.placeholder}
      />
      <Text color={theme.colors.textMuted}> {search.help}</Text>
    </Box>
  );
}
