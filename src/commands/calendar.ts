import {
  getCalendarConfig,
  setCalendarConfig,
  isCalendarEnabled,
  setCalendarEnabled,
  getGoogleOAuthClient,
  setGoogleOAuthClient,
  setCalendarOAuthConfig,
  getCalendarOAuthConfig,
  getCalendarType,
} from '../config.js';
import { fetchCalendarEvents, getTodayEvents, clearCalendarCache, formatEventTime, type CalendarEvent } from '../calendar/index.js';
import { getLocale } from '../config.js';
import { startOAuthFlow, pollForTokens, clearOAuthTokens } from '../calendar/oauth.js';
import { listCalendars, type GoogleCalendar } from '../calendar/google-api.js';
import * as readline from 'readline';

/**
 * Add or update calendar URL (iCal mode)
 */
export async function addCalendar(url: string, options: { name?: string }): Promise<void> {
  // Validate URL
  if (!url.startsWith('https://') && !url.startsWith('webcal://') && !url.startsWith('http://')) {
    console.error('Error: Invalid URL. Must start with https://, webcal://, or http://');
    process.exit(1);
  }

  setCalendarConfig({
    url,
    name: options.name,
    type: 'ical',
    enabled: true,
  });

  console.log('Calendar added successfully!');
  console.log(`  URL: ${url}`);
  if (options.name) {
    console.log(`  Name: ${options.name}`);
  }

  // Try to fetch events to validate the URL
  console.log('\nFetching events...');
  try {
    const events = await fetchCalendarEvents(url);
    console.log(`Found ${events.length} events.`);
  } catch (error) {
    console.log('Warning: Could not fetch events. Please check the URL.');
  }
}

/**
 * Remove calendar configuration
 */
export async function removeCalendar(): Promise<void> {
  const config = getCalendarConfig();

  if (!config) {
    console.log('No calendar configured.');
    return;
  }

  setCalendarConfig(undefined);
  clearCalendarCache();
  console.log('Calendar removed.');
}

/**
 * Show calendar configuration and today's events
 */
export async function showCalendar(): Promise<void> {
  const config = getCalendarConfig();
  const locale = getLocale();
  const calendarType = getCalendarType();

  console.log('Calendar Configuration');
  console.log('-'.repeat(40));

  if (!config || (!config.url && !config.oauth)) {
    console.log('No calendar configured.');
    console.log('');
    console.log('Option 1: iCal URL (no authentication required)');
    console.log('  floq calendar add <url> [-n name]');
    console.log('');
    console.log('Option 2: Google OAuth (full API access)');
    console.log('  floq calendar config --client-id <id> --client-secret <secret>');
    console.log('  floq calendar login');
    console.log('  floq calendar select');
    return;
  }

  console.log(`Type: ${calendarType || 'unknown'}`);

  if (calendarType === 'oauth' && config.oauth) {
    console.log(`Calendar: ${config.oauth.calendarName}`);
    console.log(`Calendar ID: ${config.oauth.calendarId}`);
  } else if (config.url) {
    console.log(`URL: ${config.url}`);
    if (config.name) {
      console.log(`Name: ${config.name}`);
    }
  }

  console.log(`Status: ${config.enabled !== false ? 'enabled' : 'disabled'}`);

  console.log('');
  console.log("Today's Events");
  console.log('-'.repeat(40));

  // Fetch events if cache is empty
  await fetchCalendarEvents();

  const todayEvents = getTodayEvents();

  if (todayEvents.length === 0) {
    console.log(locale === 'ja' ? '今日の予定はありません' : 'No events today');
    return;
  }

  for (const event of todayEvents) {
    const timeStr = event.allDay
      ? (locale === 'ja' ? '終日' : 'All day')
      : `${formatEventTime(event.start)} - ${formatEventTime(event.end)}`;

    console.log(`  ${timeStr}  ${event.title}`);
    if (event.location) {
      console.log(`    📍 ${event.location}`);
    }
  }
}

/**
 * Sync/refresh calendar cache
 */
export async function syncCalendar(): Promise<void> {
  const config = getCalendarConfig();

  if (!config) {
    console.log('No calendar configured.');
    return;
  }

  console.log('Syncing calendar...');
  clearCalendarCache();

  try {
    const events = await fetchCalendarEvents();
    console.log(`Synced ${events.length} events.`);

    const todayEvents = getTodayEvents();
    console.log(`${todayEvents.length} events today.`);
  } catch (error) {
    console.error('Failed to sync calendar:', error);
    process.exit(1);
  }
}

/**
 * Enable calendar display
 */
export async function enableCalendar(): Promise<void> {
  const config = getCalendarConfig();

  if (!config) {
    console.log('No calendar configured.');
    console.log('Use "floq calendar add <url>" to add a calendar first.');
    return;
  }

  setCalendarEnabled(true);
  console.log('Calendar display enabled.');
}

/**
 * Disable calendar display
 */
export async function disableCalendar(): Promise<void> {
  const config = getCalendarConfig();

  if (!config) {
    console.log('No calendar configured.');
    return;
  }

  setCalendarEnabled(false);
  console.log('Calendar display disabled.');
}

/**
 * Configure OAuth client credentials
 */
export async function configOAuthClient(clientId: string, clientSecret: string): Promise<void> {
  setGoogleOAuthClient({ clientId, clientSecret });
  console.log('OAuth client configured successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Run "floq calendar login" to authenticate');
  console.log('  2. Run "floq calendar select" to choose a calendar');
}

/**
 * Start OAuth login flow
 */
export async function loginCalendar(): Promise<void> {
  const client = getGoogleOAuthClient();

  if (!client) {
    console.log('OAuth client not configured.');
    console.log('');
    console.log('First, set up your OAuth client:');
    console.log('  floq calendar config --client-id <id> --client-secret <secret>');
    console.log('');
    console.log('Or use environment variables:');
    console.log('  export GOOGLE_CLIENT_ID="your-client-id"');
    console.log('  export GOOGLE_CLIENT_SECRET="your-client-secret"');
    console.log('');
    console.log('To get OAuth credentials:');
    console.log('  1. Go to Google Cloud Console (console.cloud.google.com)');
    console.log('  2. Create a project or select existing one');
    console.log('  3. Enable Google Calendar API');
    console.log('  4. Go to APIs & Services > Credentials');
    console.log('  5. Create OAuth 2.0 Client ID (Desktop app)');
    console.log('  6. Copy Client ID and Client Secret');
    return;
  }

  console.log('Starting Google OAuth login...');
  console.log('');

  try {
    const { userCode, verificationUrl, deviceCode, interval } = await startOAuthFlow();

    console.log('Please visit this URL to authorize Floq:');
    console.log('');
    console.log(`  ${verificationUrl}`);
    console.log('');
    console.log('Enter this code when prompted:');
    console.log('');
    console.log(`  ${userCode}`);
    console.log('');

    // Try to open browser automatically
    try {
      const openModule = await import('open');
      await openModule.default(verificationUrl);
      console.log('(Browser opened automatically)');
    } catch {
      // Ignore - browser opening is optional
    }

    console.log('');
    console.log('Waiting for authorization...');

    const tokens = await pollForTokens(deviceCode, interval);

    // Save tokens temporarily (calendar selection happens next)
    const config = getCalendarConfig() || {};
    setCalendarConfig({
      ...config,
      type: 'oauth',
      oauth: {
        tokens,
        calendarId: '',
        calendarName: '',
      },
    });

    console.log('');
    console.log('Login successful!');
    console.log('');
    console.log('Now run "floq calendar select" to choose a calendar.');
  } catch (error) {
    console.error('Login failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Logout from OAuth (clear tokens)
 */
export async function logoutCalendar(): Promise<void> {
  const oauthConfig = getCalendarOAuthConfig();

  if (!oauthConfig) {
    console.log('Not logged in.');
    return;
  }

  clearOAuthTokens();
  console.log('Logged out successfully.');
}

/**
 * Select a calendar from the user's calendars
 */
export async function selectCalendar(): Promise<void> {
  const oauthConfig = getCalendarOAuthConfig();

  if (!oauthConfig) {
    console.log('Not logged in. Run "floq calendar login" first.');
    return;
  }

  const { getValidAccessToken } = await import('../calendar/oauth.js');
  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    console.log('Failed to get access token. Try logging in again.');
    return;
  }

  console.log('Fetching your calendars...');
  console.log('');

  try {
    const calendars = await listCalendars(accessToken);

    if (calendars.length === 0) {
      console.log('No calendars found.');
      return;
    }

    console.log('Available calendars:');
    console.log('');

    calendars.forEach((cal, index) => {
      const primary = cal.primary ? ' (primary)' : '';
      console.log(`  ${index + 1}. ${cal.summary}${primary}`);
    });

    console.log('');

    // Interactive selection
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question('Select calendar (number): ', resolve);
    });
    rl.close();

    const selection = parseInt(answer, 10);
    if (isNaN(selection) || selection < 1 || selection > calendars.length) {
      console.log('Invalid selection.');
      return;
    }

    const selectedCalendar = calendars[selection - 1];

    // Update config with selected calendar
    setCalendarOAuthConfig({
      tokens: oauthConfig.tokens,
      calendarId: selectedCalendar.id,
      calendarName: selectedCalendar.summary,
    });

    console.log('');
    console.log(`Calendar "${selectedCalendar.summary}" selected!`);
    console.log('');
    console.log('Calendar integration is now active. Run "floq calendar show" to see events.');
  } catch (error) {
    console.error('Failed to list calendars:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
