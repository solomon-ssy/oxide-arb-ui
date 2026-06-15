import type { IsoDateTime, UuidString } from './common';
import type {
  OperationCategory,
  OperationOutcome,
  ResourceType,
} from './enums';

/** Redacted append-only operation-log row. */
export interface OperationLogView {
  id: UuidString;
  occurred_at: IsoDateTime;
  request_id: string;
  actor_user_id: null | UuidString;
  actor_username: null | string;
  acting_role: null | string;
  category: OperationCategory;
  action: string;
  resource_type: null | ResourceType;
  resource_id: null | string;
  http_method: string;
  http_path: string;
  http_status: number;
  outcome: OperationOutcome;
  client_ip: null | string;
  user_agent: null | string;
  latency_ms: number;
  detail: unknown;
  governance_audit_event_id: null | UuidString;
  governance_audit_sequence: null | number;
}
