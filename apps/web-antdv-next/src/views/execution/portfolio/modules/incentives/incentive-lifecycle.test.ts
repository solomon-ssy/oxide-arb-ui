import type { SetupContext } from 'vue';

import type {
  IncentiveReconciliationView,
  Paginated,
  VenueIncentiveEventQuery,
  VenueIncentiveEventView,
} from '@vben/types';

import { createApp, h, nextTick, onMounted } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LatestRequestOwner } from '#/shared/async/latest-request-owner';

import Incentives from './index.vue';

const api = vi.hoisted(() => ({
  canRead: true,
  events:
    vi.fn<
      (
        query?: VenueIncentiveEventQuery,
      ) => Promise<Paginated<VenueIncentiveEventView>>
    >(),
  health: vi.fn<() => Promise<IncentiveReconciliationView>>(),
  tableMountSizes: [] as number[],
}));

vi.mock('#/api/incentives', () => ({
  getIncentiveReconciliation: api.health,
  listIncentiveEvents: api.events,
}));
vi.mock('#/locales', () => ({ $t: (key: string) => key }));
vi.mock('#/shared/composables/use-qp-access', () => ({
  useQpAccess: () => ({ hasAccessByCodes: () => api.canRead }),
}));
vi.mock('@vben/common-ui', () => ({ Page: 'main' }));
vi.mock('@vben/request/qp', () => ({
  useRequestHandler: () => ({
    handleRequest: async <T>(request: () => Promise<T>): Promise<null | T> => {
      try {
        return await request();
      } catch {
        return null;
      }
    },
  }),
}));
vi.mock('#/shared/components/insight-panel.vue', () => ({
  default: 'section',
}));
vi.mock('#/shared/components/kpi-card.vue', () => ({ default: 'output' }));
vi.mock('#/shared/components/entity-route-link.vue', () => ({ default: 'a' }));
vi.mock('antdv-next', () => ({
  Alert: {
    props: ['message'],
    setup(props: { message: string }, { slots }: SetupContext) {
      return () =>
        h('div', { role: 'alert' }, [props.message, slots.action?.()]);
    },
  },
  Button: 'button',
  DatePicker: 'input',
  Empty: {
    PRESENTED_IMAGE_SIMPLE: 'simple',
    props: ['description'],
    setup(props: { description: string }) {
      return () => h('div', props.description);
    },
  },
  message: { success: vi.fn() },
  Select: {
    props: ['options', 'value'],
    emits: ['update:value'],
    setup(
      props: { options: { label: string; value: string }[]; value?: string },
      { emit }: SetupContext,
    ) {
      return () =>
        h(
          'select',
          {
            value: props.value,
            onChange: (event: Event) =>
              emit('update:value', (event.target as HTMLSelectElement).value),
          },
          props.options.map((option) =>
            h('option', { value: option.value }, option.label),
          ),
        );
    },
  },
  Skeleton: 'div',
  Table: {
    inheritAttrs: false,
    props: ['dataSource', 'loading', 'pagination'],
    emits: ['change'],
    setup(
      props: {
        dataSource: VenueIncentiveEventView[];
        loading: boolean;
        pagination: { current: number; pageSize: number; total: number };
      },
      { emit }: SetupContext,
    ) {
      onMounted(() => api.tableMountSizes.push(props.dataSource.length));
      return () =>
        h(
          'section',
          {
            'data-testid': 'ledger-table',
            'data-current': props.pagination.current,
            'data-loading': String(props.loading),
            'data-page-size': props.pagination.pageSize,
            'data-total': props.pagination.total,
          },
          [
            h(
              'output',
              props.dataSource
                .map((row) => row.venue_incentive_event_id)
                .join(','),
            ),
            h(
              'button',
              {
                'data-testid': 'next-page',
                onClick: () => emit('change', { current: 2, pageSize: 20 }),
              },
              'next page',
            ),
          ],
        );
    },
  },
  Tag: 'span',
}));

interface Deferred<T> {
  promise: Promise<T>;
  reject: (error: Error) => void;
  resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((onSuccess, onError) => {
    resolve = onSuccess;
    reject = onError;
  });
  return { promise, reject, resolve };
}

function health(): IncentiveReconciliationView {
  return {
    as_of: '2026-08-30T00:00:00Z',
    below_payout_threshold_program_dates: [],
    estimate_to_reported_delta_usd: '0',
    estimated_maker_accrual_usd: '0',
    health: 'healthy',
    incomplete_day_count: 0,
    overdue_program_dates: [],
    payout_threshold_usd: '1',
    reported_to_credit_delta_usd: '0',
    venue_reported_maker_accrual_usd: '0',
    wallet_credited_maker_usd: '0',
    wallet_credited_taker_usd: '0',
  };
}

function ledger(...ids: string[]): Paginated<VenueIncentiveEventView> {
  return {
    has_next: false,
    items: ids.map((id) => ({
      amount_usd: '1',
      available_at: '2026-08-30T00:00:00Z',
      created_at: '2026-08-30T00:00:00Z',
      evidence_hash: 'evidence',
      kind: 'maker_rebate',
      observed_at: '2026-08-30T00:00:00Z',
      program_date: '2026-08-30',
      source_identity: 'venue-report',
      source_partition: '2026-08-30',
      stage: 'venue_reported_accrual',
      venue_incentive_event_id: id,
    })),
    page: 1,
    size: 20,
    total: ids.length,
  };
}

function mountPage() {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp(Incentives);
  app.mount(host);
  return { app, host };
}

function click(host: HTMLElement, text: string) {
  const button = [...host.querySelectorAll('button')].find(
    (item) => item.textContent?.trim() === text,
  );
  expect(button).toBeDefined();
  button?.click();
}

async function settle() {
  await vi.waitFor(async () => {
    await nextTick();
    expect(api.health).toHaveBeenCalled();
  });
  await nextTick();
}

describe('incentive data lifecycle', () => {
  beforeEach(() => {
    api.canRead = true;
    api.events.mockReset();
    api.health.mockReset().mockResolvedValue(health());
    api.tableMountSizes.length = 0;
  });
  afterEach(() => vi.restoreAllMocks());

  it('does not mount an empty Table while the first request is pending', async () => {
    const pending = deferred<Paginated<VenueIncentiveEventView>>();
    api.events.mockReturnValue(pending.promise);
    const { app, host } = mountPage();
    try {
      await nextTick();
      expect(
        host.querySelector('[data-testid="incentive-ledger-loading"]'),
      ).not.toBeNull();
      expect(
        host.querySelector('[data-testid="incentive-ledger-empty"]'),
      ).toBeNull();
      expect(api.tableMountSizes).toEqual([]);

      pending.resolve(ledger('loaded-event'));
      await vi.waitFor(() =>
        expect(
          host.querySelector('[data-testid="ledger-table"]'),
        ).not.toBeNull(),
      );
      expect(api.tableMountSizes).toEqual([1]);
      expect(host.textContent).toContain('loaded-event');
      expect(
        host.querySelector('[data-testid="incentive-ledger-loading"]'),
      ).toBeNull();
    } finally {
      app.unmount();
      host.remove();
    }
  });

  it('renders successful empty data independently of Ant Table', async () => {
    api.events.mockResolvedValue(ledger());
    const { app, host } = mountPage();
    try {
      await vi.waitFor(() =>
        expect(
          host.querySelector('[data-testid="incentive-ledger-empty"]'),
        ).not.toBeNull(),
      );
      expect(api.tableMountSizes).toEqual([]);
      expect(
        host.querySelector('[data-testid="incentive-ledger-error"]'),
      ).toBeNull();
    } finally {
      app.unmount();
      host.remove();
    }
  });

  it('distinguishes failed reads from empty results and retries explicitly', async () => {
    api.health.mockRejectedValueOnce(new Error('health unavailable'));
    api.events
      .mockRejectedValueOnce(new Error('ledger unavailable'))
      .mockResolvedValueOnce(ledger('retry-event'));
    const { app, host } = mountPage();
    try {
      await vi.waitFor(() =>
        expect(
          host.querySelector('[data-testid="incentive-ledger-error"]'),
        ).not.toBeNull(),
      );
      expect(
        host.querySelector('[data-testid="incentive-reconciliation-error"]'),
      ).not.toBeNull();
      expect(
        host.querySelector('[data-testid="incentive-ledger-empty"]'),
      ).toBeNull();
      expect(api.tableMountSizes).toEqual([]);
      click(host, 'page.shared.asyncState.retry');
      await vi.waitFor(() => expect(host.textContent).toContain('retry-event'));
      expect(
        host.querySelector('[data-testid="incentive-ledger-error"]'),
      ).toBeNull();
      expect(
        host.querySelector('[data-testid="incentive-reconciliation-error"]'),
      ).toBeNull();
      expect(api.tableMountSizes).toEqual([1]);
    } finally {
      app.unmount();
      host.remove();
    }
  });

  it('retains rows while pending but clears them when the latest query fails', async () => {
    const refresh = deferred<Paginated<VenueIncentiveEventView>>();
    api.events
      .mockResolvedValueOnce(ledger('retained-event'))
      .mockReturnValueOnce(refresh.promise);
    const { app, host } = mountPage();
    try {
      await vi.waitFor(() =>
        expect(host.textContent).toContain('retained-event'),
      );
      const table = host.querySelector<HTMLElement>(
        '[data-testid="ledger-table"]',
      );
      click(host, 'page.quantAccount.incentives.ledger.apply');
      await nextTick();
      expect(table?.dataset.loading).toBe('true');
      expect(host.querySelector('[data-testid="ledger-table"]')).toBe(table);
      refresh.reject(new Error('refresh unavailable'));
      await vi.waitFor(() =>
        expect(
          host.querySelector('[data-testid="incentive-ledger-error"]'),
        ).not.toBeNull(),
      );
      expect(host.textContent).not.toContain('retained-event');
      expect(host.querySelector('[data-testid="ledger-table"]')).toBeNull();
      expect(
        host.querySelector('[data-testid="incentive-ledger-empty"]'),
      ).toBeNull();
      expect(api.tableMountSizes).toEqual([1]);
    } finally {
      app.unmount();
      host.remove();
    }
  });

  it.each([
    { order: 'earlier-first', staleOutcome: 'success' },
    { order: 'latest-first', staleOutcome: 'success' },
    { order: 'earlier-first', staleOutcome: 'failure' },
    { order: 'latest-first', staleOutcome: 'failure' },
  ] as const)(
    'only the latest filter/page request commits state: $order/$staleOutcome',
    async ({ order, staleOutcome }) => {
      const earlier = deferred<Paginated<VenueIncentiveEventView>>();
      const latest = deferred<Paginated<VenueIncentiveEventView>>();
      const finishEarlier = () => {
        if (staleOutcome === 'failure')
          earlier.reject(new Error('stale read failed'));
        else earlier.resolve(ledger('stale-event'));
      };
      api.events
        .mockResolvedValueOnce(ledger('initial-event'))
        .mockReturnValueOnce(earlier.promise)
        .mockReturnValueOnce(latest.promise);
      const { app, host } = mountPage();
      try {
        await vi.waitFor(() =>
          expect(host.textContent).toContain('initial-event'),
        );
        const filter = host.querySelector<HTMLSelectElement>('select');
        expect(filter).not.toBeNull();
        if (!filter) throw new Error('incentive kind filter is absent');
        filter.value = 'taker_rebate';
        filter.dispatchEvent(new Event('change'));
        click(host, 'page.quantAccount.incentives.ledger.apply');
        host
          .querySelector<HTMLButtonElement>('[data-testid="next-page"]')
          ?.click();
        await nextTick();
        expect(api.events.mock.calls.at(-1)?.[0]).toMatchObject({
          kind: 'taker_rebate',
          page: 2,
          size: 20,
        });
        if (order === 'earlier-first') {
          finishEarlier();
          await settle();
        }
        expect(host.textContent).toContain('initial-event');
        expect(
          host.querySelector<HTMLElement>('[data-testid="ledger-table"]')
            ?.dataset.loading,
        ).toBe('true');
        latest.resolve({
          ...ledger('current-event', 'second-event'),
          page: 2,
          size: 10,
        });
        await vi.waitFor(() =>
          expect(host.textContent).toContain('current-event'),
        );
        if (order === 'latest-first') {
          finishEarlier();
          await settle();
        }
        expect(host.textContent).not.toContain('stale-event');
        expect(
          host.querySelector('[data-testid="incentive-ledger-error"]'),
        ).toBeNull();
        const table = host.querySelector<HTMLElement>(
          '[data-testid="ledger-table"]',
        );
        expect(table?.dataset.loading).toBe('false');
        expect(table?.dataset.current).toBe('2');
        expect(table?.dataset.pageSize).toBe('10');
        expect(table?.dataset.total).toBe('2');
      } finally {
        app.unmount();
        host.remove();
      }
    },
  );

  it('invalidates in-flight commits when the page is unmounted', async () => {
    const pending = deferred<Paginated<VenueIncentiveEventView>>();
    api.events.mockReturnValue(pending.promise);
    const begin = vi.spyOn(LatestRequestOwner.prototype, 'begin');
    const { app, host } = mountPage();
    app.unmount();
    host.remove();
    const apply = vi.fn();
    expect(begin.mock.results[0]?.value.commit(apply)).toBe(false);
    expect(apply).not.toHaveBeenCalled();
    pending.resolve(ledger('disposed-event'));
    await settle();
    expect(api.tableMountSizes).toEqual([]);
  });
});
