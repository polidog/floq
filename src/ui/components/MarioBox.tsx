import React from 'react';
import { Box, Text, useStdout } from 'ink';
import { useTheme } from '../theme/index.js';

interface MarioBoxProps {
  title?: string;
  children: React.ReactNode;
  borderColor?: string;
  minHeight?: number;
  paddingX?: number;
  isActive?: boolean;
}

// Mario-style block border characters
const BORDER = {
  topLeft: '┏',
  topRight: '┓',
  bottomLeft: '┗',
  bottomRight: '┛',
  horizontal: '━',
  vertical: '┃',
  // Question block decorations
  questionMark: '?',
  coin: '●',
  brick: '▓',
};

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

export function MarioBox({
  title,
  children,
  borderColor,
  minHeight = 1,
  paddingX = 1,
  isActive = false,
}: MarioBoxProps): React.ReactElement {
  const theme = useTheme();
  const { stdout } = useStdout();
  const activeColor = theme.colors.borderActive || '#fbd000'; // Gold
  const inactiveColor = borderColor || theme.colors.border;
  const color = isActive ? activeColor : inactiveColor;
  const accentColor = theme.colors.accent || '#43b047'; // Green pipe

  // Get terminal width
  const terminalWidth = stdout?.columns || 80;
  const boxWidth = terminalWidth - 4;
  const innerWidth = boxWidth - 2;

  // Calculate title section widths
  const titleText = title || '';
  const titleLength = getDisplayWidth(titleText);

  // Title format with ? blocks: "━[?]━ Title ━[?]━..."
  const titlePadding = titleLength > 0 ? 2 : 0;
  const decorWidth = 3; // [?] decoration
  const leftDashes = 2;
  const rightDashes = Math.max(0, innerWidth - leftDashes - decorWidth - titlePadding - titleLength - decorWidth - 2);

  // Convert children to array
  const childArray = React.Children.toArray(children);
  const hasContent = childArray.length > 0 && childArray.some(child => child !== null && child !== undefined);

  const contentRows = hasContent ? childArray.length : 1;
  const emptyRowsNeeded = Math.max(0, minHeight - contentRows);

  const contentElements = hasContent ? childArray : [<Text key="empty"> </Text>];

  return (
    <Box flexDirection="column">
      {/* Top border with ? block title */}
      <Box>
        <Text color={color}>{BORDER.topLeft}</Text>
        {titleLength > 0 ? (
          <>
            <Text color={color}>{BORDER.horizontal.repeat(leftDashes)}</Text>
            <Text color={activeColor} bold>[</Text>
            <Text color={activeColor} bold>{BORDER.questionMark}</Text>
            <Text color={activeColor} bold>]</Text>
            <Text color={color}>{BORDER.horizontal} </Text>
            <Text color={theme.colors.text} bold>{titleText}</Text>
            <Text color={color}> {BORDER.horizontal}</Text>
            <Text color={activeColor} bold>[</Text>
            <Text color={activeColor} bold>{BORDER.questionMark}</Text>
            <Text color={activeColor} bold>]</Text>
            <Text color={color}>{BORDER.horizontal.repeat(Math.max(0, rightDashes))}</Text>
          </>
        ) : (
          <Text color={color}>{BORDER.horizontal.repeat(innerWidth)}</Text>
        )}
        <Text color={color}>{BORDER.topRight}</Text>
      </Box>

      {/* Content rows */}
      {contentElements.map((child, index) => (
        <Box key={index}>
          <Text color={color}>{BORDER.vertical}</Text>
          <Box width={innerWidth} paddingX={paddingX}>
            <Box flexGrow={1}>{child}</Box>
          </Box>
          <Text color={color}>{BORDER.vertical}</Text>
        </Box>
      ))}

      {/* Empty rows for minHeight */}
      {Array.from({ length: emptyRowsNeeded }).map((_, index) => (
        <Box key={`empty-${index}`}>
          <Text color={color}>{BORDER.vertical}</Text>
          <Text>{' '.repeat(innerWidth)}</Text>
          <Text color={color}>{BORDER.vertical}</Text>
        </Box>
      ))}

      {/* Bottom border with pipe decorations */}
      <Box>
        <Text color={color}>{BORDER.bottomLeft}</Text>
        <Text color={color}>{BORDER.horizontal.repeat(2)}</Text>
        <Text color={accentColor} bold>|</Text>
        <Text color={accentColor} bold>=</Text>
        <Text color={accentColor} bold>|</Text>
        <Text color={color}>{BORDER.horizontal.repeat(Math.max(0, innerWidth - 10))}</Text>
        <Text color={accentColor} bold>|</Text>
        <Text color={accentColor} bold>=</Text>
        <Text color={accentColor} bold>|</Text>
        <Text color={color}>{BORDER.horizontal.repeat(2)}</Text>
        <Text color={color}>{BORDER.bottomRight}</Text>
      </Box>
    </Box>
  );
}

// Inline version for two-pane layout
interface MarioBoxInlineProps {
  title: string;
  children: React.ReactNode;
  width: number;
  minHeight?: number;
  isActive?: boolean;
}

export function MarioBoxInline({
  title,
  children,
  width,
  minHeight = 1,
  isActive = false,
}: MarioBoxInlineProps): React.ReactElement {
  const theme = useTheme();
  const activeColor = theme.colors.borderActive || '#fbd000';
  const inactiveColor = theme.colors.border;
  const color = isActive ? activeColor : inactiveColor;
  const accentColor = theme.colors.accent || '#43b047';
  const innerWidth = width - 2;

  const titleLength = getDisplayWidth(title);
  // Top border: ┏ + ━(leftDashes) + [?] + space + title + space + ━(rightDashes) + ┓
  // Total inner: leftDashes + 3 + 1 + titleLength + 1 + rightDashes = innerWidth
  const leftDashes = 1;
  const rightDashes = Math.max(0, innerWidth - leftDashes - 3 - 1 - titleLength - 1);

  const childArray = React.Children.toArray(children);
  const contentRows = childArray.length || 1;
  const emptyRowsNeeded = Math.max(0, minHeight - contentRows);

  return (
    <Box flexDirection="column">
      {/* Top border */}
      <Box>
        <Text color={color}>{BORDER.topLeft}</Text>
        <Text color={color}>{BORDER.horizontal.repeat(leftDashes)}</Text>
        <Text color={activeColor} bold>[</Text>
        <Text color={activeColor} bold>?</Text>
        <Text color={activeColor} bold>]</Text>
        <Text color={color}> </Text>
        <Text color={theme.colors.text} bold>{title}</Text>
        <Text color={color}> {BORDER.horizontal.repeat(Math.max(0, rightDashes))}</Text>
        <Text color={color}>{BORDER.topRight}</Text>
      </Box>

      {/* Content */}
      {childArray.length > 0 ? (
        childArray.map((child, i) => (
          <Box key={i}>
            <Text color={color}>{BORDER.vertical}</Text>
            <Box width={innerWidth} paddingX={1}>
              <Box flexGrow={1}>{child}</Box>
            </Box>
            <Text color={color}>{BORDER.vertical}</Text>
          </Box>
        ))
      ) : (
        <Box>
          <Text color={color}>{BORDER.vertical}</Text>
          <Box width={innerWidth}><Text> </Text></Box>
          <Text color={color}>{BORDER.vertical}</Text>
        </Box>
      )}

      {/* Empty rows */}
      {Array.from({ length: emptyRowsNeeded }).map((_, i) => (
        <Box key={`empty-${i}`}>
          <Text color={color}>{BORDER.vertical}</Text>
          <Box width={innerWidth}><Text> </Text></Box>
          <Text color={color}>{BORDER.vertical}</Text>
        </Box>
      ))}

      {/* Bottom border with mini pipes */}
      <Box>
        <Text color={color}>{BORDER.bottomLeft}</Text>
        <Text color={accentColor}>|=|</Text>
        <Text color={color}>{BORDER.horizontal.repeat(Math.max(0, innerWidth - 6))}</Text>
        <Text color={accentColor}>|=|</Text>
        <Text color={color}>{BORDER.bottomRight}</Text>
      </Box>
    </Box>
  );
}
