import { describe, expect, it } from 'vitest';

import { buildWsTicketProtocol, buildWsUrl } from './ws-url';

describe('websocket handshake contract', () => {
  it('never puts credentials in the WebSocket URL', () => {
    const url = new URL(buildWsUrl('https://quant.example/api?token=legacy'));
    expect(url.toString()).toBe('wss://quant.example/api/ws');
    expect(url.search).toBe('');
  });

  it('carries a single-use ticket as a subprotocol', () => {
    expect(buildWsTicketProtocol('ticket-id')).toBe('qp-ticket.ticket-id');
  });
});
