/** Standard oxide-arb-web JSON envelope. */
export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: null | T;
}

/** Paginated list response (`page` is 1-based). */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  has_next: boolean;
}

/** Shared page query params (`size` max 200 on the server). */
export interface PageQuery {
  page?: number;
  size?: number;
}

/** ISO 8601 time window for list queries. */
export interface TimeRangeQuery {
  from?: string;
  to?: string;
}

export type UuidString = string;
export type IsoDateTime = string;

/** rust_decimal serialized as a decimal string — never use `number`. */
export type UsdString = string;
export type PriceString = string;
export type SharesString = string;
