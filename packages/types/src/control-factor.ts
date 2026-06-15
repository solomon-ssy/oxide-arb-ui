import type { IsoDateTime, MarketId, UuidString } from './common';
import type {
  AuditResourceType,
  ControlAuditEventType,
  ControlFactorType,
  FactorStatus,
  PublicationMode,
  PublicationStatus,
  ShadowDecisionType,
} from './enums';

/** Governed factor value row with integrity hashes and evidence payloads. */
export interface ControlFactorValueInfo {
  factor_id: UuidString;
  run_id: UuidString;
  factor_type: ControlFactorType;
  dimensions: unknown;
  dimensions_hash: string;
  payload: unknown;
  payload_hash: string;
  evidence: unknown;
  status: FactorStatus;
  status_reason: null | string;
  generated_at: IsoDateTime;
  expires_at: IsoDateTime;
  owner: string;
  schema_version: number;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

/** Control-factor publication projection enriched with factor membership. */
export interface ControlFactorPublicationInfo {
  publication_id: UuidString;
  mode: PublicationMode;
  factor_ids: UuidString[];
  previous_publication_id: null | UuidString;
  status: PublicationStatus;
  effective_from: IsoDateTime;
  expires_at: IsoDateTime;
  approved_by: null | string;
  approval_reason: string;
  publication_hash: string;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

/** One tamper-evident audit-chain row. */
export interface ControlFactorAuditEventInfo {
  event_id: UuidString;
  sequence: number;
  event_type: ControlAuditEventType;
  actor: string;
  actor_role: string;
  resource_type: AuditResourceType;
  resource_id: string;
  request_id: string;
  reason: string;
  before_hash: null | string;
  after_hash: null | string;
  diff: unknown;
  prev_event_hash: null | string;
  event_hash: string;
  created_at: IsoDateTime;
}

/** Audit-chain slice with verification result. */
export interface AuditChainResponse {
  events: ControlFactorAuditEventInfo[];
  verified: boolean;
  broken_at: null | number;
}

/** One shadow decision row used as publication evidence. */
export interface ControlFactorShadowDecisionInfo {
  shadow_decision_id: UuidString;
  publication_id: UuidString;
  opportunity_id: UuidString;
  event_id: string;
  market_id: MarketId;
  decision_type: ShadowDecisionType;
  baseline_decision: unknown;
  shadow_decision: unknown;
  delta: unknown;
  affected_factor_ids: unknown;
  decided_at: IsoDateTime;
  created_at: IsoDateTime;
}

/** Aggregate counts over a publication's shadow-decision window. */
export interface ShadowDecisionAggregate {
  publication_id: UuidString;
  total: number;
  would_reject: number;
  would_size: number;
  would_score: number;
  no_effect: number;
  distinct_markets: number;
}

/** Shadow-decision drilldown response for a publication. */
export interface ShadowDecisionsResponse {
  aggregate: ShadowDecisionAggregate;
  decisions: ControlFactorShadowDecisionInfo[];
}
