import type {
  CircuitBreakerTrip,
  PositionView,
  RiskEngineStateView,
  SyncSnapshot,
} from '@vben/types';

import { ref } from 'vue';

import { defineStore } from 'pinia';

/**
 * Live risk-engine state: breaker snapshot + open positions. A WS
 * `risk.circuit_breaker` frame carries only `{level, reason}`, so consumers
 * record the trip here and refetch the full snapshot via REST.
 */
export const useRiskStore = defineStore('oxide-risk', () => {
  const breaker = ref<null | RiskEngineStateView>(null);
  const positions = ref<PositionView[]>([]);
  const lastTrip = ref<CircuitBreakerTrip | null>(null);

  function applyBreaker(next: RiskEngineStateView) {
    breaker.value = next;
  }

  function recordTrip(trip: CircuitBreakerTrip) {
    lastTrip.value = trip;
  }

  function upsertPosition(position: PositionView) {
    const index = positions.value.findIndex(
      (p) => p.position_id === position.position_id,
    );
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
    lastTrip.value = null;
  }

  return {
    $reset,
    applyBreaker,
    applySyncSnapshot,
    breaker,
    lastTrip,
    positions,
    recordTrip,
    upsertPosition,
  };
});
