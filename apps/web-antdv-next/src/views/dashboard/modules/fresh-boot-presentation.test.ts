import type {
  ExchangeHistoryFrontierProgress,
  FreshBootProgressView,
} from '@vben/types';

import { describe, expect, it } from 'vitest';

import {
  activationPercent,
  profileStatusColor,
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
      color: 'processing',
      status: 'waiting',
    });
    expect(summarizeFreshBoot('bootstrapping')).toEqual({
      color: 'processing',
      status: 'running',
    });
  });

  it('keeps retryable states visible', () => {
    expect(profileStatusColor('waiting_evidence')).toBe('warning');
    expect(profileStatusColor('retry_scheduled')).toBe('warning');
    expect(summarizeFreshBoot('first_report_queued')).toEqual({
      color: 'processing',
      status: 'running',
    });
  });

  it('prioritizes terminal blockers', () => {
    expect(summarizeFreshBoot('blocked')).toEqual({
      color: 'error',
      status: 'blocked',
    });
  });

  it('does not let a vertical-route blocker negate a published pooled report', () => {
    expect(summarizeFreshBoot('partial_blocked', true)).toEqual({
      color: 'success',
      status: 'succeeded',
    });
    expect(summarizeFreshBoot('partial_blocked', false)).toEqual({
      color: 'error',
      status: 'blocked',
    });
    expect(summarizeFreshBoot('all_routes_ready')).toEqual({
      color: 'success',
      status: 'succeeded',
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
