import { describe, expect, it } from 'vitest';

import { feedbackWorkbenchState } from './feedback-workbench-state';

describe('feedback workbench state', () => {
  it.each([
    [
      'permission',
      {
        canRead: false,
        cycleCount: 0,
        hasOverview: false,
        hasReadiness: false,
        loadError: false,
        loading: false,
      },
    ],
    [
      'loading',
      {
        canRead: true,
        cycleCount: 0,
        hasOverview: false,
        hasReadiness: false,
        loadError: false,
        loading: true,
      },
    ],
    [
      'error',
      {
        canRead: true,
        cycleCount: 0,
        hasOverview: false,
        hasReadiness: false,
        loadError: true,
        loading: false,
      },
    ],
    [
      'empty',
      {
        canRead: true,
        cycleCount: 0,
        hasOverview: true,
        hasReadiness: true,
        loadError: false,
        loading: false,
      },
    ],
    [
      'blocked',
      {
        canRead: true,
        cycleCount: 0,
        hasOverview: true,
        hasReadiness: false,
        loadError: false,
        loading: false,
      },
    ],
    [
      'ready',
      {
        canRead: true,
        cycleCount: 1,
        hasOverview: true,
        hasReadiness: true,
        loadError: false,
        loading: false,
      },
    ],
  ] as const)(
    'returns %s without collapsing distinct states',
    (expected, input) => {
      expect(feedbackWorkbenchState(input)).toBe(expected);
    },
  );
});
