import type { VbenFormSchema } from '#/adapter/form';

import {
  EXECUTION_MODES,
  SIDES,
  TRADE_BUSINESS_OUTCOMES,
  TRADE_STATES,
} from '@vben/types';

import { $t } from '#/locales';

/** Trade list filters: window / market / side / outcome / state / mode. */
export function useTradeSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'RangePicker',
      componentProps: {
        allowClear: true,
        showTime: true,
      },
      fieldName: 'range',
      label: $t('page.trades.search.range'),
    },
    {
      component: 'Input',
      componentProps: {
        allowClear: true,
        placeholder: '0x…',
      },
      fieldName: 'market_id',
      label: $t('page.trades.search.marketId'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(SIDES).map((value) => ({
          label: $t(`enum.side.${value}`),
          value,
        })),
      },
      fieldName: 'side',
      label: $t('page.trades.search.side'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(TRADE_BUSINESS_OUTCOMES).map((value) => ({
          label: $t(`enum.tradeOutcome.${value}`),
          value,
        })),
      },
      fieldName: 'business_outcome',
      label: $t('page.trades.search.outcome'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(TRADE_STATES).map((value) => ({
          label: $t(`enum.tradeState.${value}`),
          value,
        })),
      },
      fieldName: 'state',
      label: $t('page.trades.search.state'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(EXECUTION_MODES).map((value) => ({
          label: $t(`enum.executionMode.${value}`),
          value,
        })),
      },
      fieldName: 'execution_mode',
      label: $t('page.trades.search.mode'),
    },
  ];
}

/** Decision audit filters: time window only. */
export function useDecisionSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'RangePicker',
      componentProps: {
        allowClear: true,
        showTime: true,
      },
      fieldName: 'range',
      label: $t('page.trades.search.range'),
    },
  ];
}
