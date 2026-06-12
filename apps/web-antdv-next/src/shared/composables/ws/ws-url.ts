/**
 * Build the authenticated WebSocket URL from the HTTP API base URL.
 *
 * The backend authenticates the upgrade via a `token` query parameter
 * (browsers cannot set handshake headers). The API base already carries the
 * `/api` prefix, so the socket lives at `<base>/ws`.
 */
export function buildWsUrl(apiURL: string, token: string): string {
  const url = new URL(apiURL, window.location.origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `${url.pathname.replace(/\/$/, '')}/ws`;
  url.search = `?token=${encodeURIComponent(token)}`;
  return url.toString();
}
