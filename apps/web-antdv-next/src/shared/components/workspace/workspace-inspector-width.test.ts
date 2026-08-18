import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_INSPECTOR_WIDTH_PX,
  resolveInspectorPanelWidth,
} from './workspace-inspector-width';

describe('resolveInspectorPanelWidth', () => {
  it('turns unitless Vue attribute widths into px so CSS min() stays valid', () => {
    expect(resolveInspectorPanelWidth('640')).toBe('640px');
    expect(resolveInspectorPanelWidth('720')).toBe('720px');
    expect(resolveInspectorPanelWidth(520)).toBe('520px');
  });

  it('keeps authored CSS lengths', () => {
    expect(resolveInspectorPanelWidth('45rem')).toBe('45rem');
    expect(resolveInspectorPanelWidth('640px')).toBe('640px');
  });

  it('falls back to the stored or default pixel width', () => {
    expect(resolveInspectorPanelWidth(undefined, 480)).toBe('480px');
    expect(resolveInspectorPanelWidth('auto')).toBe(
      `${DEFAULT_INSPECTOR_WIDTH_PX}px`,
    );
  });

  it('is the only width path on WorkspaceInspectorSurface', () => {
    const source = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        'workspace-inspector-surface.vue',
      ),
      'utf8',
    );
    expect(source).toContain('resolveInspectorPanelWidth(props.width');
    expect(source).not.toContain('return props.width');
  });
});
