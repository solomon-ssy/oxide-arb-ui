import { requestClient } from '#/api/request';

export interface WsTicketResponse {
  expires_in: number;
  ticket: string;
}

/** Mint a short-lived ticket consumed by exactly one WebSocket upgrade. */
export function issueWsTicketApi() {
  return requestClient.post<WsTicketResponse>('/ws/tickets');
}
