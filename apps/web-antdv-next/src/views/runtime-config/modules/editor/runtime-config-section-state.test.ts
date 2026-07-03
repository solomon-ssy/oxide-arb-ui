import { describe, expect, it } from 'vitest';

import { resolveInitialActiveSectionId } from './runtime-config-section-state';

describe('resolveInitialActiveSectionId', () => {
  const sections = [
    { id: 'reports' },
    { id: 'execution' },
    { id: 'portfolio' },
  ];

  it('returns empty when no sections exist', () => {
    expect(resolveInitialActiveSectionId([], ['reports'])).toBe('');
  });

  it('prefers the first valid id in order', () => {
    expect(
      resolveInitialActiveSectionId(sections, [
        'missing',
        'execution',
        'reports',
      ]),
    ).toBe('execution');
  });

  it('falls back to the first section', () => {
    expect(resolveInitialActiveSectionId(sections, ['missing', null])).toBe(
      'reports',
    );
  });
});
