import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd());
const sources = [
  'apps/web-antdv-next/src/views/execution/orders/modules/flow/use-execution-flow.ts',
  'apps/web-antdv-next/src/views/execution/portfolio/modules/positions/index.vue',
  'apps/web-antdv-next/src/views/execution/portfolio/modules/positions/modules/position-detail-drawer.vue',
  'apps/web-antdv-next/src/views/execution/portfolio/modules/positions/modules/schemas/table-columns.ts',
  'packages/types/src/position.ts',
].map((path) => readFileSync(resolve(root, path), 'utf8'));
const combined = sources.join('\n');
const positionTypes = sources.at(-1) ?? '';

describe('position wire clean-break contract', () => {
  it('uses the canonical lot identity everywhere without an alias or fallback', () => {
    expect(combined).not.toMatch(/\bposition_id\b/);
    expect(positionTypes).toContain('strategy_position_lot_id: UuidString');
    expect(combined).toContain("keyField: 'strategy_position_lot_id'");
    expect(combined).toContain("nameField: 'strategy_position_lot_id'");
    expect(combined).toContain('position.strategy_position_lot_id');
  });

  it('mirrors nullable ownership and recovery provenance from the backend wire', () => {
    expect(positionTypes).toContain(
      "origin_kind: EnumValue<'StrategyPositionOriginKind'>",
    );
    expect(positionTypes).toContain('order_intent_id: null | UuidString');
    expect(positionTypes).toContain('recovery_incident_id: null | UuidString');
    expect(positionTypes).toContain('recommendation_id: null | UuidString');
    expect(positionTypes).toContain(
      'exit_monitor_observation?: ExitMonitorObservationView',
    );
    expect(combined).toContain('v-if="position.order_intent_id"');
    expect(combined).toContain('v-if="position.recommendation_id"');
    expect(combined).toContain('position.recovery_incident_id');
    expect(combined).toContain('orderIntentOpenPath(position.order_intent_id)');
    expect(combined).toContain(
      'recommendationOpenPath(position.recommendation_id)',
    );
    expect(combined).not.toContain('module=recommendations');
  });
});
