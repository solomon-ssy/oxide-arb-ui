import { useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/hooks';
import { $t } from '@vben/locales';

import { message } from 'antdv-next';

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
        onSubmit: async (ctx: GovernedContext) => {
          const result = await handleRequest(
            () => execute(ctx),
            undefined,
            (error: any) => {
              if (error?.response?.status === 403) {
                message.error($t('governance.error.actingRoleForbidden'));
              }
            },
          );
          resolve(result);
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
