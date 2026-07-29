import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getDashboardSnapshot } from './dashboard-snapshot';

const mocks = vi.hoisted(() => ({
  getDashboardOverview: vi.fn(),
  getFeedbackOverview: vi.fn(),
}));

vi.mock('#/api/dashboard', () => ({
  getDashboardOverview: mocks.getDashboardOverview,
}));
vi.mock('#/api/feedback', () => ({
  getFeedbackOverview: mocks.getFeedbackOverview,
}));

describe('dashboard snapshot', () => {
  beforeEach(() => {
    mocks.getDashboardOverview.mockReset();
    mocks.getFeedbackOverview.mockReset();
  });

  it('keeps dashboard and feedback failures section-local', async () => {
    const signal = new AbortController().signal;
    const overview = { revision: 'dashboard-revision' };
    mocks.getDashboardOverview.mockResolvedValue(overview);
    mocks.getFeedbackOverview.mockRejectedValue(new Error('feedback down'));

    await expect(getDashboardSnapshot('7d', signal, true)).resolves.toEqual({
      feedback: { state: 'error' },
      overview: { state: 'ready', value: overview },
    });

    mocks.getDashboardOverview.mockRejectedValue(new Error('dashboard down'));
    mocks.getFeedbackOverview.mockResolvedValue({ revision: 44 });
    await expect(getDashboardSnapshot('7d', signal, true)).resolves.toEqual({
      feedback: { state: 'ready', value: { revision: 44 } },
      overview: { state: 'error' },
    });
  });

  it('does not request protected feedback without materialization read', async () => {
    const signal = new AbortController().signal;
    mocks.getDashboardOverview.mockResolvedValue({ revision: 'dashboard' });

    await expect(getDashboardSnapshot('24h', signal, false)).resolves.toEqual({
      feedback: { state: 'forbidden' },
      overview: {
        state: 'ready',
        value: { revision: 'dashboard' },
      },
    });
    expect(mocks.getFeedbackOverview).not.toHaveBeenCalled();
  });

  it('forwards one abort signal to both authoritative reads', async () => {
    const signal = new AbortController().signal;
    mocks.getDashboardOverview.mockResolvedValue({ revision: 'dashboard' });
    mocks.getFeedbackOverview.mockResolvedValue({ revision: 45 });

    await getDashboardSnapshot('30d', signal, true);

    expect(mocks.getDashboardOverview).toHaveBeenCalledWith('30d', { signal });
    expect(mocks.getFeedbackOverview).toHaveBeenCalledWith({ signal });
  });
});
