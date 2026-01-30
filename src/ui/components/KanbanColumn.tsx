import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../theme/index.js';
import type { Task } from '../../db/schema.js';
import type { BorderStyleType } from '../theme/types.js';

export type KanbanColumnType = 'todo' | 'doing' | 'done';

interface KanbanColumnProps {
  title: string;
  tasks: Task[];
  isActive: boolean;
  selectedTaskIndex: number;
  columnIndex: number;
}

// Round border characters (DQ style)
const BORDER = {
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
  horizontal: '─',
  vertical: '│',
};

const SHADOW = '░';

// Calculate display width of string (full-width chars = 2, half-width = 1)
function getDisplayWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    const code = char.charCodeAt(0);
    if (
      (code >= 0x1100 && code <= 0x115F) ||
      (code >= 0x2E80 && code <= 0x9FFF) ||
      (code >= 0xAC00 && code <= 0xD7AF) ||
      (code >= 0xF900 && code <= 0xFAFF) ||
      (code >= 0xFE10 && code <= 0xFE1F) ||
      (code >= 0xFE30 && code <= 0xFE6F) ||
      (code >= 0xFF00 && code <= 0xFF60) ||
      (code >= 0xFFE0 && code <= 0xFFE6) ||
      (code >= 0x20000 && code <= 0x2FFFF)
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

export function KanbanColumn({
  title,
  tasks,
  isActive,
  selectedTaskIndex,
  columnIndex,
}: KanbanColumnProps): React.ReactElement {
  const theme = useTheme();
  const isLastColumn = columnIndex === 2;
  const showShadow = theme.uiStyle === 'titled-box' && isLastColumn;

  // Use TitledBox style for dragon-quest theme
  if (theme.uiStyle === 'titled-box') {
    const color = isActive ? theme.colors.borderActive : theme.colors.border;
    const shadowColor = theme.colors.muted;
    const titleText = `${title} (${tasks.length})`;
    const titleLength = getDisplayWidth(titleText);

    // Fixed width for each column (will be stretched by flexGrow)
    const innerWidth = 24;
    const leftDashes = 2;
    const titlePadding = 2;
    const rightDashes = Math.max(2, innerWidth - leftDashes - titlePadding - titleLength);

    return (
      <Box flexDirection="column" flexGrow={1} flexBasis={0} marginRight={columnIndex < 2 ? 1 : 0}>
        {/* Top border with title */}
        <Box>
          <Text color={color}>{BORDER.topLeft}</Text>
          <Text color={color}>{BORDER.horizontal.repeat(leftDashes)} </Text>
          <Text color={isActive ? theme.colors.accent : theme.colors.textMuted} bold={isActive}>
            {titleText}
          </Text>
          <Text color={color}> {BORDER.horizontal.repeat(rightDashes)}</Text>
          <Text color={color}>{BORDER.topRight}</Text>
          {showShadow && <Text> </Text>}
        </Box>

        {/* Tasks list */}
        <Box flexDirection="column" minHeight={8}>
          {tasks.length === 0 ? (
            <Box>
              <Text color={color}>{BORDER.vertical}</Text>
              <Box paddingX={1} flexGrow={1}>
                <Text color={theme.colors.textMuted} italic>-</Text>
              </Box>
              <Text color={color}>{BORDER.vertical}</Text>
              {showShadow && <Text color={shadowColor}>{SHADOW}</Text>}
            </Box>
          ) : (
            tasks.map((task, index) => {
              const isSelected = isActive && index === selectedTaskIndex;
              const shortId = task.id.slice(0, 6);

              return (
                <Box key={task.id}>
                  <Text color={color}>{BORDER.vertical}</Text>
                  <Box paddingX={1} flexGrow={1}>
                    <Text
                      color={isSelected ? theme.colors.textSelected : theme.colors.text}
                      bold={isSelected}
                    >
                      {isSelected ? theme.style.selectedPrefix : theme.style.unselectedPrefix}
                      [{shortId}] {task.title}
                    </Text>
                  </Box>
                  <Text color={color}>{BORDER.vertical}</Text>
                  {showShadow && <Text color={shadowColor}>{SHADOW}</Text>}
                </Box>
              );
            })
          )}
          {/* Fill remaining height with empty rows */}
          {Array.from({ length: Math.max(0, 8 - Math.max(1, tasks.length)) }).map((_, i) => (
            <Box key={`empty-${i}`}>
              <Text color={color}>{BORDER.vertical}</Text>
              <Box paddingX={1} flexGrow={1}>
                <Text> </Text>
              </Box>
              <Text color={color}>{BORDER.vertical}</Text>
              {showShadow && <Text color={shadowColor}>{SHADOW}</Text>}
            </Box>
          ))}
        </Box>

        {/* Bottom border */}
        <Box>
          <Text color={color}>{BORDER.bottomLeft}</Text>
          <Text color={color}>{BORDER.horizontal.repeat(innerWidth)}</Text>
          <Text color={color}>{BORDER.bottomRight}</Text>
          {showShadow && <Text color={shadowColor}>{SHADOW}</Text>}
        </Box>

        {/* Bottom shadow (only for last column) */}
        {showShadow && (
          <Box>
            <Text color={shadowColor}> {SHADOW.repeat(innerWidth + 2)}</Text>
          </Box>
        )}
      </Box>
    );
  }

  // Default style
  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      flexBasis={0}
      borderStyle={theme.borders.list as BorderStyleType}
      borderColor={isActive ? theme.colors.borderActive : theme.colors.border}
      marginRight={columnIndex < 2 ? 1 : 0}
    >
      {/* Column header */}
      <Box
        paddingX={1}
        justifyContent="center"
        borderStyle={undefined}
      >
        <Text
          bold
          color={isActive ? theme.colors.primary : theme.colors.textMuted}
          inverse={isActive && theme.style.tabActiveInverse}
        >
          {title} ({tasks.length})
        </Text>
      </Box>

      {/* Tasks list */}
      <Box flexDirection="column" paddingX={1} paddingY={1} minHeight={8}>
        {tasks.length === 0 ? (
          <Text color={theme.colors.textMuted} italic>-</Text>
        ) : (
          tasks.map((task, index) => {
            const isSelected = isActive && index === selectedTaskIndex;
            const shortId = task.id.slice(0, 6);

            return (
              <Box key={task.id}>
                <Text
                  color={isSelected ? theme.colors.textSelected : theme.colors.text}
                  bold={isSelected}
                >
                  {isSelected ? theme.style.selectedPrefix : theme.style.unselectedPrefix}
                  [{shortId}] {task.title}
                </Text>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
}
