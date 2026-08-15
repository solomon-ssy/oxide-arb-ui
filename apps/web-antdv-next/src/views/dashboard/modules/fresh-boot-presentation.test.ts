import type {
  ExchangeHistoryFrontierProgress,
  FreshBootProfileProgressView,
  FreshBootProgressView,
  FreshBootStatus,
} from '@vben/types';

import { describe, expect, it } from 'vitest';

import {
  activationPercent,
  profileStatusColor,
  reduceFreshBootRead,
  retentionPercent,
  summarizeFreshBoot,
} from './fresh-boot-presentation';

function profile(status: FreshBootStatus): FreshBootProfileProgressView {
  return { run: { status } } as FreshBootProfileProgressView;
}

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
    expect(summarizeFreshBoot([], 'startup_probe')).toEqual({
      color: 'processing',
      status: 'waiting',
    });
    expect(summarizeFreshBoot([profile('running')], 'extracting')).toEqual({
      color: 'processing',
      status: 'running',
    });
  });

  it('keeps retryable states visible', () => {
    expect(profileStatusColor('waiting_evidence')).toBe('warning');
    expect(profileStatusColor('retry_scheduled')).toBe('warning');
    expect(
      summarizeFreshBoot([profile('retry_scheduled')], 'extracting'),
    ).toEqual({ color: 'processing', status: 'running' });
  });

  it('prioritizes terminal blockers', () => {
    expect(
      summarizeFreshBoot([profile('blocked_terminal')], 'extracting'),
    ).toEqual({ color: 'error', status: 'blocked' });
    expect(summarizeFreshBoot([profile('running')], 'quarantined')).toEqual({
      color: 'error',
      status: 'blocked',
    });
  });

  it('requires all three routes for global success', () => {
    expect(
      summarizeFreshBoot(
        [profile('succeeded'), profile('succeeded'), profile('succeeded')],
        'activation_ready',
      ),
    ).toEqual({ color: 'success', status: 'succeeded' });
    expect(
      summarizeFreshBoot([profile('succeeded')], 'activation_ready').status,
    ).toBe('running');
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
