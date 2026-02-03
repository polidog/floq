import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../theme/index.js';
import { t, fmt } from '../../i18n/index.js';
import { isCalendarEnabled } from '../../config.js';
import {
  getCalendarEvents,
  getTodayEvents,
  formatEventTime,
  isEventOngoing,
  type CalendarEvent,
} from '../../calendar/index.js';

interface CalendarEventsProps {
  maxEvents?: number;
  showLabel?: boolean;
  compact?: boolean;
  withSeparator?: boolean; // Add trailing separator when showing content
}

export function CalendarEvents({
  maxEvents = 3,
  showLabel = true,
  compact = true,
  withSeparator = false,
}: CalendarEventsProps): React.ReactElement | null {
  const theme = useTheme();
  const i18n = t();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const calendarEnabled = isCalendarEnabled();

  useEffect(() => {
    // Don't load if calendar is not enabled
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

    // Refresh every 5 minutes
    const interval = setInterval(() => {
      loadEvents();
    }, 5 * 60 * 1000);

    // Also refresh every minute to update "time until" display
    const minuteInterval = setInterval(() => {
      if (mounted) {
        setEvents(getTodayEvents());
      }
    }, 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
      clearInterval(minuteInterval);
    };
  }, [calendarEnabled]);

  // Return null if calendar is disabled or still loading
  if (!calendarEnabled || isLoading) {
    return null;
  }

  if (events.length === 0) {
    if (!showLabel) return null;
    return (
      <Box>
        <Text color={theme.colors.textMuted}>
          {i18n.tui.calendar?.noEvents || 'No events'}
        </Text>
        {withSeparator && <Text color={theme.colors.textMuted}> | </Text>}
      </Box>
    );
  }

  // Get the next upcoming event (not all-day, in the future or ongoing)
  const now = new Date();
  const upcomingEvents = events.filter(e => !e.allDay && e.end > now);
  const nextEvent = upcomingEvents[0];

  if (compact) {
    // Compact mode: show only the next event with start-end time
    // If no upcoming events, show a friendly message
    if (!nextEvent) {
      return (
        <Box>
          {showLabel && (
            <Text color={theme.colors.secondary}>
              {i18n.tui.calendar?.label || '[CAL]'}{' '}
            </Text>
          )}
          <Text color={theme.colors.textMuted}>
            {i18n.tui.calendar?.noUpcoming || 'No more events. Good work today!'}
          </Text>
          {withSeparator && <Text color={theme.colors.textMuted}> | </Text>}
        </Box>
      );
    }

    const isOngoing = isEventOngoing(nextEvent);
    const timeDisplay = `${formatEventTime(nextEvent.start)}-${formatEventTime(nextEvent.end)}`;

    // Truncate title if too long
    const maxTitleLen = 20;
    const title = nextEvent.title.length > maxTitleLen
      ? nextEvent.title.slice(0, maxTitleLen - 1) + '…'
      : nextEvent.title;

    return (
      <Box>
        {showLabel && (
          <Text color={theme.colors.secondary}>
            {i18n.tui.calendar?.label || '[CAL]'}{' '}
          </Text>
        )}
        <Text color={isOngoing ? theme.colors.accent : theme.colors.text}>
          {timeDisplay}
        </Text>
        <Text color={theme.colors.textMuted}> </Text>
        <Text color={theme.colors.text}>{title}</Text>
        {withSeparator && <Text color={theme.colors.textMuted}> | </Text>}
      </Box>
    );
  }

  // Full mode: show list of events
  const displayEvents = events.slice(0, maxEvents);
  const moreCount = Math.max(0, events.length - maxEvents);

  return (
    <Box flexDirection="column">
      {showLabel && (
        <Text color={theme.colors.secondary}>
          {i18n.tui.calendar?.label || '[CAL]'}
        </Text>
      )}
      {displayEvents.map((event, index) => {
        const isOngoing = isEventOngoing(event);
        const timeStr = event.allDay
          ? (i18n.tui.calendar?.allDay || 'All day')
          : `${formatEventTime(event.start)}-${formatEventTime(event.end)}`;

        return (
          <Box key={event.id || index}>
            <Text color={isOngoing ? theme.colors.accent : theme.colors.textMuted}>
              {timeStr}
            </Text>
            <Text color={theme.colors.textMuted}> </Text>
            <Text color={theme.colors.text}>{event.title}</Text>
          </Box>
        );
      })}
      {moreCount > 0 && (
        <Text color={theme.colors.textMuted}>
          {fmt(i18n.tui.calendar?.more || '+{count}', { count: moreCount })}
        </Text>
      )}
    </Box>
  );
}
