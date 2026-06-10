import {
  getGoogleOAuthClient,
  getCalendarOAuthTokens,
  setCalendarOAuthTokens,
  type CalendarOAuthTokens,
} from '../config.js';

const GOOGLE_OAUTH_DEVICE_CODE_URL = 'https://oauth2.googleapis.com/device/code';
const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

export interface DeviceCodeResponse {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  expiresIn: number;
  interval: number;
}

/**
 * Start the OAuth Device Code flow
 */
export async function startOAuthFlow(): Promise<DeviceCodeResponse> {
  const client = getGoogleOAuthClient();
  if (!client) {
    throw new Error('OAuth client not configured. Run "floq calendar config --client-id <id> --client-secret <secret>" first.');
  }

  const response = await fetch(GOOGLE_OAUTH_DEVICE_CODE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: client.clientId,
      scope: CALENDAR_SCOPE,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to start OAuth flow: ${error}`);
  }

  const data = await response.json() as {
    device_code: string;
    user_code: string;
    verification_url: string;
    expires_in: number;
    interval: number;
  };

  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUrl: data.verification_url,
    expiresIn: data.expires_in,
    interval: data.interval,
  };
}

/**
 * Poll for tokens after user has authorized
 */
export async function pollForTokens(deviceCode: string, interval: number = 5): Promise<CalendarOAuthTokens> {
  const client = getGoogleOAuthClient();
  if (!client) {
    throw new Error('OAuth client not configured.');
  }

  const pollInterval = Math.max(interval, 5) * 1000; // At least 5 seconds

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: client.clientId,
        client_secret: client.clientSecret,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    const data = await response.json() as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    };

    if (data.access_token && data.refresh_token) {
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
      };
    }

    if (data.error === 'authorization_pending') {
      // User hasn't authorized yet, continue polling
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      continue;
    }

    if (data.error === 'slow_down') {
      // Increase polling interval
      await new Promise(resolve => setTimeout(resolve, pollInterval + 5000));
      continue;
    }

    if (data.error === 'access_denied') {
      throw new Error('Access denied by user.');
    }

    if (data.error === 'expired_token') {
      throw new Error('Device code expired. Please try again.');
    }

    throw new Error(`OAuth error: ${data.error} - ${data.error_description}`);
  }
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<CalendarOAuthTokens> {
  const client = getGoogleOAuthClient();
  if (!client) {
    throw new Error('OAuth client not configured.');
  }

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: client.clientId,
      client_secret: client.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data = await response.json() as {
    access_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: refreshToken, // Refresh token doesn't change
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

/**
 * Check if the token is expired (with 5-minute buffer)
 */
export function isTokenExpired(tokens: CalendarOAuthTokens): boolean {
  const bufferMs = 5 * 60 * 1000; // 5 minutes
  return Date.now() >= tokens.expiresAt - bufferMs;
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getValidAccessToken(): Promise<string | null> {
  let tokens = getCalendarOAuthTokens();
  if (!tokens) {
    return null;
  }

  if (isTokenExpired(tokens)) {
    try {
      tokens = await refreshAccessToken(tokens.refreshToken);
      // Update stored tokens
      setCalendarOAuthTokens(tokens);
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      return null;
    }
  }

  return tokens.accessToken;
}

/**
 * Clear OAuth tokens (logout)
 */
export function clearOAuthTokens(): void {
  setCalendarOAuthTokens(undefined);
}
