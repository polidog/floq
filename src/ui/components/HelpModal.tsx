import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { t } from '../../i18n/index.js';
import { useTheme } from '../theme/index.js';
import type { BorderStyleType } from '../theme/types.js';
import { parseChangelog } from '../../changelog.js';

interface HelpModalProps {
  onClose: () => void;
  isKanban?: boolean;
}

type TabType = 'keybindings' | 'whatsNew';

export function HelpModal({ onClose, isKanban = false }: HelpModalProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<TabType>('keybindings');
  const i18n = t();
  const theme = useTheme();
  const help = i18n.tui.help;

  useInput((input, key) => {
    if (key.tab) {
      setActiveTab(prev => prev === 'keybindings' ? 'whatsNew' : 'keybindings');
    } else if (input === 'h' || key.leftArrow) {
      if (activeTab !== 'keybindings') {
        setActiveTab('keybindings');
      }
    } else if (input === 'l' || key.rightArrow) {
      if (activeTab !== 'whatsNew') {
        setActiveTab('whatsNew');
      }
    } else if (key.escape || key.return || input === 'q' || input === ' ') {
      onClose();
    }
  });

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
      {/* Tabs */}
      <Box justifyContent="center" marginBottom={1}>
        <Box>
          <Text
            bold={activeTab === 'keybindings'}
            color={activeTab === 'keybindings' ? theme.colors.secondary : theme.colors.textMuted}
            inverse={activeTab === 'keybindings'}
          >
            {' '}{formatTitle(help.keybindingsTab)}{' '}
          </Text>
          <Text color={theme.colors.textMuted}> │ </Text>
          <Text
            bold={activeTab === 'whatsNew'}
            color={activeTab === 'whatsNew' ? theme.colors.secondary : theme.colors.textMuted}
            inverse={activeTab === 'whatsNew'}
          >
            {' '}{formatTitle(help.whatsNewTab)}{' '}
          </Text>
        </Box>
      </Box>

      {/* Content */}
      {activeTab === 'keybindings' ? (
        isKanban ? (
          <KanbanKeybindingsContent />
        ) : (
          <GTDKeybindingsContent />
        )
      ) : (
        <WhatsNewContent />
      )}

      {/* Footer */}
      <Box justifyContent="center" marginTop={1}>
        <Text color={theme.colors.textMuted}>
          {help.tabHint} | {help.closeHint}
        </Text>
      </Box>
    </Box>
  );
}

function GTDKeybindingsContent(): React.ReactElement {
  const i18n = t();
  const help = i18n.tui.help;
  const theme = useTheme();

  const formatTitle = (title: string) =>
    theme.style.headerUppercase ? title.toUpperCase() : title;

  return (
    <>
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.colors.accent}>
          {formatTitle(help.navigation)}
        </Text>
        <Box paddingLeft={2} flexDirection="column">
          <Text color={theme.colors.text}>
            <Text color={theme.colors.textHighlight}>1-6</Text>      {help.tabSwitch}
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
            <Text color={theme.colors.textHighlight}>w</Text>        {help.moveToWaiting}
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
    </>
  );
}

function KanbanKeybindingsContent(): React.ReactElement {
  const i18n = t();
  const help = i18n.tui.kanbanHelp;
  const theme = useTheme();

  const formatTitle = (title: string) =>
    theme.style.headerUppercase ? title.toUpperCase() : title;

  return (
    <>
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
    </>
  );
}

function WhatsNewContent(): React.ReactElement {
  const i18n = t();
  const whatsNew = i18n.tui.whatsNew;
  const theme = useTheme();
  const changelog = parseChangelog();

  const formatTitle = (title: string) =>
    theme.style.headerUppercase ? title.toUpperCase() : title;

  const getSectionLabel = (type: string): string => {
    const labels: Record<string, string> = {
      Added: whatsNew.added,
      Changed: whatsNew.changed,
      Deprecated: whatsNew.deprecated,
      Removed: whatsNew.removed,
      Fixed: whatsNew.fixed,
      Security: whatsNew.security,
    };
    return labels[type] || type;
  };

  if (changelog.entries.length === 0) {
    return (
      <Box justifyContent="center" paddingY={2}>
        <Text color={theme.colors.textMuted}>{whatsNew.noChanges}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {changelog.entries.slice(0, 3).map((entry, index) => (
        <Box key={entry.version} flexDirection="column" marginBottom={index < 2 ? 1 : 0}>
          <Text bold color={theme.colors.accent}>
            v{entry.version} {entry.date && <Text color={theme.colors.textMuted}>({entry.date})</Text>}
          </Text>
          {entry.sections.map((section) => (
            <Box key={section.type} flexDirection="column" paddingLeft={2}>
              <Text color={theme.colors.secondary}>
                {formatTitle(getSectionLabel(section.type))}:
              </Text>
              {section.items.slice(0, 5).map((item, itemIndex) => (
                <Text key={itemIndex} color={theme.colors.text}>
                  • {item}
                </Text>
              ))}
              {section.items.length > 5 && (
                <Text color={theme.colors.textMuted}>
                  ... +{section.items.length - 5} more
                </Text>
              )}
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}
