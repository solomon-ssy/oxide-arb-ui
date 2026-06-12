import type {
  IsoDateTime,
  LivePnlView,
  PnlUpdateEvent,
  SyncSnapshot,
  UsdString,
} from '@vben/types';

import { ref } from 'vue';

import { defineStore } from 'pinia';

/** Upper bound on intraday points (1 point / 30s for a full UTC day). */
const INTRADAY_CAP = 2880;

/** One realtime point of today's PnL line: `[instant, daily realized pnl]`. */
export type IntradayPnlPoint = [IsoDateTime, UsdString];

/**
 * Live PnL: REST/`sync` snapshots set the full view; WS `pnl.update` deltas
 * patch it and extend today's intraday series for the dashboard curve.
 */
export const usePnlStore = defineStore('oxide-pnl', () => {
  const live = ref<LivePnlView | null>(null);
  const intradaySeries = ref<IntradayPnlPoint[]>([]);

  function applyLiveSnapshot(view: LivePnlView) {
    live.value = view;
  }

  function applyUpdate(event: PnlUpdateEvent, at: IsoDateTime) {
    if (live.value) {
      live.value.daily_pnl = event.daily;
      live.value.total_realized_pnl = event.total;
    } else {
      // No snapshot yet (REST still in flight): seed what the delta carries.
      live.value = {
        daily_loss_usd: '0',
        daily_pnl: event.daily,
        total_exposure: '0',
        total_realized_pnl: event.total,
      };
    }
    appendIntradayPoint(at, event.daily);
  }

  function appendIntradayPoint(at: IsoDateTime, daily: UsdString) {
    // The series renders "today" only — drop points once the UTC day rolls.
    const day = at.slice(0, 10);
    if (intradaySeries.value.length > 0) {
      const firstPoint = intradaySeries.value[0];
      if (firstPoint !== undefined && !firstPoint[0].startsWith(day)) {
        intradaySeries.value = [];
      }
    }
    intradaySeries.value.push([at, daily]);
    if (intradaySeries.value.length > INTRADAY_CAP) {
      intradaySeries.value.splice(
        0,
        intradaySeries.value.length - INTRADAY_CAP,
      );
    }
  }

  function applySyncSnapshot(snapshot: SyncSnapshot) {
    if (snapshot.pnl) {
      live.value = snapshot.pnl;
    }
  }

  function $reset() {
    live.value = null;
    intradaySeries.value = [];
  }

  return {
    $reset,
    appendIntradayPoint,
    applyLiveSnapshot,
    applySyncSnapshot,
    applyUpdate,
    intradaySeries,
    live,
  };
});
