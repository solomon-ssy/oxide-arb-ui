/**
 * Market lifecycle operator actions for the Markets page.
 *
 * - subscribe / unsubscribe: `market:update` RBAC, plain POST (no governed body).
 * - block / unblock: governed (`reason` + acting role); unblock first collects a
 *   `restore_status` via a dedicated modal, then chains the governed flow.
 */
import type { MarketStatus, MarketView } from '@vben/types';

import { useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { message } from 'antdv-next';

import {
  blockMarket,
  subscribeMarket,
  unblockMarket,
  unsubscribeMarket,
} from '#/api/markets';
import { $t } from '#/locales';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';

import UnblockMarketModal from './widgets/unblock-market-modal.vue';

export function useMarketActions(onCatalogChanged?: () => void) {
  const { governed } = useGovernedAction();
  const { handleRequest } = useRequestHandler();
  const { hasAccessByCodes } = useQpAccess();

  const canUpdate = hasAccessByCodes(['market:update']);

  const [UnblockModalHost, unblockModalApi] = useVbenModal({
    connectedComponent: UnblockMarketModal,
    destroyOnClose: true,
  });

  async function setSubscription(
    row: MarketView,
    subscribed: boolean,
  ): Promise<boolean> {
    let succeeded = false;
    // Endpoints return `null` on success — branch on the success hook, not the
    // resolved value (indistinguishable from a failure null).
    await handleRequest(
      () =>
        subscribed
          ? subscribeMarket(row.market_id)
          : unsubscribeMarket(row.market_id),
      {
        onSuccess() {
          succeeded = true;
          message.success(
            $t(
              subscribed
                ? 'page.markets.feedback.subscribed'
                : 'page.markets.feedback.unsubscribed',
            ),
          );
          // CellSwitch already updates the row in place — avoid a full refetch
          // that reshuffles pages sorted by `updated_at`.
        },
      },
    );
    return succeeded;
  }

  async function block(row: MarketView) {
    const result = await governed(
      (ctx) => blockMarket(row.market_id, { reason: ctx.reason }, ctx),
      {
        confirmWord: 'BLOCK',
        danger: true,
        summary: $t('page.markets.block.summary', { question: row.question }),
        title: $t('page.markets.actions.block'),
      },
    );
    if (result) {
      message.success($t('page.markets.feedback.blocked'));
      onCatalogChanged?.();
    }
  }

  async function unblockWithStatus(
    row: MarketView,
    restoreStatus: MarketStatus,
  ) {
    const result = await governed(
      (ctx) =>
        unblockMarket(
          row.market_id,
          { reason: ctx.reason, restore_status: restoreStatus },
          ctx,
        ),
      {
        summary: $t('page.markets.unblock.summary', {
          question: row.question,
          status: $t(`enum.marketStatus.${restoreStatus}`),
        }),
        title: $t('page.markets.actions.unblock'),
      },
    );
    if (result) {
      message.success($t('page.markets.feedback.unblocked'));
      onCatalogChanged?.();
    }
  }

  function unblock(row: MarketView) {
    unblockModalApi
      .setData({
        onSubmit: (restoreStatus: MarketStatus) => {
          void unblockWithStatus(row, restoreStatus);
        },
        question: row.question,
      })
      .open();
  }

  return {
    block,
    canUpdate,
    setSubscription,
    unblock,
    UnblockModalHost,
  };
}
