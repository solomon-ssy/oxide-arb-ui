import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const APP_ROOT = resolve(process.cwd(), 'apps/web-antdv-next/src');
const dashboard = readFileSync(
  join(APP_ROOT, 'views/dashboard/index.vue'),
  'utf8',
);
const orbit = readFileSync(
  join(APP_ROOT, 'views/dashboard/modules/recommendation-orbit.vue'),
  'utf8',
);
const freshBoot = readFileSync(
  join(APP_ROOT, 'views/dashboard/modules/fresh-boot-panel.vue'),
  'utf8',
);

function collectVue(root: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectVue(path));
    } else if (entry.isFile() && path.endsWith('.vue')) {
      files.push(path);
    }
  }
  return files;
}

describe('dashboard static contract', () => {
  it('removes overview motion wrappers and binds feedback invalidation', () => {
    expect(dashboard).not.toContain('MotionGroup');
    expect(dashboard).not.toContain('motionVariants');
    expect(dashboard).toContain('feedbackStore.refreshGeneration');
    expect(dashboard).toContain(
      "navigate('/research/learning-policy?module=feedback')",
    );
  });

  it('does not watch heartbeat activity or poll while WS is healthy', () => {
    expect(dashboard).toContain('shouldPollDashboard');
    expect(dashboard).toContain('isWsRecovery');
    expect(dashboard).toContain('isVisibilityRecovery');
    expect(dashboard).not.toMatch(
      /watch\(\s*\(\)\s*=>\s*wsStore\.lastHeartbeatAt/,
    );
  });

  it('keeps Orbit static and keyboard-operable with no timer or pause surface', () => {
    for (const token of [
      'manuallyPaused',
      'setInterval',
      'shouldRotate',
      'updateData',
      'useDocumentVisibility',
      'useIdle',
      'usePreferredReducedMotion',
    ]) {
      expect(orbit).not.toContain(token);
    }
    expect(orbit).not.toMatch(/\bpaused\b/);
    expect(orbit).toContain('<EchartsUI');
    expect(orbit).toContain('<ol');
    expect(orbit).toContain('<button');
    expect(orbit).toContain('data-testid="dashboard-orbit-action"');
    expect(orbit).toContain('data-orbit-kind="empty"');
    expect(orbit).toContain("emit('openReports')");
    expect(dashboard).toContain('@open-reports=');
    expect(dashboard).toContain(
      "navigate('/trading/recommendations?module=reports')",
    );
  });

  it('renders subsystem health as a status board', () => {
    expect(dashboard).toContain('SubsystemHealthList');
    expect(dashboard).not.toMatch(/check\.ok \? 'success'/);
  });

  it('paints command-rail enums through EnumTag on a half-width grid', () => {
    expect(dashboard).toContain('name="QuantRuntimeMode"');
    expect(dashboard).toContain('name="KillSwitchState"');
    expect(dashboard).toContain('StatusChip');
    expect(dashboard).not.toContain('enumOption');
    expect(dashboard).toContain('minmax(0, 1fr) minmax(0, 1fr)');
    expect(dashboard).toContain('xl:grid-cols-5');
  });

  it('lets the page scroller own the dashboard instead of nested contain traps', () => {
    expect(dashboard).not.toContain('overscroll-behavior: contain');
    expect(dashboard).not.toContain('position: absolute');
    expect(dashboard).not.toContain('inset: 0');
    const dashboardVue = collectVue(join(APP_ROOT, 'views/dashboard'));
    const nestedTraps = dashboardVue.filter((path) =>
      /overscroll-behavior:\s*contain/.test(readFileSync(path, 'utf8')),
    );
    expect(nestedTraps).toEqual([]);
  });

  it('keeps bootstrap routes equal-height with chainable inner scroll', () => {
    expect(freshBoot).toContain('align-items: stretch');
    expect(freshBoot).toContain('overflow-y: auto');
    expect(freshBoot).toContain('overscroll-behavior: auto');
    expect(freshBoot).toContain('overflow: clip');
    expect(freshBoot).toContain('position: absolute');
    expect(freshBoot).toContain('inset: 0');
    expect(freshBoot).not.toContain('overscroll-behavior: contain');
  });
});
