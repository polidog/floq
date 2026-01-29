import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { getViewMode, type ViewMode } from '../config.js';

const VALID_VIEW_MODES: ViewMode[] = ['gtd', 'kanban'];

const modeDisplayNames: Record<ViewMode, string> = {
  gtd: 'GTD (Getting Things Done)',
  kanban: 'Kanban Board',
};

const modeDescriptions: Record<ViewMode, string> = {
  gtd: 'Classic GTD workflow with Inbox, Next, Waiting, Someday lists',
  kanban: '3-column kanban board view',
};

interface ModeSelectorProps {
  onSelect: (mode: ViewMode) => void;
  onCancel?: () => void;
}

export function ModeSelector({ onSelect, onCancel }: ModeSelectorProps): React.ReactElement {
  const currentMode = getViewMode();
  const initialIndex = VALID_VIEW_MODES.indexOf(currentMode);
  const [selectedIndex, setSelectedIndex] = useState(initialIndex >= 0 ? initialIndex : 0);

  useInput((input, key) => {
    if (key.escape && onCancel) {
      onCancel();
      return;
    }
    // j or down arrow: move down
    if (input === 'j' || key.downArrow) {
      setSelectedIndex((prev) => (prev < VALID_VIEW_MODES.length - 1 ? prev + 1 : 0));
    }
    // k or up arrow: move up
    if (input === 'k' || key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : VALID_VIEW_MODES.length - 1));
    }
    // Enter: select
    if (key.return) {
      onSelect(VALID_VIEW_MODES[selectedIndex]);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Select a view mode:</Text>
      <Text dimColor>j/k: select, Enter: confirm, Esc: cancel</Text>
      <Box flexDirection="column" marginTop={1}>
        {VALID_VIEW_MODES.map((mode, index) => {
          const isSelected = index === selectedIndex;
          const isCurrent = mode === currentMode;

          return (
            <Box key={mode} flexDirection="column" marginBottom={1}>
              <Text color={isSelected ? 'cyan' : undefined}>
                {isSelected ? '› ' : '  '}
                {modeDisplayNames[mode]}
                {isCurrent ? ' (current)' : ''}
              </Text>
              <Text dimColor>
                {'    '}{modeDescriptions[mode]}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
