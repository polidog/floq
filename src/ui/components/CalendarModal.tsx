import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { t } from '../../i18n/index.js';
import { useTheme } from '../theme/index.js';
import type { BorderStyleType } from '../theme/types.js';
import { isCalendarEnabled, getCalendarConfig, getCalendarType } from '../../config.js';
import {
  getCalendarEvents,
  getTodayEvents,
  formatEventTime,
  isEventOngoing,
  type CalendarEvent,
} from '../../calendar/index.js';

interface CalendarModalProps {
  onClose: () => void;
}

const VISIBLE_LINES = 12;

export function CalendarModal({ onClose }: CalendarModalProps): React.ReactElement {
  const theme = useTheme();
  const i18n = t();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scrollOffset, setScrollOffset] = useState(0);

  const calendarEnabled = isCalendarEnabled();
  const config = getCalendarConfig();
  const calendarType = getCalendarType();

  useEffect(() => {
    if (!calendarEnabled) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const loadEvents = async () => {
      try {
        await getCalendarEvents();
        if (mounted) {
          setEvents(getTodayEvents());
          setIsLoading(false);
        }
      } catch {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadEvents();

    return () => {
      mounted = false;
    };
  }, [calendarEnabled]);

  const maxScroll = Math.max(0, events.length - VISIBLE_LINES);

  useInput((input, key) => {
    if (input === 'j' || key.downArrow) {
      setScrollOffset(prev => Math.min(prev + 1, maxScroll));
      return;
    }
    if (input === 'k' || key.upArrow) {
      setScrollOffset(prev => Math.max(prev - 1, 0));
      return;
    }
    if (key.escape || key.return || input === 'q' || input === ' ') {
      onClose();
      return;
    }
  });

  const formatTitle = (title: string) =>
    theme.style.headerUppercase ? title.toUpperCase() : title;

  // Get calendar name for header
  const calendarName = calendarType === 'oauth' && config?.oauth
    ? config.oauth.calendarName
    : config?.name || 'Calendar';

  const visibleEvents = events.slice(scrollOffset, scrollOffset + VISIBLE_LINES);
  const showScrollUp = scrollOffset > 0;
  const showScrollDown = scrollOffset < maxScroll;

  return (
    <Box
      flexDirection="column"
      borderStyle={theme.borders.modal as BorderStyleType}
      borderColor={theme.colors.borderActive}
      paddingX={2}
      paddingY={1}
    >
      {/* Header */}
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color={theme.colors.secondary}>
          {formatTitle(i18n.tui.calendar?.modalTitle || "Today's Events")} - {calendarName}
        </Text>
      </Box>

      {/* Content */}
      <Box flexDirection="column" height={VISIBLE_LINES + 2}>
        {showScrollUp && (
          <Text color={theme.colors.textMuted}>  ▲ scroll up (k)</Text>
        )}
        {!showScrollUp && <Text> </Text>}

        {!calendarEnabled ? (
          <Box flexDirection="column">
            <Text color={theme.colors.textMuted}>
              {i18n.tui.calendar?.notConfigured || 'Calendar not configured.'}
            </Text>
            <Text color={theme.colors.textMuted}> </Text>
            <Text color={theme.colors.text}>
              {i18n.tui.calendar?.setupHint || 'Run "floq calendar --help" to set up.'}
            </Text>
          </Box>
        ) : isLoading ? (
          <Text color={theme.colors.textMuted}>Loading...</Text>
        ) : events.length === 0 ? (
          <Text color={theme.colors.textMuted}>
            {i18n.tui.calendar?.noEvents || 'No events today'}
          </Text>
        ) : (
          visibleEvents.map((event, index) => {
            const isOngoing = isEventOngoing(event);
            const timeStr = event.allDay
              ? (i18n.tui.calendar?.allDay || 'All day')
              : `${formatEventTime(event.start)} - ${formatEventTime(event.end)}`;

            return (
              <Box key={event.id || index}>
                <Text color={isOngoing ? theme.colors.accent : theme.colors.secondary}>
                  {timeStr.padEnd(15)}
                </Text>
                <Text color={theme.colors.text}>{event.title}</Text>
                {event.location && (
                  <Text color={theme.colors.textMuted}> ({event.location})</Text>
                )}
              </Box>
            );
          })
        )}

        {showScrollDown && (
          <Text color={theme.colors.textMuted}>  ▼ scroll down (j)</Text>
        )}
        {!showScrollDown && <Text> </Text>}
      </Box>

      {/* Footer */}
      <Box justifyContent="center" marginTop={1}>
        <Text color={theme.colors.textMuted}>
          {maxScroll > 0 ? 'j/k: scroll | ' : ''}Esc/q: {i18n.tui.help.closeHint?.replace('Esc/q: ', '') || 'close'}
        </Text>
      </Box>
    </Box>
  );
}
