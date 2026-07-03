import type { ApiError } from '@vben/request/qp';

import type { GovernedField } from './governed-field';

import { nextTick } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';
import { showApiError, useRequestHandler } from '@vben/request/qp';

import GovernedActionModal from '#/shared/components/governed-action-modal.vue';

export interface GovernedContext {
  actingRole: string;
  reason: string;
  /**
   * Collected values of the optional typed {@link GovernedField}s, keyed by
   * `name`. Empty inputs are normalized to `undefined` so callers can spread
   * them straight into optional request bodies.
   */
  fields: Record<string, string | undefined>;
}

/** Read-only key/value row rendered in the governed modal body. */
export interface GovernedDetailRow {
  label: string;
  value: string;
  /** Render the value in a monospace, break-all style (ids / hashes). */
  mono?: boolean;
}

export interface GovernedOptions {
  confirmWord?: string;
  danger?: boolean;
  /** Structured resource preview shown above the reason field. */
  details?: GovernedDetailRow[];
  /** Optional typed operator inputs (overrides, resolution verdict, …). */
  fields?: GovernedField[];
  summary?: string;
  title: string;
}

type GovernedActionApi = {
  governed: <T>(
    execute: (ctx: GovernedContext) => Promise<T>,
    options: GovernedOptions,
  ) => Promise<null | T>;
  GovernedActionHost: ReturnType<typeof useVbenModal>[0];
};

let governedActionApi: GovernedActionApi | null = null;

/** Governed modals own toast copy (403 acting-role vs backend detail). */
function showGovernedApiError(error: ApiError) {
  if (error.httpStatus === 403 || error.code === 403) {
    showApiError(error, {
      message: $t('governance.error.actingRoleForbidden'),
    });
    return;
  }
  showApiError(error);
}

function createGovernedActionApi(): GovernedActionApi {
  const { handleRequest } = useRequestHandler();

  const [GovernedActionHost, modalApi] = useVbenModal({
    connectedComponent: GovernedActionModal,
    zIndex: 2001,
  });

  /**
   * Opens the governed-action modal; on confirm, runs `execute` with
   * `{ actingRole, reason }`. Wire API calls via `governedPost` from
   * `#/api/governed-request`:
   *
   * @example
   * await governed(
   *   (ctx) => governedPost('/system/mode', { mode: 'live', reason: ctx.reason }, ctx),
   *   { title: 'Switch mode', danger: true },
   * );
   */
  async function governed<T>(
    execute: (ctx: GovernedContext) => Promise<T>,
    options: GovernedOptions,
  ): Promise<null | T> {
    return new Promise((resolve) => {
      void (async () => {
        modalApi.setData({
          confirmWord: options.confirmWord,
          danger: options.danger,
          details: options.details,
          fields: options.fields,
          summary: options.summary,
          title: options.title,
          onCancel: () => resolve(null),
          onSubmit: async (ctx: GovernedContext): Promise<boolean> => {
            const result = await handleRequest(() => execute(ctx), {
              onError: showGovernedApiError,
              silent: true,
            });
            resolve(result);
            return result !== null;
          },
        });
        modalApi.setState({ title: options.title });
        await nextTick();
        modalApi.open();
      })();
    });
  }

  return {
    governed,
    GovernedActionHost,
  };
}

/** Singleton governed-action modal host (mounted once in BasicLayout). */
export function useGovernedAction(): GovernedActionApi {
  governedActionApi ??= createGovernedActionApi();
  return governedActionApi;
}
