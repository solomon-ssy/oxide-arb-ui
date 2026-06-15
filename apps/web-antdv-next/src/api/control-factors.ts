import type {
  AuditChainResponse,
  ControlFactorAuditEventInfo,
  ControlFactorPublicationInfo,
  ControlFactorType,
  ControlFactorValueInfo,
  FactorStatus,
  IsoDateTime,
  PublicationMode,
  PublicationStatus,
  ShadowDecisionsResponse,
  UuidString,
} from '@vben/types';

import type { GovernedContext } from '#/shared/composables/use-governed-action';

import { PUBLICATION_MODES } from '@vben/types';

import { governedPost } from '#/api/governed-request';
import { requestClient } from '#/api/request';

export namespace ControlFactorsApi {
  export const base = '/control-factors';
  export const publications = `${base}/publications`;
  export const audit = `${base}/audit`;
  export const factor = (id: UuidString) => `${base}/${id}`;
  export const rejectFactor = (id: UuidString) => `${factor(id)}/reject`;
  export const publication = (id: UuidString) => `${publications}/${id}`;
  export const publishShadow = `${publications}/shadow`;
  export const publishLive = `${publications}/publish`;
  export const publishEmergency = `${publications}/emergency`;
  export const rollbackPublication = (id: UuidString) =>
    `${publication(id)}/rollback`;
  export const shadowDecisions = (id: UuidString) =>
    `${publication(id)}/shadow-decisions`;

  export interface FactorListParams {
    status?: FactorStatus;
    factor_type?: ControlFactorType;
  }

  export interface PublicationListParams {
    mode: PublicationMode;
    status?: PublicationStatus;
    limit?: number;
  }

  export interface PublicationCatalogParams {
    mode?: PublicationMode;
    status?: PublicationStatus;
    limit?: number;
  }

  export interface ShadowDecisionsParams {
    from?: IsoDateTime;
    to?: IsoDateTime;
    limit?: number;
  }

  export interface AuditChainParams {
    event_id?: UuidString;
    from_sequence?: number;
    limit?: number;
  }

  export interface GovernanceEventsParams {
    limit?: number;
  }

  export const auditEvent = (eventId: UuidString) =>
    `${audit}/events/${eventId}`;
  export const governanceEvents = (id: UuidString) =>
    `${factor(id)}/governance-events`;

  export type GovernedReasonBody = Record<string, unknown> & {
    reason: string;
  };

  export type PublishPublicationBody = Record<string, unknown> & {
    effective_from?: IsoDateTime;
    expires_at: IsoDateTime;
    factor_ids: UuidString[];
    idempotency_key: string;
    manual_risk_expansion_approval?: boolean;
    reason: string;
  };

  export type EmergencyPublishBody = Record<string, unknown> & {
    factor_ids: UuidString[];
    idempotency_key: string;
    reason: string;
  };

  export type RollbackPublicationBody = Record<string, unknown> & {
    reason: string;
    target_publication_id: UuidString;
  };
}

/** `GET /control-factors` — factor review queue/list. */
export async function fetchControlFactors(
  params?: ControlFactorsApi.FactorListParams,
) {
  return requestClient.get<ControlFactorValueInfo[]>(ControlFactorsApi.base, {
    params,
  });
}

/** `GET /control-factors/{id}` — factor detail. */
export async function getControlFactor(id: UuidString) {
  return requestClient.get<ControlFactorValueInfo>(
    ControlFactorsApi.factor(id),
  );
}

/** `POST /control-factors/{id}/reject` — governed factor rejection. */
export async function rejectControlFactor(
  id: UuidString,
  body: ControlFactorsApi.GovernedReasonBody,
  ctx: GovernedContext,
) {
  return governedPost<ControlFactorValueInfo>(
    ControlFactorsApi.rejectFactor(id),
    body,
    ctx,
  );
}

/** `GET /control-factors/publications` — publication catalog. */
export async function fetchPublications(
  params: ControlFactorsApi.PublicationListParams,
) {
  return requestClient.get<ControlFactorPublicationInfo[]>(
    ControlFactorsApi.publications,
    { params },
  );
}

const PUBLICATION_CATALOG_LIMIT = 200;

function mergePublicationCatalog(
  batches: ControlFactorPublicationInfo[][],
): ControlFactorPublicationInfo[] {
  const seen = new Set<string>();
  const merged: ControlFactorPublicationInfo[] = [];
  for (const batch of batches) {
    for (const item of batch) {
      if (seen.has(item.publication_id)) {
        continue;
      }
      seen.add(item.publication_id);
      merged.push(item);
    }
  }
  return merged.toSorted(
    (left, right) =>
      Date.parse(right.effective_from) - Date.parse(left.effective_from),
  );
}

/** Publication list with optional mode (fetches both modes when omitted). */
export async function fetchPublicationCatalog(
  params?: ControlFactorsApi.PublicationCatalogParams,
) {
  const limit = params?.limit ?? 50;
  if (params?.mode) {
    return fetchPublications({
      limit,
      mode: params.mode,
      status: params.status,
    });
  }
  const [published, shadow] = await Promise.all([
    fetchPublications({
      limit,
      mode: PUBLICATION_MODES.published,
      status: params?.status,
    }),
    fetchPublications({
      limit,
      mode: PUBLICATION_MODES.shadow,
      status: params?.status,
    }),
  ]);
  return mergePublicationCatalog([published, shadow]).slice(0, limit);
}

/** Full publication catalog for rollback target selection. */
export async function fetchPublicationRollbackTargets() {
  const [published, shadow] = await Promise.all([
    fetchPublications({
      limit: PUBLICATION_CATALOG_LIMIT,
      mode: PUBLICATION_MODES.published,
    }),
    fetchPublications({
      limit: PUBLICATION_CATALOG_LIMIT,
      mode: PUBLICATION_MODES.shadow,
    }),
  ]);
  return mergePublicationCatalog([published, shadow]);
}

/** `GET /control-factors/publications/{id}` — publication detail. */
export async function getPublication(id: UuidString) {
  return requestClient.get<ControlFactorPublicationInfo>(
    ControlFactorsApi.publication(id),
  );
}

/** `POST /control-factors/publications/shadow` — governed shadow publish. */
export async function publishShadow(
  body: ControlFactorsApi.PublishPublicationBody,
  ctx: GovernedContext,
) {
  return governedPost<ControlFactorPublicationInfo>(
    ControlFactorsApi.publishShadow,
    body,
    ctx,
  );
}

/** `POST /control-factors/publications/publish` — governed live publish. */
export async function publishLive(
  body: ControlFactorsApi.PublishPublicationBody,
  ctx: GovernedContext,
) {
  return governedPost<ControlFactorPublicationInfo>(
    ControlFactorsApi.publishLive,
    body,
    ctx,
  );
}

/** `POST /control-factors/publications/emergency` — governed emergency publish. */
export async function publishEmergency(
  body: ControlFactorsApi.EmergencyPublishBody,
  ctx: GovernedContext,
) {
  return governedPost<ControlFactorPublicationInfo>(
    ControlFactorsApi.publishEmergency,
    body,
    ctx,
  );
}

/** `POST /control-factors/publications/{id}/rollback` — governed rollback. */
export async function rollbackPublication(
  id: UuidString,
  body: ControlFactorsApi.RollbackPublicationBody,
  ctx: GovernedContext,
) {
  return governedPost<ControlFactorPublicationInfo>(
    ControlFactorsApi.rollbackPublication(id),
    body,
    ctx,
  );
}

/** `GET /control-factors/publications/{id}/shadow-decisions` — shadow evidence. */
export async function fetchShadowDecisions(
  id: UuidString,
  params?: ControlFactorsApi.ShadowDecisionsParams,
) {
  return requestClient.get<ShadowDecisionsResponse>(
    ControlFactorsApi.shadowDecisions(id),
    { params },
  );
}

/** `GET /control-factors/audit` — tamper-evident governance chain. */
export async function fetchAuditChain(
  params?: ControlFactorsApi.AuditChainParams,
) {
  return requestClient.get<AuditChainResponse>(ControlFactorsApi.audit, {
    params,
  });
}

/** `GET /control-factors/audit/events/{event_id}` — single audit event. */
export async function getAuditEvent(eventId: UuidString) {
  return requestClient.get<ControlFactorAuditEventInfo>(
    ControlFactorsApi.auditEvent(eventId),
  );
}

/** `GET /control-factors/{id}/governance-events` — factor governance chain. */
export async function fetchFactorGovernanceEvents(
  id: UuidString,
  params?: ControlFactorsApi.GovernanceEventsParams,
) {
  return requestClient.get<ControlFactorAuditEventInfo[]>(
    ControlFactorsApi.governanceEvents(id),
    { params },
  );
}
