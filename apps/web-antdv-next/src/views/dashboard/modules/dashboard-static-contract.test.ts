import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const dashboard = readFileSync(
  resolve(process.cwd(), 'apps/web-antdv-next/src/views/dashboard/index.vue'),
  'utf8',
);
const orbit = readFileSync(
  resolve(
    process.cwd(),
    'apps/web-antdv-next/src/views/dashboard/modules/recommendation-orbit.vue',
  ),
  'utf8',
);

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
});
