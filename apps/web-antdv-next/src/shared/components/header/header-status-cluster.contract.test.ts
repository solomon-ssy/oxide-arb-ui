import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const layout = readFileSync(
  resolve(process.cwd(), 'apps/web-antdv-next/src/layouts/basic.vue'),
  'utf8',
);
const picker = readFileSync(
  resolve(
    process.cwd(),
    'apps/web-antdv-next/src/shared/components/header/governed-state-picker-popover.vue',
  ),
  'utf8',
);
const system = readFileSync(
  resolve(
    process.cwd(),
    'apps/web-antdv-next/src/shared/components/header/system-status-indicator.vue',
  ),
  'utf8',
);
const ws = readFileSync(
  resolve(
    process.cwd(),
    'apps/web-antdv-next/src/shared/components/header/ws-status-badge.vue',
  ),
  'utf8',
);
const chip = readFileSync(
  resolve(
    process.cwd(),
    'apps/web-antdv-next/src/shared/components/status-chip.vue',
  ),
  'utf8',
);

describe('header status cluster contract', () => {
  it('renders runtime glyphs as one equally sized icon row', () => {
    expect(layout).toContain('<WsStatusBadge />');
    expect(layout).toContain('<SystemStatusIndicator />');
    expect(layout).toContain('<EntryAuthorizationPolicyIndicator />');
    expect(layout).toContain('<KillSwitchIndicator />');
    expect(layout).toContain('hidden items-center md:flex');
    expect(layout).not.toContain('header-right-20');
    expect(layout).not.toContain('header-right-25');
    expect(layout).not.toContain('header-right-28');
  });

  it('keeps header triggers icon-only without chip chrome', () => {
    for (const source of [picker, system, ws]) {
      expect(source).toContain('qp-header-status-btn');
      expect(source).toContain('HeaderStatusGlyph');
    }
    expect(picker).not.toMatch(/<EnumTag[\s\S]*header:\$\{enumName\}/);
    expect(system).toContain('<HeaderStatusGlyph');
    expect(ws).not.toContain('text-success');
  });

  it('paints content tags as outlined chips', () => {
    expect(chip).toContain('color: hsl(var(--qp-tone-ink))');
    expect(chip).toContain('border: 1px solid hsl(var(--qp-tone-color) / 46%)');
    expect(chip).toContain('background: hsl(var(--qp-tone-color) / 10%)');
    expect(chip).toContain('qp-status-chip__label');
    expect(chip).not.toContain('border-radius: 999px');
  });
});
