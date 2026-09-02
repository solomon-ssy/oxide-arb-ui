import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const component = readFileSync(
  resolve(
    process.cwd(),
    'apps/web-antdv-next/src/views/execution/post-trade/modules/settlement/modules/settlement-redeem-detail-drawer.vue',
  ),
  'utf8',
);
const types = readFileSync(
  resolve(process.cwd(), 'packages/types/src/settlement-redeem.ts'),
  'utf8',
);

describe('settlement redeem detail contract', () => {
  it('routes inventory and redeemed rows by strategy lot identity', () => {
    expect(component).toContain("dataIndex: 'strategy_position_lot_id'");
    expect(component).toContain(
      'positionOpenPath(record.strategy_position_lot_id)',
    );
    expect(component).not.toMatch(/\bposition_id\b/);
    expect(types).toContain('strategy_position_lot_id: UuidString');
    expect(types).not.toMatch(/\bposition_id:\s*UuidString/);
  });
});
