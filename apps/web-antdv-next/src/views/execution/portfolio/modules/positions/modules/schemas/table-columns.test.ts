import type { PositionView } from '@vben/types';

import { describe, expect, it, vi } from 'vitest';

import { usePositionColumns } from './table-columns';

vi.mock('#/locales', () => ({ $t: (key: string) => key }));
vi.mock('#/shared/presentation/enum-options', () => ({
  categoryOptions: () => [],
}));
vi.mock('#/shared/table/cell-operation-presets', () => ({
  iconOp: (code: string, label: string) => ({ code, label }),
}));

const RECOVERY_POSITION = {
  avg_price: '0.5',
  closed_at: null,
  cost_usd: '5',
  market_id: 'market-1',
  opened_at: '2026-08-30T00:00:00Z',
  order_intent_id: null,
  origin_kind: 'account_recovery_incident',
  position_plane: 'system_lot',
  realized_pnl_usd: '0',
  recommendation_id: null,
  recovery_incident_id: 'recovery-1',
  shares: '10',
  state: 'open',
  strategy_position_lot_id: 'lot-1',
  token_id: 'token-1',
  updated_at: '2026-08-30T00:00:00Z',
} satisfies PositionView;

interface RouteCell {
  props: {
    to: (row: PositionView) => string | undefined;
  };
}

interface OperationCell {
  attrs: {
    nameField: string;
  };
}

describe('position table column contract', () => {
  const columns = usePositionColumns(() => undefined) ?? [];
  const column = (field: string) => {
    const result = columns.find((candidate) => candidate.field === field);
    if (!result) throw new Error(`missing position column: ${field}`);
    return result;
  };

  it('uses strategy lot identity for the row deep link and operation owner', () => {
    const identity = column('strategy_position_lot_id');
    const routeCell = identity.cellRender as RouteCell;
    const operation = column('operation').cellRender as OperationCell;

    expect(routeCell.props.to(RECOVERY_POSITION)).toBe(
      '/execution/portfolio?module=positions&entity=position&id=lot-1',
    );
    expect(operation.attrs.nameField).toBe('strategy_position_lot_id');
  });

  it('renders recovery provenance and does not invent an intent link', () => {
    const intent = column('order_intent_id').cellRender as RouteCell;

    expect(column('origin_kind').cellRender).toMatchObject({
      props: { enum: 'StrategyPositionOriginKind' },
    });
    expect(column('recovery_incident_id').cellRender).toMatchObject({
      name: 'CellCopy',
    });
    expect(intent.props.to(RECOVERY_POSITION)).toBeUndefined();
  });
});
