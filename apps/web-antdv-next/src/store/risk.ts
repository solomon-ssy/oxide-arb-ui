import type {
  PositionView,
  RiskEngineStateView,
  SyncSnapshot,
} from '@vben/types';

import { ref } from 'vue';

import { POSITION_STATUSES } from '@vben/types';

import { defineStore } from 'pinia';

/**
 * Live risk-engine state: breaker snapshot + open positions. A WS
 * `risk.circuit_breaker` and `risk.position_update` frames carry the same
 * outbound views as REST/sync, so the store can apply them directly.
 */
export const useRiskStore = defineStore('oxide-risk', () => {
  const breaker = ref<null | RiskEngineStateView>(null);
  const positions = ref<PositionView[]>([]);

  function applyBreaker(next: RiskEngineStateView) {
    breaker.value = next;
  }

  function upsertPosition(position: PositionView) {
    const index = positions.value.findIndex(
      (p) => p.position_id === position.position_id,
    );
    if (position.status !== POSITION_STATUSES.open) {
      if (index !== -1) {
        positions.value.splice(index, 1);
      }
      return;
    }
    if (index === -1) {
      positions.value.push(position);
    } else {
      positions.value.splice(index, 1, position);
    }
  }

  function applySyncSnapshot(snapshot: SyncSnapshot) {
    if (snapshot.risk) {
      breaker.value = snapshot.risk;
    }
    if (snapshot.open_positions) {
      positions.value = snapshot.open_positions;
    }
  }

  function $reset() {
    breaker.value = null;
    positions.value = [];
  }

  return {
    $reset,
    applyBreaker,
    applySyncSnapshot,
    breaker,
    positions,
    upsertPosition,
  };
});
