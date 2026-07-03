import { describe, expect, it } from 'vitest';

import {
  BEAM_PALETTE,
  needsDirtySwitchConfirm,
  resolveSectionBeamColor,
  resolveSectionBeamTone,
} from './runtime-config-beam-palette';

describe('resolveSectionBeamTone', () => {
  it('prefers governance critical over dirty', () => {
    expect(
      resolveSectionBeamTone({ dirty: true, governanceCritical: true }),
    ).toBe('warning');
  });

  it('uses processing when dirty only', () => {
    expect(resolveSectionBeamTone({ dirty: true })).toBe('processing');
  });

  it('uses primary by default', () => {
    expect(resolveSectionBeamTone({})).toBe('primary');
  });
});

describe('resolveSectionBeamColor', () => {
  it('maps tone to palette entries', () => {
    expect(resolveSectionBeamColor({ governanceCritical: true })).toEqual(
      BEAM_PALETTE.warning,
    );
    expect(resolveSectionBeamColor({ dirty: true })).toEqual(
      BEAM_PALETTE.processing,
    );
    expect(resolveSectionBeamColor({})).toEqual(BEAM_PALETTE.primary);
  });
});

describe('needsDirtySwitchConfirm', () => {
  it('does not confirm when ids match or source is empty', () => {
    expect(needsDirtySwitchConfirm('reports', 'reports', true)).toBe(false);
    expect(needsDirtySwitchConfirm('', 'reports', true)).toBe(false);
  });

  it('confirms when leaving a dirty section', () => {
    expect(needsDirtySwitchConfirm('reports', 'execution', true)).toBe(true);
    expect(needsDirtySwitchConfirm('reports', 'execution', false)).toBe(false);
  });
});
