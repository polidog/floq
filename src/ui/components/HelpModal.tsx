import React from 'react';
import { Box, Text } from 'ink';
import { t } from '../../i18n/index.js';
import { useTheme } from '../theme/index.js';
import type { BorderStyleType } from '../theme/types.js';

interface HelpModalProps {
  onClose: () => void;
  isKanban?: boolean;
}

export function HelpModal({ onClose, isKanban = false }: HelpModalProps): React.ReactElement {
  const i18n = t();
  const theme = useTheme();

  // Show Kanban help if in Kanban mode
  if (isKanban) {
    return <KanbanHelpModal onClose={onClose} />;
  }

  const help = i18n.tui.help;

  const formatTitle = (title: string) =>
    theme.style.headerUppercase ? title.toUpperCase() : title;

  return (
    <Box
      flexDirection="column"
      borderStyle={theme.borders.modal as BorderStyleType}
      borderColor={theme.colors.borderActive}
      paddingX={2}
      paddingY={1}
    >
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color={theme.colors.secondary}>
          {formatTitle(help.title)}
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.colors.accent}>
          {formatTitle(help.navigation)}
        </Text>
        <Box paddingLeft={2} flexDirection="column">
          <Text color={theme.colors.text}>
            <Text color={theme.colors.textHighlight}>1-5</Text>      {help.tabSwitch}
          </Text>
          <Text color={theme.colors.text}>
            <Text color={theme.colors.textHighlight}>h/l ←/→</Text>  {help.prevNextTab}
          </Text>
          <Text color={theme.colors.text}>
            <Text color={theme.colors.textHighlight}>j/k ↑/↓</Text>  {help.taskSelect}
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.colors.accent}>
          {formatTitle(help.actions)}
        </Text>
        <Box paddingLeft={2} flexDirection="column">
          <Text color={theme.colors.text}>
            <Text color={theme.colors.textHighlight}>a</Text>        {help.addTask}
          </Text>
          <Text color={theme.colors.text}>
            <Text color={theme.colors.textHighlight}>d</Text>        {help.completeTask}
          </Text>
          <Text color={theme.colors.text}>
            <Text color={theme.colors.textHighlight}>n</Text>        {help.moveToNext}
          </Text>
          <Text color={theme.colors.text}>
            <Text color={theme.colors.textHighlight}>s</Text>        {help.moveToSomeday}
          </Text>
          <Text color={theme.colors.text}>
            <Text color={theme.colors.textHighlight}>i</Text>        {help.moveToInbox}
          </Text>
          <Text color={theme.colors.text}>
            <Text color={theme.colors.textHighlight}>r</Text>        {help.refresh}
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.colors.accent}>
          {formatTitle(help.projects)}
        </Text>
        <Box paddingLeft={2} flexDirection="column">
          <Text color={theme.colors.text}>
            <Text color={theme.colors.textHighlight}>p</Text>        {help.makeProject}
          </Text>
          <Text color={theme.colors.text}>
            <Text color={theme.colors.textHighlight}>P</Text>        {help.linkToProject}
          </Text>
          <Text color={theme.colors.text}>
            <Text color={theme.colors.textHighlight}>Enter</Text>    {help.openProject}
          </Text>
          <Text color={theme.colors.text}>
            <Text color={theme.colors.textHighlight}>Esc/b</Text>    {help.backFromProject}
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.colors.accent}>
          {formatTitle(help.other)}
        </Text>
        <Box paddingLeft={2} flexDirection="column">
          <Text color={theme.colors.text}>
            <Text color={theme.colors.textHighlight}>?</Text>        {help.showHelp}
          </Text>
          <Text color={theme.colors.text}>
            <Text color={theme.colors.textHighlight}>q</Text>        {help.quit}
          </Text>
        </Box>
      </Box>

      <Box justifyContent="center" marginTop={1}>
        <Text color={theme.colors.textMuted}>{help.closeHint}</Text>
      </Box>
    </Box>
  );
}

function KanbanHelpModal({ onClose }: { onClose: () => void }): React.ReactElement {
  const i18n = t();
  const help = i18n.tui.kanbanHelp;
  const theme = useTheme();

  const formatTitle = (title: string) =>
    theme.style.headerUppercase ? title.toUpperCase() : title;

  return (
    <Box
      flexDirection="column"
      borderStyle={theme.borders.modal as BorderStyleType}
      borderColor={theme.colors.borderActive}
      paddingX={2}
      paddingY={1}
    >
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color={theme.colors.secondary}>
          {formatTitle(help.title)}
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.colors.accent}>
          {formatTitle(help.navigation)}
        </Text>
        <Box paddingLeft={2} flexDirection="column">
          <Text color={theme.colors.text}>
            <Text color={theme.colors.textHighlight}>h/l ←/→</Text>  {help.columnSwitch}
          </Text>
          <Text color={theme.colors.text}>
            <Text color={theme.colors.textHighlight}>1-3</Text>      {help.columnDirect}
          </Text>
          <Text color={theme.colors.text}>
            <Text color={theme.colors.textHighlight}>j/k ↑/↓</Text>  {help.taskSelect}
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.colors.accent}>
          {formatTitle(help.actions)}
        </Text>
        <Box paddingLeft={2} flexDirection="column">
          <Text color={theme.colors.text}>
            <Text color={theme.colors.textHighlight}>a</Text>        {help.addTask}
          </Text>
          <Text color={theme.colors.text}>
            <Text color={theme.colors.textHighlight}>d</Text>        {help.completeTask}
          </Text>
          <Text color={theme.colors.text}>
            <Text color={theme.colors.textHighlight}>Enter</Text>    {help.moveRight}
          </Text>
          <Text color={theme.colors.text}>
            <Text color={theme.colors.textHighlight}>BS</Text>       {help.moveLeft}
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.colors.accent}>
          {formatTitle(help.other)}
        </Text>
        <Box paddingLeft={2} flexDirection="column">
          <Text color={theme.colors.text}>
            <Text color={theme.colors.textHighlight}>?</Text>        {help.showHelp}
          </Text>
          <Text color={theme.colors.text}>
            <Text color={theme.colors.textHighlight}>q</Text>        {help.quit}
          </Text>
        </Box>
      </Box>

      <Box justifyContent="center" marginTop={1}>
        <Text color={theme.colors.textMuted}>{help.closeHint}</Text>
      </Box>
    </Box>
  );
}
