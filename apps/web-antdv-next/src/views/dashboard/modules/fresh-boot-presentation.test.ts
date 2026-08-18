import type {
  ExchangeHistoryFrontierProgress,
  FreshBootProgressView,
} from '@vben/types';

import { describe, expect, it } from 'vitest';

import {
  activationPercent,
  reduceFreshBootRead,
  retentionPercent,
  summarizeFreshBoot,
} from './fresh-boot-presentation';

function history(): ExchangeHistoryFrontierProgress {
  return {
    accepted_through_block: 149,
    activation_from_block: 100,
    retention_accepted_from_block: 1,
    retention_from_block: 1,
    retention_through_block: 99,
    stage: 'extracting',
    target_block: 199,
  } as ExchangeHistoryFrontierProgress;
}

describe('fresh-boot presentation', () => {
  it('distinguishes waiting and running states', () => {
    expect(summarizeFreshBoot('awaiting_history')).toEqual({
      status: 'waiting',
      tone: 'queued',
    });
    expect(summarizeFreshBoot('bootstrapping')).toEqual({
      status: 'running',
      tone: 'running',
    });
  });

  it('keeps retryable states visible', () => {
    expect(summarizeFreshBoot('first_report_queued')).toEqual({
      status: 'running',
      tone: 'running',
    });
  });

  it('prioritizes terminal blockers', () => {
    expect(summarizeFreshBoot('blocked')).toEqual({
      status: 'blocked',
      tone: 'danger',
    });
  });

  it('does not let a vertical-route blocker negate a published pooled report', () => {
    expect(summarizeFreshBoot('partial_blocked', true)).toEqual({
      status: 'succeeded',
      tone: 'success',
    });
    expect(summarizeFreshBoot('partial_blocked', false)).toEqual({
      status: 'blocked',
      tone: 'danger',
    });
    expect(summarizeFreshBoot('all_routes_ready')).toEqual({
      status: 'succeeded',
      tone: 'success',
    });
  });

  it('preserves last good data as explicitly stale', () => {
    const previous = {
      observed_at: '2026-08-15T00:00:00Z',
    } as FreshBootProgressView;
    expect(reduceFreshBootRead(previous, { state: 'error' })).toEqual({
      stale: true,
      value: previous,
    });
    expect(reduceFreshBootRead(null, { state: 'error' })).toEqual({
      stale: false,
      value: null,
    });
  });

  it('calculates independent activation and retention progress', () => {
    expect(activationPercent(history())).toBe(50);
    expect(retentionPercent(history())).toBe(100);
  });
});
