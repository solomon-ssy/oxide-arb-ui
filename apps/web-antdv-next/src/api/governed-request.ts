import type { GovernedContext } from '#/shared/composables/use-governed-action';

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

type GovernedBody = Record<string, unknown> & { reason: string };

export async function governedPost<T>(
  url: string,
  body: GovernedBody,
  ctx: GovernedContext,
) {
  return requestClient.post<T>(url, body, {
    headers: buildGovernedHeaders(ctx),
  });
}

export async function governedPut<T>(
  url: string,
  body: GovernedBody,
  ctx: GovernedContext,
) {
  return requestClient.put<T>(url, body, {
    headers: buildGovernedHeaders(ctx),
  });
}

export async function governedDelete<T>(
  url: string,
  body: GovernedBody,
  ctx: GovernedContext,
) {
  return requestClient.delete<T>(url, {
    data: body,
    headers: buildGovernedHeaders(ctx),
  });
}
