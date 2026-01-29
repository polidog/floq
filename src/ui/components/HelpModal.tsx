import React, { useState, useMemo } from 'react';
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

const VISIBLE_LINES = 12;

export function HelpModal({ onClose, isKanban = false }: HelpModalProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<TabType>('keybindings');
  const [scrollOffset, setScrollOffset] = useState(0);
  const i18n = t();
  const theme = useTheme();
  const help = i18n.tui.help;

  // Get changelog items for scroll calculation
  const changelogItems = useMemo(() => {
    const changelog = parseChangelog();
    const items: { type: 'version' | 'section' | 'item'; content: string; date?: string }[] = [];

    for (const entry of changelog.entries.slice(0, 5)) {
      items.push({ type: 'version', content: entry.version, date: entry.date });
      for (const section of entry.sections) {
        items.push({ type: 'section', content: section.type });
        for (const item of section.items) {
          items.push({ type: 'item', content: item });
        }
      }
    }
    return items;
  }, []);

  const maxScroll = Math.max(0, changelogItems.length - VISIBLE_LINES);

  useInput((input, key) => {
    // Tab key detection (key.tab or raw tab character)
    if (key.tab || input === '\t') {
      setActiveTab(prev => prev === 'keybindings' ? 'whatsNew' : 'keybindings');
      setScrollOffset(0);
      return;
    }
    // Number keys for direct tab access
    if (input === '1') {
      setActiveTab('keybindings');
      setScrollOffset(0);
      return;
    }
    if (input === '2') {
      setActiveTab('whatsNew');
      setScrollOffset(0);
      return;
    }
    // Arrow keys and h/l for tab switching
    if (input === 'h' || key.leftArrow) {
      setActiveTab('keybindings');
      setScrollOffset(0);
      return;
    }
    if (input === 'l' || key.rightArrow) {
      setActiveTab('whatsNew');
      setScrollOffset(0);
      return;
    }
    // Scroll in What's New tab
    if (activeTab === 'whatsNew') {
      if (input === 'j' || key.downArrow) {
        setScrollOffset(prev => Math.min(prev + 1, maxScroll));
        return;
      }
      if (input === 'k' || key.upArrow) {
        setScrollOffset(prev => Math.max(prev - 1, 0));
        return;
      }
    }
    // Close modal
    if (key.escape || key.return || input === 'q' || input === ' ') {
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
        <WhatsNewContent
          items={changelogItems}
          scrollOffset={scrollOffset}
          visibleLines={VISIBLE_LINES}
          maxScroll={maxScroll}
        />
      )}

      {/* Footer */}
      <Box justifyContent="center" marginTop={1}>
        <Text color={theme.colors.textMuted}>
          {activeTab === 'whatsNew' && maxScroll > 0
            ? `j/k: scroll | ${help.tabHint} | ${help.closeHint}`
            : `${help.tabHint} | ${help.closeHint}`}
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

interface WhatsNewContentProps {
  items: { type: 'version' | 'section' | 'item'; content: string; date?: string }[];
  scrollOffset: number;
  visibleLines: number;
  maxScroll: number;
}

function WhatsNewContent({ items, scrollOffset, visibleLines, maxScroll }: WhatsNewContentProps): React.ReactElement {
  const i18n = t();
  const whatsNew = i18n.tui.whatsNew;
  const theme = useTheme();

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

  if (items.length === 0) {
    return (
      <Box justifyContent="center" paddingY={2}>
        <Text color={theme.colors.textMuted}>{whatsNew.noChanges}</Text>
      </Box>
    );
  }

  const visibleItems = items.slice(scrollOffset, scrollOffset + visibleLines);
  const showScrollUp = scrollOffset > 0;
  const showScrollDown = scrollOffset < maxScroll;

  return (
    <Box flexDirection="column">
      {showScrollUp && (
        <Text color={theme.colors.textMuted}>  ▲ scroll up</Text>
      )}
      {visibleItems.map((item, index) => {
        if (item.type === 'version') {
          return (
            <Text key={`${item.content}-${index}`} bold color={theme.colors.accent}>
              v{item.content} {item.date && <Text color={theme.colors.textMuted}>({item.date})</Text>}
            </Text>
          );
        }
        if (item.type === 'section') {
          return (
            <Text key={`${item.content}-${index}`} color={theme.colors.secondary}>
              {'  '}{formatTitle(getSectionLabel(item.content))}:
            </Text>
          );
        }
        return (
          <Text key={`${item.content}-${index}`} color={theme.colors.text}>
            {'    '}• {item.content}
          </Text>
        );
      })}
      {showScrollDown && (
        <Text color={theme.colors.textMuted}>  ▼ scroll down</Text>
      )}
    </Box>
  );
}
