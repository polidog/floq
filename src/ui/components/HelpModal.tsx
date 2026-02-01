import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { t } from '../../i18n/index.js';
import { useTheme } from '../theme/index.js';
import type { BorderStyleType } from '../theme/types.js';
import { parseChangelog } from '../../changelog.js';
import { loadConfig, isTursoEnabled, getTursoConfig, getDbPath } from '../../config.js';
import { CONFIG_FILE, DATA_DIR } from '../../paths.js';

interface HelpModalProps {
  onClose: () => void;
  isKanban?: boolean;
}

type TabType = 'keybindings' | 'info' | 'whatsNew';
type LineType = 'header' | 'key' | 'text' | 'version' | 'section' | 'item';

interface ContentLine {
  type: LineType;
  key?: string;
  value: string;
  date?: string;
}

const VISIBLE_LINES = 14;

export function HelpModal({ onClose, isKanban = false }: HelpModalProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<TabType>('keybindings');
  const [scrollOffset, setScrollOffset] = useState(0);
  const i18n = t();
  const theme = useTheme();
  const help = i18n.tui.help;

  const formatTitle = (title: string) =>
    theme.style.headerUppercase ? title.toUpperCase() : title;

  // Build keybindings content
  const keybindingsContent = useMemo((): ContentLine[] => {
    if (isKanban) {
      const kHelp = i18n.tui.kanbanHelp;
      return [
        { type: 'header', value: kHelp.navigation },
        { type: 'key', key: 'h/l ←/→', value: kHelp.columnSwitch },
        { type: 'key', key: '1-3', value: kHelp.columnDirect },
        { type: 'key', key: 'j/k ↑/↓', value: kHelp.taskSelect },
        { type: 'header', value: kHelp.actions },
        { type: 'key', key: 'a', value: kHelp.addTask },
        { type: 'key', key: 'd', value: kHelp.completeTask },
        { type: 'key', key: 'm', value: kHelp.moveRight },
        { type: 'key', key: 'BS', value: kHelp.moveLeft },
        { type: 'key', key: 'u', value: 'Undo' },
        { type: 'key', key: 'Ctrl+r', value: 'Redo' },
        { type: 'header', value: kHelp.settings },
        { type: 'key', key: 'T', value: kHelp.changeTheme },
        { type: 'key', key: 'V', value: kHelp.changeViewMode },
        { type: 'key', key: 'L', value: kHelp.changeLanguage },
        { type: 'header', value: kHelp.other },
        { type: 'key', key: '/', value: kHelp.searchTasks },
        { type: 'key', key: '?', value: kHelp.showHelp },
        { type: 'key', key: 'q', value: kHelp.quit },
      ];
    }

    return [
      { type: 'header', value: help.navigation },
      { type: 'key', key: '1-6', value: help.tabSwitch },
      { type: 'key', key: 'h/l ←/→', value: help.prevNextTab },
      { type: 'key', key: 'j/k ↑/↓', value: help.taskSelect },
      { type: 'header', value: help.actions },
      { type: 'key', key: 'a', value: help.addTask },
      { type: 'key', key: 'd', value: help.completeTask },
      { type: 'key', key: 'n', value: help.moveToNext },
      { type: 'key', key: 's', value: help.moveToSomeday },
      { type: 'key', key: 'w', value: help.moveToWaiting },
      { type: 'key', key: 'i', value: help.moveToInbox },
      { type: 'key', key: 'r', value: help.refresh },
      { type: 'key', key: 'u', value: help.undo },
      { type: 'key', key: 'Ctrl+r', value: help.redo },
      { type: 'header', value: help.projects },
      { type: 'key', key: 'p', value: help.makeProject },
      { type: 'key', key: 'P', value: help.linkToProject },
      { type: 'key', key: 'Enter', value: help.openProject },
      { type: 'key', key: 'Esc/b', value: help.backFromProject },
      { type: 'header', value: help.settings },
      { type: 'key', key: 'T', value: help.changeTheme },
      { type: 'key', key: 'V', value: help.changeViewMode },
      { type: 'key', key: 'L', value: help.changeLanguage },
      { type: 'header', value: help.pomodoro },
      { type: 'key', key: 'F', value: help.startPomodoro },
      { type: 'key', key: 'Space', value: help.pauseResume },
      { type: 'key', key: 'S', value: help.skipPhase },
      { type: 'key', key: 'X', value: help.stopPomodoro },
      { type: 'header', value: help.other },
      { type: 'key', key: '/', value: help.searchTasks },
      { type: 'key', key: '?', value: help.showHelp },
      { type: 'key', key: 'q', value: help.quit },
    ];
  }, [isKanban, help, i18n.tui.kanbanHelp]);

  // Build info content
  const infoContent = useMemo((): ContentLine[] => {
    const info = i18n.tui.info;
    const config = loadConfig();
    const tursoEnabled = isTursoEnabled();
    const tursoConfig = tursoEnabled ? getTursoConfig() : undefined;
    const dbPath = getDbPath();

    const tursoUrl = tursoConfig ? (() => {
      try {
        return new URL(tursoConfig.url).host;
      } catch {
        return tursoConfig.url;
      }
    })() : '';

    const lines: ContentLine[] = [
      { type: 'header', value: info.settings },
      { type: 'key', key: info.theme, value: config.theme },
      { type: 'key', key: info.language, value: config.locale },
      { type: 'key', key: info.viewMode, value: config.viewMode },
      { type: 'header', value: info.database },
      { type: 'key', key: info.dbType, value: tursoEnabled ? info.turso : info.local },
      { type: 'key', key: info.dbPath, value: dbPath },
    ];

    if (tursoEnabled && tursoUrl) {
      lines.push({ type: 'key', key: info.tursoUrl, value: tursoUrl });
    }

    lines.push(
      { type: 'header', value: info.paths },
      { type: 'key', key: info.configFile, value: CONFIG_FILE },
      { type: 'key', key: info.dataDir, value: DATA_DIR }
    );

    return lines;
  }, [i18n.tui.info]);

  // Build changelog content
  const changelogContent = useMemo((): ContentLine[] => {
    const changelog = parseChangelog();
    const whatsNew = i18n.tui.whatsNew;
    const items: ContentLine[] = [];

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

    for (const entry of changelog.entries.slice(0, 5)) {
      items.push({ type: 'version', value: entry.version, date: entry.date });
      for (const section of entry.sections) {
        items.push({ type: 'section', value: getSectionLabel(section.type) });
        for (const item of section.items) {
          items.push({ type: 'item', value: item });
        }
      }
    }
    return items;
  }, [i18n.tui.whatsNew]);

  // Get current content and max scroll
  const currentContent = activeTab === 'keybindings' ? keybindingsContent
    : activeTab === 'info' ? infoContent
    : changelogContent;
  const maxScroll = Math.max(0, currentContent.length - VISIBLE_LINES);

  const tabs: TabType[] = ['keybindings', 'info', 'whatsNew'];

  useInput((input, key) => {
    // Tab key detection
    if (key.tab || input === '\t') {
      setActiveTab(prev => {
        const currentIndex = tabs.indexOf(prev);
        return tabs[(currentIndex + 1) % tabs.length];
      });
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
      setActiveTab('info');
      setScrollOffset(0);
      return;
    }
    if (input === '3') {
      setActiveTab('whatsNew');
      setScrollOffset(0);
      return;
    }
    // Scroll with j/k or arrows
    if (input === 'j' || key.downArrow) {
      setScrollOffset(prev => Math.min(prev + 1, maxScroll));
      return;
    }
    if (input === 'k' || key.upArrow) {
      setScrollOffset(prev => Math.max(prev - 1, 0));
      return;
    }
    // Close modal
    if (key.escape || key.return || input === 'q' || input === ' ') {
      onClose();
      return;
    }
  });

  const visibleContent = currentContent.slice(scrollOffset, scrollOffset + VISIBLE_LINES);
  const showScrollUp = scrollOffset > 0;
  const showScrollDown = scrollOffset < maxScroll;

  const renderLine = (line: ContentLine, index: number) => {
    switch (line.type) {
      case 'header':
        return (
          <Text key={index} bold color={theme.colors.accent}>
            {formatTitle(line.value)}
          </Text>
        );
      case 'key':
        return (
          <Text key={index} color={theme.colors.text}>
            {'  '}<Text color={theme.colors.textHighlight}>{(line.key || '').padEnd(10)}</Text> {line.value}
          </Text>
        );
      case 'version':
        return (
          <Text key={index} bold color={theme.colors.accent}>
            v{line.value} {line.date && <Text color={theme.colors.textMuted}>({line.date})</Text>}
          </Text>
        );
      case 'section':
        return (
          <Text key={index} color={theme.colors.secondary}>
            {'  '}{formatTitle(line.value)}:
          </Text>
        );
      case 'item':
        return (
          <Text key={index} color={theme.colors.text}>
            {'    '}• {line.value}
          </Text>
        );
      default:
        return (
          <Text key={index} color={theme.colors.text}>
            {line.value}
          </Text>
        );
    }
  };

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
            bold={activeTab === 'info'}
            color={activeTab === 'info' ? theme.colors.secondary : theme.colors.textMuted}
            inverse={activeTab === 'info'}
          >
            {' '}{formatTitle(help.infoTab)}{' '}
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

      {/* Content with scroll */}
      <Box flexDirection="column" height={VISIBLE_LINES + 2}>
        {showScrollUp && (
          <Text color={theme.colors.textMuted}>  ▲ scroll up (k)</Text>
        )}
        {!showScrollUp && <Text> </Text>}

        {visibleContent.map((line, index) => renderLine(line, index))}

        {showScrollDown && (
          <Text color={theme.colors.textMuted}>  ▼ scroll down (j)</Text>
        )}
        {!showScrollDown && <Text> </Text>}
      </Box>

      {/* Footer */}
      <Box justifyContent="center" marginTop={1}>
        <Text color={theme.colors.textMuted}>
          {maxScroll > 0 ? `j/k: scroll | ` : ''}{help.tabHint} | {help.closeHint}
        </Text>
      </Box>
    </Box>
  );
}
