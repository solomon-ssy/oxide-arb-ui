/**
 * Cross-cutting wire types shared by every oxide-arb API domain.
 *
 * Field names mirror the backend wire format verbatim (snake_case JSON from
 * Rust serde) — no camelCase mapping layer exists by design.
 */

/**
 * HTTP response envelope produced by `oxide-arb-web` (`WebResponse<T>`).
 * `code` mirrors the HTTP status — `200` on success, not `0`.
 */
export interface ApiEnvelope<T> {
  code: number;
  data: T;
  message: string;
}

/** Paginated list payload (`Paginated<T>` in `oxide-arb-models`). */
export interface Paginated<T> {
  has_next: boolean;
  items: T[];
  /** 1-based page index. */
  page: number;
  size: number;
  total: number;
}

/**
 * Pagination query parameters (`PageRequest`). Backend defaults: `page=1`,
 * `size=20`, hard cap `size<=200`.
 */
export interface PageQuery {
  page?: number;
  size?: number;
}

/** Time-window query parameters (`TimeWindowQuery`): RFC3339 bounds + optional market filter. */
export interface TimeRangeQuery {
  from?: string;
  market_id?: MarketId;
  to?: string;
}

/** Generic identifier accepted by path-parameter helpers. */
export type IdType = number | string;

/**
 * Polymarket `condition_id` — 66-char `0x…` hex string.
 * Never interchange with {@link TokenId} (decimal CLOB token id).
 */
export type MarketId = string;

/** Decimal CLOB token id. Never interchange with {@link MarketId}. */
export type TokenId = string;

/** UUID (v7 for backend-minted entity ids, v4 for request ids). */
export type Uuid = string;

/**
 * USD amount carried as a `rust_decimal` string (e.g. `"1234.56"`).
 * Money is never represented as `number` on the wire or in app state.
 */
export type UsdString = string;

/** Price (0–1 probability space) carried as a `rust_decimal` string. */
export type PriceString = string;

/** Share quantity carried as a `rust_decimal` string. */
export type SharesString = string;

/** Basis points carried as a `rust_decimal` string. */
export type BpsString = string;
