import ICAL from 'ical.js';
import { getCalendarConfig, isCalendarEnabled, getCalendarType, getCalendarOAuthConfig } from '../config.js';
import { getValidAccessToken } from './oauth.js';
import { listEvents as listGoogleEvents } from './google-api.js';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location?: string;
}

// In-memory cache with 5-minute TTL
interface CacheEntry {
  events: CalendarEvent[];
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let eventsCache: CacheEntry | null = null;

/**
 * Parse iCal data and extract events
 */
function parseICalData(icalData: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  try {
    const jcalData = ICAL.parse(icalData);
    const vcalendar = new ICAL.Component(jcalData);
    const vevents = vcalendar.getAllSubcomponents('vevent');

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent);

      // Handle recurring events - get occurrences for current month and next month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0); // Last day of next month

      if (event.isRecurring()) {
        try {
          const iter = event.iterator();
          let next = iter.next();
          let count = 0;
          const maxOccurrences = 100; // Safety limit

          while (next && count < maxOccurrences) {
            const occurrenceStart = next.toJSDate();
            const occurrenceEnd = new Date(occurrenceStart.getTime() + event.duration.toSeconds() * 1000);

            // Only include occurrences within our time window
            if (occurrenceStart >= startOfMonth && occurrenceStart <= endOfNextMonth) {
              events.push({
                id: `${event.uid}-${occurrenceStart.getTime()}`,
                title: event.summary || 'Untitled',
                start: occurrenceStart,
                end: occurrenceEnd,
                allDay: event.startDate.isDate,
                location: event.location || undefined,
              });
            }

            // Stop if we're past our window
            if (occurrenceStart > endOfNextMonth) break;

            next = iter.next();
            count++;
          }
        } catch {
          // If recurring expansion fails, fall back to single event
          const startDate = event.startDate.toJSDate();
          const endDate = event.endDate?.toJSDate() || startDate;

          events.push({
            id: event.uid,
            title: event.summary || 'Untitled',
            start: startDate,
            end: endDate,
            allDay: event.startDate.isDate,
            location: event.location || undefined,
          });
        }
      } else {
        // Non-recurring event
        const startDate = event.startDate.toJSDate();
        const endDate = event.endDate?.toJSDate() || startDate;

        events.push({
          id: event.uid,
          title: event.summary || 'Untitled',
          start: startDate,
          end: endDate,
          allDay: event.startDate.isDate,
          location: event.location || undefined,
        });
      }
    }
  } catch (error) {
    // Silently fail on parse errors
    console.error('Failed to parse iCal data:', error);
  }

  return events;
}

/**
 * Normalize iCal URL (convert webcal:// to https://)
 */
function normalizeUrl(url: string): string {
  if (url.startsWith('webcal://')) {
    return url.replace('webcal://', 'https://');
  }
  return url;
}

/**
 * Fetch calendar events via OAuth (Google Calendar API)
 */
async function fetchEventsViaOAuth(): Promise<CalendarEvent[]> {
  const oauthConfig = getCalendarOAuthConfig();
  if (!oauthConfig) {
    return [];
  }

  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return [];
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0); // Last day of next month

  try {
    return await listGoogleEvents(accessToken, oauthConfig.calendarId, startOfMonth, endOfNextMonth);
  } catch (error) {
    console.error('Failed to fetch Google Calendar events:', error);
    return [];
  }
}

/**
 * Fetch calendar events via iCal URL
 */
async function fetchEventsViaIcal(url: string): Promise<CalendarEvent[]> {
  const normalizedUrl = normalizeUrl(url);

  const response = await fetch(normalizedUrl, {
    headers: {
      'User-Agent': 'Floq GTD CLI',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const icalData = await response.text();
  return parseICalData(icalData);
}

/**
 * Fetch calendar events from the configured source (iCal URL or OAuth)
 */
export async function fetchCalendarEvents(url?: string): Promise<CalendarEvent[]> {
  try {
    let events: CalendarEvent[];
    const calendarType = getCalendarType();

    if (url) {
      // Explicit URL provided, use iCal mode
      events = await fetchEventsViaIcal(url);
    } else if (calendarType === 'oauth') {
      // OAuth mode
      events = await fetchEventsViaOAuth();
    } else {
      // iCal mode
      const targetUrl = getCalendarConfig()?.url;
      if (!targetUrl) {
        return [];
      }
      events = await fetchEventsViaIcal(targetUrl);
    }

    // Update cache
    eventsCache = {
      events,
      timestamp: Date.now(),
    };

    return events;
  } catch (error) {
    // Silently fail on errors
    console.error('Failed to fetch calendar:', error);
    return eventsCache?.events || [];
  }
}

/**
 * Get cached events or fetch if cache is stale
 */
export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  if (!isCalendarEnabled()) {
    return [];
  }

  // Check if cache is valid
  if (eventsCache && Date.now() - eventsCache.timestamp < CACHE_TTL_MS) {
    return eventsCache.events;
  }

  // Fetch fresh data
  return fetchCalendarEvents();
}

/**
 * Get events for a specific date from cache (synchronous)
 * @param dayOffset - Number of days from today (0 = today, -1 = yesterday, 1 = tomorrow)
 */
export function getEventsForDate(dayOffset: number = 0): CalendarEvent[] {
  if (!eventsCache) {
    return [];
  }

  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  targetDate.setDate(targetDate.getDate() + dayOffset);
  const endOfTarget = new Date(targetDate);
  endOfTarget.setDate(endOfTarget.getDate() + 1);

  return eventsCache.events
    .filter(event => {
      // Event starts on target date or spans target date
      return (event.start >= targetDate && event.start < endOfTarget) ||
             (event.start < targetDate && event.end >= targetDate);
    })
    .sort((a, b) => {
      // All-day events first, then by start time
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return a.start.getTime() - b.start.getTime();
    });
}

/**
 * Get today's events from cache (synchronous)
 */
export function getTodayEvents(): CalendarEvent[] {
  return getEventsForDate(0);
}

/**
 * Get upcoming events (next event for each hour slot)
 */
export function getUpcomingEvents(limit: number = 5): CalendarEvent[] {
  if (!eventsCache) {
    return [];
  }

  const now = new Date();

  return eventsCache.events
    .filter(event => {
      // Future events or ongoing events
      return event.end > now;
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, limit);
}

/**
 * Clear the events cache
 */
export function clearCalendarCache(): void {
  eventsCache = null;
}

/**
 * Format time for display (HH:MM format)
 */
export function formatEventTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Check if an event is currently happening
 */
export function isEventOngoing(event: CalendarEvent): boolean {
  const now = new Date();
  return event.start <= now && event.end > now;
}

/**
 * Get time until event starts (in minutes)
 */
export function getMinutesUntilEvent(event: CalendarEvent): number {
  const now = new Date();
  return Math.floor((event.start.getTime() - now.getTime()) / (1000 * 60));
}
