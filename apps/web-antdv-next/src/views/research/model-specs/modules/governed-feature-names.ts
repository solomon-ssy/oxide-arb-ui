import { ref } from 'vue';

import { useRequestHandler } from '@vben/request/qp';
import { PUBLICATION_STATUSES } from '@vben/types';

import { listFactors } from '#/api/research';

/** Built-in feature identifiers from the governed research schema (non-parameterized). */
const BUILTIN_GOVERNED_FEATURE_NAMES = [
  'book.age_ms',
  'book.best_ask',
  'book.best_bid',
  'book.crossed',
  'book.depth_imbalance',
  'book.empty',
  'book.mid',
  'book.slope',
  'book.spread_bps',
  'book.visible_liquidity_usd',
  'domain.crypto.basis_vs_resolution_source',
  'domain.crypto.distance_to_strike',
  'domain.crypto.time_to_observation',
  'domain.crypto.underlying_momentum',
  'domain.crypto.underlying_realized_vol',
  'market.category',
  'market.event_age_secs',
  'market.is_active',
  'market.neg_risk',
  'market.outcome_count',
  'market.time_to_resolution_secs',
  'micro.adverse_selection_proxy',
  'micro.book_churn',
  'micro.queue_depletion',
  'micro.quote_update_rate',
  'micro.stale_quote_frequency',
  'micro.sudden_liquidity_withdrawal',
  'struct.book_churn_intensity',
  'struct.maker_gini',
  'struct.negrisk_convert_edge',
  'struct.negrisk_leg_ask_sum',
  'struct.negrisk_leg_bid_sum',
  'struct.negrisk_leg_count',
  'struct.participant_count',
  'struct.participant_coverage_ratio',
  'struct.participant_cr1_share',
  'struct.participant_gini',
  'struct.participant_hhi',
  'struct.price_extremity',
  'struct.shock_ratio',
  'struct.short_return',
  'struct.taker_gini',
  'struct.trade_tape_count',
  'struct.trade_tape_notional_usd',
  'ts.macd_norm',
  'ts.price_reversal',
] as const;

/** Crypto specialist template aligned with Phase 11.2.2 domain slice. */
export const CRYPTO_FEATURE_REQUIREMENTS_TEMPLATE = [
  'domain.crypto.distance_to_strike',
  'domain.crypto.underlying_momentum',
  'domain.crypto.underlying_realized_vol',
  'domain.crypto.time_to_observation',
  'domain.crypto.basis_vs_resolution_source',
] as const;

export function useGovernedFeatureNames() {
  const { handleRequest } = useRequestHandler();
  const featureOptions = ref<{ label: string; value: string }[]>([]);
  const loading = ref(false);

  async function reload(): Promise<void> {
    loading.value = true;
    const page = await handleRequest(
      () =>
        listFactors({
          size: 500,
          status: PUBLICATION_STATUSES.published,
        }),
      { silent: true },
    );
    const fromFactors = (page?.items ?? []).flatMap(
      (row) => row.input_features,
    );
    const names = [
      ...new Set([...BUILTIN_GOVERNED_FEATURE_NAMES, ...fromFactors]),
    ].toSorted((left, right) => left.localeCompare(right));
    featureOptions.value = names.map((name) => ({ label: name, value: name }));
    loading.value = false;
  }

  return { featureOptions, loading, reload };
}
