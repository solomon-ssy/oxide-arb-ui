import type { ApiError } from '@vben/request/oxide';

import { useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';
import { showApiError, useRequestHandler } from '@vben/request/oxide';

import GovernedActionModal from '#/shared/components/governed-action-modal.vue';

export interface GovernedContext {
  actingRole: string;
  reason: string;
}

export interface GovernedOptions {
  confirmWord?: string;
  danger?: boolean;
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
    destroyOnClose: true,
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
      modalApi.setData({
        confirmWord: options.confirmWord,
        danger: options.danger,
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
      modalApi.open();
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
