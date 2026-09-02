import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createApp, h, nextTick } from 'vue';

import Select from 'antdv-next/dist/select/index';
import { describe, expect, it } from 'vitest';

const incentives = readFileSync(
  resolve(
    process.cwd(),
    'apps/web-antdv-next/src/views/execution/portfolio/modules/incentives/index.vue',
  ),
  'utf8',
);
const account = readFileSync(
  resolve(
    process.cwd(),
    'apps/web-antdv-next/src/views/execution/portfolio/modules/account/index.vue',
  ),
  'utf8',
);
const plans = readFileSync(
  resolve(
    process.cwd(),
    'apps/web-antdv-next/src/views/trading/recommendations/modules/recommendations/modules/widgets/recommendation-plans.vue',
  ),
  'utf8',
);

describe('maker rebate UI closure', () => {
  it('owns an account-authorized immutable event ledger outside equity', () => {
    expect(incentives).toContain("hasAccessByCodes(['account_snapshot:read'])");
    expect(incentives).toContain('listIncentiveEvents');
    expect(incentives).toContain('program_date');
    expect(incentives).toContain('source_terms_hash');
    expect(incentives).toContain('transaction_hash');
    expect(incentives).toContain('v-accessible-table-scroll');
    expect(account).not.toContain('getIncentiveReconciliation');
  });

  it('keeps mobile controls single-column and state text explicit', () => {
    expect(incentives).toContain('grid-cols-1');
    expect(incentives).toContain('sm:flex-row');
    expect(incentives).toContain('table-layout="fixed"');
    expect(incentives).toContain('reconciliation.health');
    expect(incentives).toContain('retraction');
  });

  it.each(['kind', 'stage', 'programDate'])(
    'names the %s filter independently of its selected value',
    (field) => {
      expect(incentives).toContain(
        `:aria-label="$t('page.quantAccount.incentives.ledger.${field}')"`,
      );
    },
  );

  it('forwards the select label to the actual combobox input', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({
      render: () =>
        h(Select, {
          'aria-label': 'Incentive stage',
          options: [{ label: 'Wallet credited', value: 'wallet_credited' }],
          value: 'wallet_credited',
        }),
    });
    try {
      app.mount(host);
      await nextTick();
      expect(
        host.querySelector('input[role=combobox]')?.getAttribute('aria-label'),
      ).toBe('Incentive stage');
    } finally {
      app.unmount();
      host.remove();
    }
  });

  it('shows nominal, objective, terms, threshold, and risk separately', () => {
    for (const token of [
      'expected_maker_rebate_accrual_usd',
      'objective_maker_rebate_usd',
      'payout_threshold_usd',
      'rebate_delay_basis',
      'maker_rebate_program_day_total_usd',
      'terms_hash',
      'risk_net_usd',
    ]) {
      expect(plans).toContain(token);
    }
    expect(plans).toContain('cashflowScrollLabel');
  });
});
