import { WS_CHANNELS } from '@vben/types';

import { describe, expect, it, vi } from 'vitest';

import {
  authorizedGlobalChannels,
  GLOBAL_WS_CHANNELS,
  WS_CHANNEL_PERMISSIONS,
} from './ws-channel-permissions';

describe('websocket channel permissions', () => {
  it('maps research feedback to server-side materialization read access', () => {
    expect(WS_CHANNEL_PERMISSIONS[WS_CHANNELS.researchFeedback]).toBe(
      'materialization:read',
    );
    expect(GLOBAL_WS_CHANNELS).toContain(WS_CHANNELS.researchFeedback);
  });

  it('omits research feedback when the session lacks read access', () => {
    const hasAccess = vi.fn((codes: string[]) =>
      codes.every((code) => code !== 'materialization:read'),
    );

    expect(authorizedGlobalChannels(hasAccess)).not.toContain(
      WS_CHANNELS.researchFeedback,
    );
  });
});
