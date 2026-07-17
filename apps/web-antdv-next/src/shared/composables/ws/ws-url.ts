/**
 * Build the WebSocket URL from the HTTP API base URL.
 * Authentication is carried by a short-lived, single-use subprotocol ticket,
 * never by the URL.
 */
export function buildWsUrl(apiURL: string): string {
  const url = new URL(apiURL, window.location.origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `${url.pathname.replace(/\/$/, '')}/ws`;
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function buildWsTicketProtocol(ticket: string): string {
  return `qp-ticket.${ticket}`;
}
