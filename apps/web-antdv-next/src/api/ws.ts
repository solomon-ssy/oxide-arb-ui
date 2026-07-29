import { requestClient } from '#/api/request';

import { FeedbackApi } from './feedback';

export interface WsTicketResponse {
  expires_in: number;
  ticket: string;
}

export interface FeedbackRevisionResponse {
  revision: number;
}

/** Mint a short-lived ticket consumed by exactly one WebSocket upgrade. */
export function issueWsTicketApi() {
  return requestClient.post<WsTicketResponse>('/ws/tickets');
}

/**
 * Read the authoritative feedback cursor before replay recovery. The endpoint
 * returns the full overview; this WS adapter deliberately consumes only its
 * durable revision and does not cache page data.
 */
export function getFeedbackRevisionApi() {
  return requestClient.get<FeedbackRevisionResponse>(FeedbackApi.overview);
}
