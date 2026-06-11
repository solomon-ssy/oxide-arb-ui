import { preferences } from '@vben/preferences';

export const API_VERSION = 'v1';

/** Shared oxide-arb-web request headers for JSON API calls. */
export function buildApiHeaders(
  extra?: Record<string, string | undefined>,
): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept-Api-Version': API_VERSION,
    'Accept-Language': preferences.app.locale,
    'X-Request-Id': crypto.randomUUID(),
  };

  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value !== undefined) {
        headers[key] = value;
      }
    }
  }

  return headers;
}

/** Bearer auth headers for token-authenticated baseRequestClient calls. */
export function buildAuthApiHeaders(
  accessToken: null | string | undefined,
  extra?: Record<string, string | undefined>,
): Record<string, string> {
  return buildApiHeaders({
    Accept: 'application/json',
    Authorization: accessToken ? `Bearer ${accessToken}` : '',
    ...extra,
  });
}
