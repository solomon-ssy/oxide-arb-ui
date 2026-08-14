import type { ModelRouteActivationReceiptView } from '@vben/types';

import { describe, expect, it } from 'vitest';

import { linkedRollbackState } from './linked-rollback-state';

function receipt(): ModelRouteActivationReceiptView {
  return {
    activated_by_role: 'operator',
    activated_by_user_id: '00000000-0000-0000-0000-000000000001',
    activated_by_username: 'operator',
    activated_model_routing_revision_id: '00000000-0000-0000-0000-000000000101',
    activated_model_version_id: '00000000-0000-0000-0000-000000000201',
    activated_route_generation: 2,
    audit_event_id: '00000000-0000-0000-0000-000000000301',
    execution_authority_unchanged: true,
    feedback_cycle_id: '00000000-0000-0000-0000-000000000401',
    model_governance_audit_id: '00000000-0000-0000-0000-000000000302',
    outbox_event_id: '00000000-0000-0000-0000-000000000301',
    permit_issued_by_role: 'operator',
    permit_issued_by_user_id: '00000000-0000-0000-0000-000000000001',
    permit_issued_by_username: 'operator',
    policy_activation_id: '00000000-0000-0000-0000-000000000303',
    previous_model_version_id: '00000000-0000-0000-0000-000000000202',
    previous_route_generation: 1,
    promotion_permit_id: '00000000-0000-0000-0000-000000000304',
    rollback_target: {
      activated_model_version_id: '00000000-0000-0000-0000-000000000201',
      restored_model_version_id: '00000000-0000-0000-0000-000000000202',
      rollback_target_revision_hash: 'blake3:rollback',
      rollback_target_revision_id: '00000000-0000-0000-0000-000000000102',
      route: 'weather',
      shadow_cleared: true,
    },
    route: 'weather',
    server_timestamp: '2026-07-01T00:00:00Z',
    transaction_hash: 'blake3:transaction',
  };
}

describe('linkedRollbackState', () => {
  it('only marks the exact activated revision as actionable', () => {
    const activation = receipt();
    expect(
      linkedRollbackState(
        activation.activated_model_routing_revision_id,
        activation,
      ),
    ).toBe('actionable');
  });

  it('recognizes that the sanitized rollback target is already active', () => {
    const activation = receipt();
    expect(
      linkedRollbackState(
        activation.rollback_target.rollback_target_revision_id,
        activation,
      ),
    ).toBe('restored');
  });

  it('does not preselect a historical target after later routing changes', () => {
    expect(
      linkedRollbackState('00000000-0000-0000-0000-000000000999', receipt()),
    ).toBe('superseded');
    expect(linkedRollbackState(null, receipt())).toBe('unavailable');
    expect(
      linkedRollbackState('00000000-0000-0000-0000-000000000101', null),
    ).toBe('unavailable');
  });
});
