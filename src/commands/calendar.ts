import {
  getCalendarConfig,
  setCalendarConfig,
  getCalendarSources,
  addCalendarSource,
  removeCalendarSource,
  updateCalendarSource,
  isCalendarEnabled,
  isCalendarSourceUsable,
  setCalendarEnabled,
  getGoogleOAuthClient,
  setGoogleOAuthClient,
  getCalendarOAuthTokens,
  setCalendarOAuthTokens,
  type CalendarSource,
} from '../config.js';
import { fetchCalendarEvents, getTodayEvents, clearCalendarCache, formatEventTime } from '../calendar/index.js';
import { getLocale } from '../config.js';
import { startOAuthFlow, pollForTokens, clearOAuthTokens, getValidAccessToken } from '../calendar/oauth.js';
import { listCalendars } from '../calendar/google-api.js';
import * as readline from 'readline';

/**
 * Resolve a calendar source by id, 1-based index, or name
 */
function resolveSource(idOrIndex: string): CalendarSource | undefined {
  const sources = getCalendarSources();

  // Exact id match
  const byId = sources.find(s => s.id === idOrIndex);
  if (byId) return byId;

  // 1-based index
  const index = parseInt(idOrIndex, 10);
  if (!isNaN(index) && index >= 1 && index <= sources.length) {
    return sources[index - 1];
  }

  // Name match
  return sources.find(s => s.name === idOrIndex);
}

function printSourceList(sources: CalendarSource[]): void {
  sources.forEach((source, index) => {
    const status = source.enabled !== false ? 'enabled' : 'disabled';
    const detail = source.type === 'ical'
      ? (source.url && source.url.length > 50 ? source.url.substring(0, 50) + '...' : source.url)
      : source.calendarId;
    console.log(`  ${index + 1}. [${source.id}] ${source.name} (${source.type}, ${status})`);
    console.log(`       ${detail}`);
  });
}

/**
 * Add a new iCal calendar (multiple calendars can be registered)
 */
export async function addCalendar(url: string, options: { name?: string }): Promise<void> {
  // Validate URL
  if (!url.startsWith('https://') && !url.startsWith('webcal://') && !url.startsWith('http://')) {
    console.error('Error: Invalid URL. Must start with https://, webcal://, or http://');
    process.exit(1);
  }

  const existing = getCalendarSources().find(s => s.url === url);
  if (existing) {
    console.error(`Error: This URL is already registered as "${existing.name}" [${existing.id}].`);
    process.exit(1);
  }

  // Default name from URL hostname when not provided
  let name = options.name;
  if (!name) {
    try {
      name = new URL(url.replace('webcal://', 'https://')).hostname;
    } catch {
      name = `Calendar ${getCalendarSources().length + 1}`;
    }
  }

  const source = addCalendarSource({
    name,
    type: 'ical',
    url,
    enabled: true,
  });

  console.log('Calendar added successfully!');
  console.log(`  ID: ${source.id}`);
  console.log(`  Name: ${source.name}`);
  console.log(`  URL: ${url}`);

  // Try to fetch events to validate the URL
  console.log('\nFetching events...');
  try {
    const events = await fetchCalendarEvents(url);
    console.log(`Found ${events.length} events.`);
  } catch {
    console.log('Warning: Could not fetch events. Please check the URL.');
  }

  if (getCalendarConfig()?.enabled === false) {
    console.log('Note: calendar display is currently disabled. Run "floq calendar enable" to show events.');
  }
}

/**
 * List registered calendars
 */
export async function listCalendarSourcesCommand(): Promise<void> {
  const sources = getCalendarSources();

  if (sources.length === 0) {
    console.log('No calendars registered.');
    console.log('Use "floq calendar add <url>" or "floq calendar select" to add one.');
    return;
  }

  console.log(`Registered calendars (${sources.length})`);
  console.log('-'.repeat(40));
  printSourceList(sources);
}

/**
 * Remove a calendar (by id/index/name), or all calendar configuration with --all
 */
export async function removeCalendar(idOrIndex?: string, options: { all?: boolean } = {}): Promise<void> {
  const sources = getCalendarSources();

  if (options.all) {
    if (sources.length === 0 && !getCalendarConfig()) {
      console.log('No calendar configured.');
      return;
    }
    setCalendarConfig(undefined);
    clearCalendarCache();
    console.log('All calendar configuration removed.');
    return;
  }

  if (sources.length === 0) {
    console.log('No calendars registered.');
    return;
  }

  let target: CalendarSource | undefined;
  if (idOrIndex) {
    target = resolveSource(idOrIndex);
    if (!target) {
      console.error(`Error: Calendar "${idOrIndex}" not found.`);
      console.log('');
      printSourceList(sources);
      process.exit(1);
    }
  } else if (sources.length === 1) {
    target = sources[0];
  } else {
    console.log('Multiple calendars are registered. Specify which one to remove:');
    console.log('');
    printSourceList(sources);
    console.log('');
    console.log('Usage: floq calendar remove <id|number|name>');
    console.log('       floq calendar remove --all   (remove everything)');
    return;
  }

  removeCalendarSource(target.id);
  clearCalendarCache();
  console.log(`Calendar "${target.name}" [${target.id}] removed.`);
}

/**
 * Show calendar configuration and today's events
 */
export async function showCalendar(): Promise<void> {
  const sources = getCalendarSources();
  const locale = getLocale();

  console.log('Calendar Configuration');
  console.log('-'.repeat(40));

  if (sources.length === 0) {
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

  printSourceList(sources);
  console.log('');
  console.log(`Display: ${getCalendarConfig()?.enabled !== false ? 'enabled' : 'disabled'}`);

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

  const showCalendarName = sources.length > 1;
  for (const event of todayEvents) {
    const timeStr = event.allDay
      ? (locale === 'ja' ? '終日' : 'All day')
      : `${formatEventTime(event.start)} - ${formatEventTime(event.end)}`;

    const calLabel = showCalendarName && event.calendarName ? ` [${event.calendarName}]` : '';
    console.log(`  ${timeStr}  ${event.title}${calLabel}`);
    if (event.location) {
      console.log(`    📍 ${event.location}`);
    }
  }
}

/**
 * Sync/refresh calendar cache
 */
export async function syncCalendar(): Promise<void> {
  const sources = getCalendarSources();

  if (sources.length === 0) {
    console.log('No calendar configured.');
    return;
  }

  console.log('Syncing calendars...');
  clearCalendarCache();

  try {
    const events = await fetchCalendarEvents();
    console.log(`Synced ${events.length} events from ${sources.filter(s => s.enabled !== false).length} calendar(s).`);

    const todayEvents = getTodayEvents();
    console.log(`${todayEvents.length} events today.`);
  } catch (error) {
    console.error('Failed to sync calendar:', error);
    process.exit(1);
  }
}

/**
 * Toggle calendar display (overall, or a specific calendar by id)
 */
async function setCalendarDisplay(enabled: boolean, idOrIndex?: string): Promise<void> {
  const sources = getCalendarSources();
  const label = enabled ? 'enabled' : 'disabled';

  if (sources.length === 0) {
    console.log('No calendar configured.');
    if (enabled) {
      console.log('Use "floq calendar add <url>" to add a calendar first.');
    }
    return;
  }

  if (idOrIndex) {
    const target = resolveSource(idOrIndex);
    if (!target) {
      console.error(`Error: Calendar "${idOrIndex}" not found.`);
      process.exit(1);
    }
    updateCalendarSource(target.id, { enabled });
    clearCalendarCache();
    console.log(`Calendar "${target.name}" ${label}.`);
    return;
  }

  setCalendarEnabled(enabled);
  console.log(`Calendar display ${label}.`);
}

export async function enableCalendar(idOrIndex?: string): Promise<void> {
  await setCalendarDisplay(true, idOrIndex);
}

export async function disableCalendar(idOrIndex?: string): Promise<void> {
  await setCalendarDisplay(false, idOrIndex);
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
  console.log('  2. Run "floq calendar select" to choose calendars');
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
    setCalendarOAuthTokens(tokens);

    console.log('');
    console.log('Login successful!');
    console.log('');
    console.log('Now run "floq calendar select" to choose calendars.');
  } catch (error) {
    console.error('Login failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Logout from OAuth (clear tokens)
 */
export async function logoutCalendar(): Promise<void> {
  const tokens = getCalendarOAuthTokens();

  if (!tokens) {
    console.log('Not logged in.');
    return;
  }

  clearOAuthTokens();
  console.log('Logged out successfully.');

  const oauthSources = getCalendarSources().filter(s => s.type === 'oauth');
  if (oauthSources.length > 0) {
    console.log(`Note: ${oauthSources.length} Google calendar(s) remain registered but need login to fetch events.`);
  }
}

/**
 * Select Google calendars to register (multiple selections supported)
 */
export async function selectCalendar(): Promise<void> {
  const tokens = getCalendarOAuthTokens();

  if (!tokens) {
    console.log('Not logged in. Run "floq calendar login" first.');
    return;
  }

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

    const registeredIds = new Set(
      getCalendarSources()
        .filter(s => s.type === 'oauth')
        .map(s => s.calendarId)
    );

    console.log('Available calendars:');
    console.log('');

    calendars.forEach((cal, index) => {
      const primary = cal.primary ? ' (primary)' : '';
      const registered = registeredIds.has(cal.id) ? ' [registered]' : '';
      console.log(`  ${index + 1}. ${cal.summary}${primary}${registered}`);
    });

    console.log('');

    // Interactive selection (comma-separated numbers for multiple calendars)
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question('Select calendars (numbers, comma-separated): ', resolve);
    });
    rl.close();

    const selections = answer
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n >= 1 && n <= calendars.length);

    if (selections.length === 0) {
      console.log('Invalid selection.');
      return;
    }

    console.log('');

    for (const selection of [...new Set(selections)]) {
      const selectedCalendar = calendars[selection - 1];

      if (registeredIds.has(selectedCalendar.id)) {
        console.log(`Calendar "${selectedCalendar.summary}" is already registered. Skipped.`);
        continue;
      }

      const source = addCalendarSource({
        name: selectedCalendar.summary,
        type: 'oauth',
        calendarId: selectedCalendar.id,
        enabled: true,
      });
      registeredIds.add(selectedCalendar.id);
      console.log(`Calendar "${selectedCalendar.summary}" added! [${source.id}]`);
    }

    clearCalendarCache();
    console.log('');
    if (getCalendarConfig()?.enabled === false) {
      console.log('Note: calendar display is currently disabled. Run "floq calendar enable" to show events.');
    } else {
      console.log('Calendar integration is now active. Run "floq schedule" to see events.');
    }
  } catch (error) {
    console.error('Failed to list calendars:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
