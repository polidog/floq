import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { t } from '../../i18n/index.js';
import { useTheme } from '../theme/index.js';
import type { BorderStyleType } from '../theme/types.js';
import { isCalendarEnabled, getCalendarSources } from '../../config.js';
import {
  getCalendarEvents,
  getEventsForDate,
  formatEventTime,
  isEventOngoing,
  type CalendarEvent,
} from '../../calendar/index.js';

interface CalendarModalProps {
  onClose: () => void;
}

const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];

const VISIBLE_EVENTS = 5;

type Mode = 'calendar' | 'events';

export function CalendarModal({ onClose }: CalendarModalProps): React.ReactElement {
  const theme = useTheme();
  const i18n = t();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMonth, setViewMonth] = useState(new Date());
  const [mode, setMode] = useState<Mode>('calendar');

  const calendarEnabled = isCalendarEnabled();
  const calendarSources = getCalendarSources().filter(s => s.enabled !== false);

  const isJapanese = i18n.tui.calendar?.yesterday === '昨日';
  const weekdays = isJapanese ? WEEKDAYS_JA : WEEKDAYS_EN;

  // Load all events on mount
  useEffect(() => {
    if (!calendarEnabled) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const loadEvents = async () => {
      try {
        const loadedEvents = await getCalendarEvents();
        if (mounted) {
          setAllEvents(loadedEvents);
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

  // Update events when selected date changes
  useEffect(() => {
    if (!isLoading) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(selectedDate);
      selected.setHours(0, 0, 0, 0);
      const dayOffset = Math.round((selected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      setEvents(getEventsForDate(dayOffset));
      setScrollOffset(0);
    }
  }, [selectedDate, isLoading, allEvents]);

  // Generate calendar grid for the view month
  const calendarGrid = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const grid: (number | null)[][] = [];
    let currentDay = 1;

    for (let week = 0; week < 6; week++) {
      const row: (number | null)[] = [];
      for (let day = 0; day < 7; day++) {
        if (week === 0 && day < startDayOfWeek) {
          row.push(null);
        } else if (currentDay > daysInMonth) {
          row.push(null);
        } else {
          row.push(currentDay);
          currentDay++;
        }
      }
      grid.push(row);
      if (currentDay > daysInMonth) break;
    }

    return grid;
  }, [viewMonth]);

  // Check if a date has events
  const hasEventsOnDay = (day: number): boolean => {
    const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    const nextDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day + 1);
    return allEvents.some(event =>
      (event.start >= date && event.start < nextDate) ||
      (event.start < date && event.end >= date)
    );
  };

  // Check if a date is today
  const isToday = (day: number): boolean => {
    const today = new Date();
    return day === today.getDate() &&
           viewMonth.getMonth() === today.getMonth() &&
           viewMonth.getFullYear() === today.getFullYear();
  };

  // Check if a date is selected
  const isSelected = (day: number): boolean => {
    return day === selectedDate.getDate() &&
           viewMonth.getMonth() === selectedDate.getMonth() &&
           viewMonth.getFullYear() === selectedDate.getFullYear();
  };

  const maxScroll = Math.max(0, events.length - VISIBLE_EVENTS);

  useInput((input, key) => {
    // Events mode: scroll through events
    if (mode === 'events') {
      if (input === 'j' || key.downArrow) {
        setScrollOffset(prev => Math.min(prev + 1, maxScroll));
        return;
      }
      if (input === 'k' || key.upArrow) {
        setScrollOffset(prev => Math.max(prev - 1, 0));
        return;
      }
      if (key.escape || input === 'q') {
        setMode('calendar');
        return;
      }
      return;
    }

    // Calendar mode: navigate dates
    if (input === 'h' || key.leftArrow) {
      setSelectedDate(prev => {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() - 1);
        if (newDate.getMonth() !== viewMonth.getMonth()) {
          setViewMonth(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
        }
        return newDate;
      });
      return;
    }
    if (input === 'l' || key.rightArrow) {
      setSelectedDate(prev => {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() + 1);
        if (newDate.getMonth() !== viewMonth.getMonth()) {
          setViewMonth(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
        }
        return newDate;
      });
      return;
    }
    if (input === 'k' || key.upArrow) {
      setSelectedDate(prev => {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() - 7);
        if (newDate.getMonth() !== viewMonth.getMonth()) {
          setViewMonth(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
        }
        return newDate;
      });
      return;
    }
    if (input === 'j' || key.downArrow) {
      setSelectedDate(prev => {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() + 7);
        if (newDate.getMonth() !== viewMonth.getMonth()) {
          setViewMonth(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
        }
        return newDate;
      });
      return;
    }
    // Enter events mode
    if (key.return && events.length > 0) {
      setMode('events');
      return;
    }
    // Previous/Next month
    if (input === 'H') {
      setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
      setSelectedDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(newDate.getMonth() - 1);
        return newDate;
      });
      return;
    }
    if (input === 'L') {
      setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
      setSelectedDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(newDate.getMonth() + 1);
        return newDate;
      });
      return;
    }
    // Go to today
    if (input === 't') {
      const today = new Date();
      setSelectedDate(today);
      setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
      return;
    }
    if (key.escape || input === 'q' || input === ' ') {
      onClose();
      return;
    }
  });

  const formatTitle = (title: string) =>
    theme.style.headerUppercase ? title.toUpperCase() : title;

  // Get calendar name for header (single calendar shows its name, multiple show a count)
  const calendarName = calendarSources.length === 1
    ? calendarSources[0].name
    : calendarSources.length > 1
      ? `Calendar (${calendarSources.length})`
      : 'Calendar';

  // Format month header
  const monthNames = isJapanese
    ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const monthHeader = isJapanese
    ? `${viewMonth.getFullYear()}年 ${monthNames[viewMonth.getMonth()]}`
    : `${monthNames[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;

  // Format selected date
  const formatSelectedDate = (): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    const diff = Math.round((selected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diff === -1) return i18n.tui.calendar?.yesterday || 'Yesterday';
    if (diff === 0) return i18n.tui.calendar?.today || 'Today';
    if (diff === 1) return i18n.tui.calendar?.tomorrow || 'Tomorrow';

    if (isJapanese) {
      return `${selectedDate.getMonth() + 1}/${selectedDate.getDate()} (${weekdays[selectedDate.getDay()]})`;
    }
    return `${monthNames[selectedDate.getMonth()].slice(0, 3)} ${selectedDate.getDate()}`;
  };

  const visibleEvents = events.slice(scrollOffset, scrollOffset + VISIBLE_EVENTS);
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
          {formatTitle(calendarName)}
        </Text>
      </Box>

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
      ) : (
        <Box flexDirection="column">
          {/* Calendar Grid */}
          <Box flexDirection="column" alignItems="center">
            {/* Month navigation */}
            <Box marginBottom={1}>
              <Text color={theme.colors.text}>{'◀ '}</Text>
              <Text bold color={theme.colors.text}>{monthHeader}</Text>
              <Text color={theme.colors.text}>{' ▶'}</Text>
            </Box>

            {/* Weekday headers */}
            <Box>
              {weekdays.map((day, i) => (
                <Box key={day} width={4} justifyContent="center">
                  <Text color={i === 0 ? theme.colors.accent : (i === 6 ? theme.colors.secondary : theme.colors.textMuted)}>
                    {day}
                  </Text>
                </Box>
              ))}
            </Box>

            {/* Calendar days */}
            {calendarGrid.map((week, weekIndex) => (
              <Box key={weekIndex}>
                {week.map((day, dayIndex) => {
                  if (day === null) {
                    return <Box key={dayIndex} width={4}><Text> </Text></Box>;
                  }

                  const selected = isSelected(day);
                  const today = isToday(day);
                  const hasEvents = hasEventsOnDay(day);
                  const isSunday = dayIndex === 0;
                  const isSaturday = dayIndex === 6;

                  let color = theme.colors.text;
                  if (isSunday) color = theme.colors.accent;
                  else if (isSaturday) color = theme.colors.secondary;

                  const dayStr = day.toString().padStart(2, ' ');

                  return (
                    <Box key={dayIndex} width={4} justifyContent="center">
                      {selected ? (
                        <Text backgroundColor={theme.colors.accent} color={theme.colors.background}>
                          {hasEvents ? `${dayStr}*` : `${dayStr} `}
                        </Text>
                      ) : today ? (
                        <Text bold underline color={color}>
                          {hasEvents ? `${dayStr}*` : `${dayStr} `}
                        </Text>
                      ) : (
                        <Text color={color}>
                          {hasEvents ? `${dayStr}*` : `${dayStr} `}
                        </Text>
                      )}
                    </Box>
                  );
                })}
              </Box>
            ))}
          </Box>

          {/* Separator */}
          <Box marginY={1} justifyContent="center">
            <Text color={theme.colors.border}>{'─'.repeat(28)}</Text>
          </Box>

          {/* Events List */}
          <Box flexDirection="column" alignItems="center">
            <Box marginBottom={1}>
              <Text bold color={mode === 'events' ? theme.colors.accent : theme.colors.secondary}>
                {formatSelectedDate()}{mode === 'events' ? ' *' : ''}
              </Text>
            </Box>

            <Box flexDirection="column" width={28}>
              {showScrollUp && (
                <Text color={theme.colors.textMuted}>  ▲ (k)</Text>
              )}

              {events.length === 0 ? (
                <Box justifyContent="center">
                  <Text color={theme.colors.textMuted}>
                    {i18n.tui.calendar?.noEventsForDay || 'No events'}
                  </Text>
                </Box>
              ) : (
                visibleEvents.map((event, index) => {
                  const isOngoing = isEventOngoing(event);
                  const timeStr = event.allDay
                    ? (i18n.tui.calendar?.allDay || 'All day')
                    : formatEventTime(event.start);

                  const maxTitleLen = 18;
                  const title = event.title.length > maxTitleLen
                    ? event.title.slice(0, maxTitleLen - 1) + '…'
                    : event.title;

                  return (
                    <Box key={event.id || index}>
                      <Text color={isOngoing ? theme.colors.accent : theme.colors.secondary}>
                        {timeStr.padEnd(8)}
                      </Text>
                      <Text color={theme.colors.text}>{title}</Text>
                    </Box>
                  );
                })
              )}

              {showScrollDown && (
                <Text color={theme.colors.textMuted}>  ▼ (j)</Text>
              )}

              {events.length > VISIBLE_EVENTS && (
                <Box justifyContent="center">
                  <Text color={theme.colors.textMuted}>
                    +{events.length - VISIBLE_EVENTS} more
                  </Text>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      )}

      {/* Footer */}
      <Box justifyContent="center" marginTop={1}>
        <Text color={theme.colors.textMuted}>
          {mode === 'events'
            ? 'j/k: scroll | q/Esc: back'
            : `hjkl: move | H/L: month | t: today${events.length > 0 ? ' | Enter: events' : ''} | q: close`
          }
        </Text>
      </Box>
    </Box>
  );
}
