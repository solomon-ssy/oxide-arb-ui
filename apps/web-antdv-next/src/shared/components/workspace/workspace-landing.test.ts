import { describe, expect, it } from 'vitest';

import {
  highlightedTab,
  isLandingModule,
  resolveWorkspaceModule,
} from './workspace-landing';

const MARKET_MODULES = [
  { key: 'overview' },
  { highlight: 'overview', key: 'live', landing: false },
  { key: 'structure' },
] as const;

const REPORT_MODULES = [
  { key: 'reports' },
  { highlight: 'reports', key: 'queue', landing: false },
  { highlight: 'reports', key: 'funnel', landing: false },
  { highlight: 'reports', key: 'diff', landing: false },
] as const;

describe('workspace landing tabs', () => {
  it('treats omitted landing as a visible inventory tab', () => {
    expect(isLandingModule({ key: 'overview' })).toBe(true);
    expect(isLandingModule({ key: 'live', landing: false })).toBe(false);
  });

  it('highlights the owning inventory while a contextual module is active', () => {
    expect(highlightedTab(MARKET_MODULES, 'live')).toBe('overview');
    expect(highlightedTab(REPORT_MODULES, 'funnel')).toBe('reports');
    expect(highlightedTab(MARKET_MODULES, 'structure')).toBe('structure');
  });
});

describe('workspace module canonicalization', () => {
  it('keeps landing modules and object-stage deep links with an identity', () => {
    expect(
      resolveWorkspaceModule({
        modules: MARKET_MODULES,
        path: '/trading/market-intelligence',
        requested: 'structure',
      }),
    ).toBe('structure');
    expect(
      resolveWorkspaceModule({
        entity: 'market',
        id: '0xabc',
        modules: MARKET_MODULES,
        path: '/trading/market-intelligence',
        requested: 'live',
      }),
    ).toBe('live');
    expect(
      resolveWorkspaceModule({
        entity: 'report',
        id: 'report-1',
        modules: REPORT_MODULES,
        path: '/trading/recommendations',
        requested: 'funnel',
      }),
    ).toBe('funnel');
    expect(
      resolveWorkspaceModule({
        entity: 'recommendation',
        id: 'rec-1',
        modules: REPORT_MODULES,
        path: '/trading/recommendations',
        requested: 'queue',
      }),
    ).toBe('queue');
  });

  it('does not land on contextual modules without a selected object', () => {
    expect(
      resolveWorkspaceModule({
        modules: MARKET_MODULES,
        path: '/trading/market-intelligence',
        requested: 'live',
      }),
    ).toBe('overview');
    expect(
      resolveWorkspaceModule({
        modules: REPORT_MODULES,
        path: '/trading/recommendations',
        requested: 'queue',
      }),
    ).toBe('reports');
    expect(
      resolveWorkspaceModule({
        modules: REPORT_MODULES,
        path: '/trading/recommendations',
        requested: 'diff',
      }),
    ).toBe('reports');
    expect(
      resolveWorkspaceModule({
        entity: 'market',
        modules: MARKET_MODULES,
        path: '/trading/market-intelligence',
        requested: 'live',
      }),
    ).toBe('overview');
    expect(
      resolveWorkspaceModule({
        modules: MARKET_MODULES,
        path: '/trading/market-intelligence',
      }),
    ).toBe('overview');
  });
});
