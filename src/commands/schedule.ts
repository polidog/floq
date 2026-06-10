import { getCalendarSources, getLocale } from '../config.js';
import { fetchCalendarEvents, getEventsForDate, formatEventTime, isEventOngoing } from '../calendar/index.js';

const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];

interface ScheduleRange {
  start: Date; // Start of first day
  days: number;
}

function resolveRange(period?: string, daysOption?: string): ScheduleRange {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (daysOption) {
    const days = parseInt(daysOption, 10);
    if (isNaN(days) || days < 1) {
      console.error('Error: --days must be a positive integer');
      process.exit(1);
    }
    return { start: startOfToday, days };
  }

  switch (period) {
    case undefined:
    case 'today':
      return { start: startOfToday, days: 1 };
    case 'tomorrow': {
      const tomorrow = new Date(startOfToday);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return { start: tomorrow, days: 1 };
    }
    case 'week':
      return { start: startOfToday, days: 7 };
    default:
      console.error(`Error: Unknown period "${period}". Use: today, tomorrow, week`);
      process.exit(1);
  }
}

function formatDateHeader(date: Date, locale: string): string {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((date.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));

  const weekdays = locale === 'ja' ? WEEKDAYS_JA : WEEKDAYS_EN;
  const dateStr = locale === 'ja'
    ? `${date.getMonth() + 1}/${date.getDate()}(${weekdays[date.getDay()]})`
    : `${weekdays[date.getDay()]}, ${date.toLocaleString('en', { month: 'short' })} ${date.getDate()}`;

  if (diff === 0) return `${dateStr} ${locale === 'ja' ? '今日' : '(Today)'}`;
  if (diff === 1) return `${dateStr} ${locale === 'ja' ? '明日' : '(Tomorrow)'}`;
  return dateStr;
}

/**
 * Show schedule from all registered calendars
 */
export async function showSchedule(period?: string, options: { days?: string } = {}): Promise<void> {
  const sources = getCalendarSources();
  const locale = getLocale();

  if (sources.length === 0) {
    console.log(locale === 'ja' ? 'カレンダーが設定されていません。' : 'No calendar configured.');
    console.log('');
    console.log('  floq calendar add <url> [-n name]   (iCal URL)');
    console.log('  floq calendar login && floq calendar select   (Google OAuth)');
    return;
  }

  const range = resolveRange(period, options.days);
  await fetchCalendarEvents();
  const showCalendarName = sources.filter(s => s.enabled !== false).length > 1;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const baseOffset = Math.round((range.start.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));

  // Events are only fetched through the end of next month — warn if the range extends past it
  const fetchWindowEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);
  const rangeEnd = new Date(range.start);
  rangeEnd.setDate(rangeEnd.getDate() + range.days - 1);
  if (rangeEnd > fetchWindowEnd) {
    console.log(locale === 'ja'
      ? `注意: 来月末より先の予定は表示されません`
      : 'Note: events beyond the end of next month are not shown');
    console.log('');
  }

  let totalShown = 0;

  for (let i = 0; i < range.days; i++) {
    const dayStart = new Date(range.start);
    dayStart.setDate(dayStart.getDate() + i);

    const dayEvents = getEventsForDate(baseOffset + i);

    // For multi-day views, skip empty days
    if (dayEvents.length === 0 && range.days > 1) {
      continue;
    }

    if (totalShown > 0 || i > 0) {
      console.log('');
    }

    console.log(formatDateHeader(dayStart, locale));
    console.log('-'.repeat(40));

    if (dayEvents.length === 0) {
      console.log(locale === 'ja' ? '  予定はありません' : '  No events');
      continue;
    }

    for (const event of dayEvents) {
      const timeStr = event.allDay
        ? (locale === 'ja' ? '終日       ' : 'All day    ')
        : `${formatEventTime(event.start)}-${formatEventTime(event.end)}`;

      const ongoing = isEventOngoing(event) ? ' ◀' : '';
      const calLabel = showCalendarName && event.calendarName ? ` [${event.calendarName}]` : '';

      console.log(`  ${timeStr}  ${event.title}${calLabel}${ongoing}`);
      if (event.location) {
        console.log(`             📍 ${event.location}`);
      }
      totalShown++;
    }
  }

  if (range.days > 1 && totalShown === 0) {
    console.log(locale === 'ja' ? '期間内に予定はありません' : 'No events in this period');
  }
}
