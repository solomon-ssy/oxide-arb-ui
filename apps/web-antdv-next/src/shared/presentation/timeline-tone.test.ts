import { describe, expect, it } from 'vitest';

import { enumTimelineColor, timelineDotColor } from './timeline-tone';

describe('timelineDotColor', () => {
  it('maps semantic tones onto timeline dots', () => {
    expect(timelineDotColor('success')).toBe('green');
    expect(timelineDotColor('danger')).toBe('red');
    expect(timelineDotColor('running')).toBe('hsl(var(--qp-status-running))');
    expect(timelineDotColor('queued')).toBe('hsl(var(--qp-status-queued))');
    expect(timelineDotColor('paused')).toBe('hsl(var(--qp-status-paused))');
    expect(timelineDotColor('warning')).toBe('hsl(var(--qp-status-warning))');
    expect(timelineDotColor('neutral')).toBe('gray');
    expect(timelineDotColor('category')).toBe('gray');
  });
});

describe('enumTimelineColor', () => {
  it('reads lifecycle enums through presentation tones', () => {
    expect(enumTimelineColor('ExecutionOrderState', 'filled')).toBe('green');
    expect(enumTimelineColor('ExecutionOrderState', 'failed')).toBe('red');
    expect(enumTimelineColor('FreshBootEventKind', 'training_started')).toBe(
      'hsl(var(--qp-status-running))',
    );
    expect(
      enumTimelineColor('FreshBootEventKind', 'evidence_wait_scheduled'),
    ).toBe('hsl(var(--qp-status-paused))');
    expect(enumTimelineColor('FreshBootStatus', null)).toBe('gray');
  });
});
