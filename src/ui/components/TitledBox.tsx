import React from 'react';
import { Box, Text, useStdout } from 'ink';
import { useTheme } from '../theme/index.js';

interface TitledBoxProps {
  title?: string;
  children: React.ReactNode;
  borderColor?: string;
  minHeight?: number;
  paddingX?: number;
  showShadow?: boolean;
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

// Shadow character
const SHADOW = '░';

// Calculate display width of string (full-width chars = 2, half-width = 1)
function getDisplayWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    const code = char.charCodeAt(0);
    // Full-width characters: CJK, full-width forms, etc.
    if (
      (code >= 0x1100 && code <= 0x115F) || // Hangul Jamo
      (code >= 0x2E80 && code <= 0x9FFF) || // CJK
      (code >= 0xAC00 && code <= 0xD7AF) || // Hangul Syllables
      (code >= 0xF900 && code <= 0xFAFF) || // CJK Compatibility
      (code >= 0xFE10 && code <= 0xFE1F) || // Vertical forms
      (code >= 0xFE30 && code <= 0xFE6F) || // CJK Compatibility Forms
      (code >= 0xFF00 && code <= 0xFF60) || // Full-width forms
      (code >= 0xFFE0 && code <= 0xFFE6) || // Full-width symbols
      (code >= 0x20000 && code <= 0x2FFFF)  // CJK Extension B+
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

export function TitledBox({
  title,
  children,
  borderColor,
  minHeight = 1,
  paddingX = 1,
  showShadow = true,
}: TitledBoxProps): React.ReactElement {
  const theme = useTheme();
  const { stdout } = useStdout();
  const color = borderColor || theme.colors.border;
  const shadowColor = theme.colors.muted;

  // Get terminal width, account for outer padding and shadow
  const terminalWidth = stdout?.columns || 80;
  const shadowWidth = showShadow ? 1 : 0;
  const boxWidth = terminalWidth - 2 - shadowWidth; // Outer padding + shadow
  const innerWidth = boxWidth - 2; // Subtract left and right border characters

  // Calculate title section widths
  const titleText = title || '';
  const titleLength = getDisplayWidth(titleText);

  // Title format: "─── Title ─────..."
  const leftDashes = 3;
  const titlePadding = titleLength > 0 ? 2 : 0; // spaces around title
  const rightDashes = innerWidth - leftDashes - titlePadding - titleLength;

  // Convert children to array for proper rendering
  const childArray = React.Children.toArray(children);
  const hasContent = childArray.length > 0 && childArray.some(child => child !== null && child !== undefined);

  // Calculate how many rows we need
  const contentRows = hasContent ? childArray.length : 1;
  const emptyRowsNeeded = Math.max(0, minHeight - contentRows);

  // Build content rows
  const contentElements = hasContent ? childArray : [<Text key="empty"> </Text>];

  return (
    <Box flexDirection="column">
      {/* Top border with title */}
      <Box>
        <Text color={color}>{BORDER.topLeft}</Text>
        {titleLength > 0 ? (
          <>
            <Text color={color}>{BORDER.horizontal.repeat(leftDashes)} </Text>
            <Text color={theme.colors.accent} bold>{titleText}</Text>
            <Text color={color}> {BORDER.horizontal.repeat(Math.max(0, rightDashes))}</Text>
          </>
        ) : (
          <Text color={color}>{BORDER.horizontal.repeat(innerWidth)}</Text>
        )}
        <Text color={color}>{BORDER.topRight}</Text>
        {showShadow && <Text> </Text>}
      </Box>

      {/* Content rows */}
      {contentElements.map((child, index) => (
        <Box key={index}>
          <Text color={color}>{BORDER.vertical}</Text>
          <Box width={innerWidth} paddingX={paddingX}>
            <Box flexGrow={1}>{child}</Box>
          </Box>
          <Text color={color}>{BORDER.vertical}</Text>
          {showShadow && <Text color={shadowColor}>{SHADOW}</Text>}
        </Box>
      ))}

      {/* Empty rows for minHeight */}
      {Array.from({ length: emptyRowsNeeded }).map((_, index) => (
        <Box key={`empty-${index}`}>
          <Text color={color}>{BORDER.vertical}</Text>
          <Text>{' '.repeat(innerWidth)}</Text>
          <Text color={color}>{BORDER.vertical}</Text>
          {showShadow && <Text color={shadowColor}>{SHADOW}</Text>}
        </Box>
      ))}

      {/* Bottom border */}
      <Box>
        <Text color={color}>{BORDER.bottomLeft}</Text>
        <Text color={color}>{BORDER.horizontal.repeat(innerWidth)}</Text>
        <Text color={color}>{BORDER.bottomRight}</Text>
        {showShadow && <Text color={shadowColor}>{SHADOW}</Text>}
      </Box>

      {/* Bottom shadow */}
      {showShadow && (
        <Box>
          <Text color={shadowColor}> {SHADOW.repeat(boxWidth)}</Text>
        </Box>
      )}
    </Box>
  );
}
