import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { OVERLAY_EXIT_MS } from './use-workspace-overlay';

describe('workspace overlay dismiss', () => {
  it('keeps inspector exit short so the next click is not eaten', () => {
    expect(OVERLAY_EXIT_MS.inspector).toBeLessThanOrEqual(220);
    expect(OVERLAY_EXIT_MS.page).toBeLessThanOrEqual(300);
  });

  it('drops pointer capture as soon as the inspector is no longer open', () => {
    const source = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        'workspace-inspector-surface.vue',
      ),
      'utf8',
    );
    expect(source).toContain(':data-open="open ? \'true\' : undefined"');
    expect(source).toContain(
      ".workspace-inspector-layer[data-open='true'] .workspace-inspector-mask",
    );
    expect(source).toContain('OVERLAY_EXIT_S.inspector');
  });

  it('floats the inspector with equal inset below the header', () => {
    const source = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        'workspace-inspector-surface.vue',
      ),
      'utf8',
    );
    expect(source).toContain(
      'top: calc(var(--vben-header-height, 48px) + var(--qp-inspector-inset))',
    );
    expect(source).toContain('right: var(--qp-inspector-inset)');
    expect(source).toContain(
      'bottom: max(var(--qp-inspector-inset), env(safe-area-inset-bottom, 0px))',
    );
    expect(source).not.toMatch(/^\s*top:\s*0;/m);
    expect(source).not.toMatch(/^\s*bottom:\s*0;/m);
  });
});
