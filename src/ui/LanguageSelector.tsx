import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { getLocale, type Locale } from '../config.js';

const VALID_LOCALES: Locale[] = ['en', 'ja'];

const localeDisplayNames: Record<Locale, string> = {
  en: 'English',
  ja: '日本語 (Japanese)',
};

interface LanguageSelectorProps {
  onSelect: (locale: Locale) => void;
  onCancel: () => void;
}

export function LanguageSelector({ onSelect, onCancel }: LanguageSelectorProps): React.ReactElement {
  const currentLocale = getLocale();
  const initialIndex = VALID_LOCALES.indexOf(currentLocale);
  const [selectedIndex, setSelectedIndex] = useState(initialIndex >= 0 ? initialIndex : 0);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    // j or down arrow: move down
    if (input === 'j' || key.downArrow) {
      setSelectedIndex((prev) => (prev < VALID_LOCALES.length - 1 ? prev + 1 : 0));
    }
    // k or up arrow: move up
    if (input === 'k' || key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : VALID_LOCALES.length - 1));
    }
    // Enter: select
    if (key.return) {
      onSelect(VALID_LOCALES[selectedIndex]);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Select language / 言語を選択:</Text>
      <Text dimColor>j/k: select, Enter: confirm, Esc: cancel</Text>
      <Box flexDirection="column" marginTop={1}>
        {VALID_LOCALES.map((locale, index) => {
          const isSelected = index === selectedIndex;
          const isCurrent = locale === currentLocale;

          return (
            <Box key={locale}>
              <Text color={isSelected ? 'cyan' : undefined}>
                {isSelected ? '› ' : '  '}
                {localeDisplayNames[locale]}
                {isCurrent ? ' (current)' : ''}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
