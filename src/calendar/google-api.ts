import type { CalendarEvent } from './index.js';

const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

export interface GoogleCalendar {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
  foregroundColor?: string;
}

interface GoogleCalendarListResponse {
  items: Array<{
    id: string;
    summary: string;
    primary?: boolean;
    backgroundColor?: string;
    foregroundColor?: string;
  }>;
}

interface GoogleEventDateTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

interface GoogleEvent {
  id: string;
  summary?: string;
  start: GoogleEventDateTime;
  end: GoogleEventDateTime;
  location?: string;
  status?: string;
}

interface GoogleEventsListResponse {
  items: GoogleEvent[];
  nextPageToken?: string;
}

/**
 * List all calendars the user has access to
 */
export async function listCalendars(accessToken: string): Promise<GoogleCalendar[]> {
  const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list calendars: ${error}`);
  }

  const data = await response.json() as GoogleCalendarListResponse;

  return data.items.map(item => ({
    id: item.id,
    summary: item.summary,
    primary: item.primary,
    backgroundColor: item.backgroundColor,
    foregroundColor: item.foregroundColor,
  }));
}

/**
 * List events from a specific calendar
 */
export async function listEvents(
  accessToken: string,
  calendarId: string,
  timeMin: Date,
  timeMax: Date
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true', // Expand recurring events
    orderBy: 'startTime',
    maxResults: '100',
  });

  const encodedCalendarId = encodeURIComponent(calendarId);
  const response = await fetch(
    `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodedCalendarId}/events?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list events: ${error}`);
  }

  const data = await response.json() as GoogleEventsListResponse;

  return data.items
    .filter(item => item.status !== 'cancelled')
    .map(item => {
      const isAllDay = !item.start.dateTime;
      const start = isAllDay
        ? new Date(item.start.date + 'T00:00:00')
        : new Date(item.start.dateTime!);
      const end = isAllDay
        ? new Date(item.end.date + 'T00:00:00')
        : new Date(item.end.dateTime!);

      return {
        id: item.id,
        title: item.summary || 'Untitled',
        start,
        end,
        allDay: isAllDay,
        location: item.location,
      };
    });
}
