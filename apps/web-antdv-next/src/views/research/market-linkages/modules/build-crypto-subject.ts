/** Wire values aligned with backend `MarketSubject` / `CryptoSubject` serde. */

import type { GroundingFieldSource, ManualEvidenceInput } from '@vben/types';

export const CRYPTO_ASSETS = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE'] as const;

/** Which frozen metadata field an operator can cite evidence from
 * (mirrors Rust `GroundingField`). */
export const GROUNDING_FIELD_SOURCES: GroundingFieldSource[] = [
  'slug',
  'question',
  'description',
  'series_slug',
];

export type CryptoAssetTicker = (typeof CRYPTO_ASSETS)[number];

export const PRICE_COMPARATORS = [
  'up_vs_reference',
  'above',
  'below',
  'between',
] as const;

export type PriceComparatorKind = (typeof PRICE_COMPARATORS)[number];

export const RESOLUTION_ORACLE_KINDS = [
  'chainlink_data_streams',
  'binance_kline',
] as const;

export type ResolutionOracleKind = (typeof RESOLUTION_ORACLE_KINDS)[number];

export const KLINE_INTERVALS = ['1m'] as const;

export interface CryptoOverrideFormState {
  asset: CryptoAssetTicker;
  quote: string;
  comparator: PriceComparatorKind;
  strike: string;
  betweenHi: string;
  referenceAt: string;
  observationAt: string;
  oracleKind: ResolutionOracleKind;
  chainlinkFeed: string;
  binanceSymbol: string;
  binanceInterval: string;
  instrumentKey: string;
  /** Literal-text citations grounding the load-bearing identity fields
   * (11.2.2 remediation R4) — verified byte-exact server-side. */
  assetEvidenceSource: GroundingFieldSource;
  assetEvidenceText: string;
  oracleEvidenceSource: GroundingFieldSource;
  oracleEvidenceText: string;
  strikeEvidenceSource: GroundingFieldSource;
  strikeEvidenceText: string;
}

export function defaultCryptoOverrideForm(
  now = new Date(),
): CryptoOverrideFormState {
  const iso = now.toISOString();
  return {
    asset: 'BTC',
    quote: 'USD',
    comparator: 'up_vs_reference',
    strike: '',
    betweenHi: '',
    referenceAt: iso,
    observationAt: iso,
    oracleKind: 'chainlink_data_streams',
    chainlinkFeed: 'BTC-USD',
    binanceSymbol: 'BTCUSDT',
    binanceInterval: '1m',
    instrumentKey: 'BINANCE:BTCUSDT:1m',
    assetEvidenceSource: 'slug',
    assetEvidenceText: '',
    oracleEvidenceSource: 'description',
    oracleEvidenceText: '',
    strikeEvidenceSource: 'description',
    strikeEvidenceText: '',
  };
}

/**
 * `instrument_key` is the **feature-source** join key — always the Binance
 * kline key (`BINANCE:{symbol}:1m`), per `ruleset.rs::instrument_key()` —
 * regardless of which `resolution_oracle` (Chainlink or Binance) is selected
 * for settlement. Binding it to the Chainlink feed instead (the pre-R8 bug)
 * makes `validate_structural_consistency` reject every override submitted
 * with the default Chainlink oracle, since the ruleset only ever recognizes
 * the Binance key as the instrument binding for an asset.
 */
export function syncDerivedInstrumentFields(
  form: CryptoOverrideFormState,
): CryptoOverrideFormState {
  const chainlinkFeed = `${form.asset}-USD`;
  const binanceSymbol = `${form.asset}USDT`;
  const instrumentKey = `BINANCE:${binanceSymbol}:${form.binanceInterval}`;
  return {
    ...form,
    chainlinkFeed,
    binanceSymbol,
    instrumentKey,
  };
}

function buildComparator(
  form: CryptoOverrideFormState,
): Record<string, unknown> {
  switch (form.comparator) {
    case 'above':
    case 'below':
    case 'up_vs_reference': {
      return { kind: form.comparator };
    }
    case 'between': {
      return { kind: 'between', hi: form.betweenHi.trim() };
    }
    default: {
      return { kind: 'up_vs_reference' };
    }
  }
}

function buildResolutionOracle(
  form: CryptoOverrideFormState,
): Record<string, unknown> {
  if (form.oracleKind === 'binance_kline') {
    return {
      kind: 'binance_kline',
      interval: form.binanceInterval,
      symbol: form.binanceSymbol.trim().toUpperCase(),
    };
  }
  return {
    kind: 'chainlink_data_streams',
    feed: form.chainlinkFeed.trim().toUpperCase(),
  };
}

/** Build the `MarketSubject` JSON document expected by `OverrideLinkageRequest`. */
export function buildCryptoMarketSubject(
  form: CryptoOverrideFormState,
): Record<string, unknown> {
  const synced = syncDerivedInstrumentFields(form);
  const strike =
    synced.comparator === 'up_vs_reference' || !synced.strike.trim()
      ? null
      : synced.strike.trim();
  const referenceAt =
    synced.comparator === 'up_vs_reference' && synced.referenceAt.trim()
      ? synced.referenceAt.trim()
      : synced.referenceAt.trim() || null;

  return {
    family: 'crypto',
    asset: synced.asset,
    quote: synced.quote.trim().toUpperCase(),
    comparator: buildComparator(synced),
    strike,
    reference_at: referenceAt,
    observation_at: synced.observationAt.trim(),
    resolution_oracle: buildResolutionOracle(synced),
  };
}

/** Whether this form's comparator carries a strike (so its evidence citation
 * is required too — mirrors the backend's conditional `strike.is_some()`
 * grounding requirement). */
function formHasStrike(form: CryptoOverrideFormState): boolean {
  return form.comparator === 'above' || form.comparator === 'below';
}

/** Build the `evidence` array `OverrideLinkageRequest` requires (11.2.2
 * remediation R4) — one citation per load-bearing identity field the backend
 * grounds (`asset` / `resolution_oracle` always, `strike` when present). */
export function buildManualEvidence(
  form: CryptoOverrideFormState,
): ManualEvidenceInput[] {
  const evidence: ManualEvidenceInput[] = [
    {
      source: form.assetEvidenceSource,
      subject_field: 'asset',
      text: form.assetEvidenceText.trim(),
    },
    {
      source: form.oracleEvidenceSource,
      subject_field: 'resolution_oracle',
      text: form.oracleEvidenceText.trim(),
    },
  ];
  if (formHasStrike(form)) {
    evidence.push({
      source: form.strikeEvidenceSource,
      subject_field: 'strike',
      text: form.strikeEvidenceText.trim(),
    });
  }
  return evidence;
}

export function validateCryptoOverrideForm(
  form: CryptoOverrideFormState,
): null | string {
  if (!form.observationAt.trim()) {
    return 'observationAtRequired';
  }
  if (form.comparator === 'between' && !form.betweenHi.trim()) {
    return 'betweenHiRequired';
  }
  if (formHasStrike(form) && !form.strike.trim()) {
    return 'strikeRequired';
  }
  if (form.comparator === 'up_vs_reference' && !form.referenceAt.trim()) {
    return 'referenceAtRequired';
  }
  if (!form.instrumentKey.trim()) {
    return 'instrumentKeyRequired';
  }
  if (!form.assetEvidenceText.trim()) {
    return 'assetEvidenceRequired';
  }
  if (!form.oracleEvidenceText.trim()) {
    return 'oracleEvidenceRequired';
  }
  if (formHasStrike(form) && !form.strikeEvidenceText.trim()) {
    return 'strikeEvidenceRequired';
  }
  return null;
}
