import type { GovernedContext } from '#/shared/composables/use-governed-action';

import { withSilentError } from '@vben/request/qp';

import { buildApiHeaders } from '#/api/headers';
import { requestClient } from '#/api/request';

/** Headers for governed mutations (`X-Acting-Role` + standard API headers). */
export function buildGovernedHeaders(
  ctx: GovernedContext,
): Record<string, string> {
  return buildApiHeaders({
    'X-Acting-Role': ctx.actingRole,
  });
}

/**
 * Governed contracts carry either the legacy domain `reason` field or the
 * explicit governance pair `reason_code` + `note`. Concrete request types are
 * structurally assignable and retain all additional typed wire fields.
 */
type GovernedBody =
  | { note: string; reason_code: string }
  | { operator_note: string; reason_code: string }
  | { reason: string };

/** Governed writes suppress global toasts; modal handlers own operator feedback. */
const GOVERNED_CONFIG = withSilentError({});

export async function governedPost<T>(
  url: string,
  body: GovernedBody,
  ctx: GovernedContext,
) {
  return requestClient.post<T>(url, body, {
    ...GOVERNED_CONFIG,
    headers: buildGovernedHeaders(ctx),
  });
}

export async function governedPut<T>(
  url: string,
  body: GovernedBody,
  ctx: GovernedContext,
) {
  return requestClient.put<T>(url, body, {
    ...GOVERNED_CONFIG,
    headers: buildGovernedHeaders(ctx),
  });
}

export async function governedDelete<T>(
  url: string,
  body: GovernedBody,
  ctx: GovernedContext,
) {
  return requestClient.delete<T>(url, {
    ...GOVERNED_CONFIG,
    data: body,
    headers: buildGovernedHeaders(ctx),
  });
}
