import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useGovernanceCrosslink } from '#/shared/composables/use-governance-crosslink';

const push = vi.fn();

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}));

describe('useGovernanceCrosslink', () => {
  beforeEach(() => {
    push.mockReset();
  });

  it('opens audit page with event and sequence', () => {
    const { openAuditAt } = useGovernanceCrosslink();
    openAuditAt({ eventId: 'evt-1', sequence: 42 });
    expect(push).toHaveBeenCalledWith({
      path: '/audit',
      query: { event_id: 'evt-1', sequence: '42' },
    });
  });

  it('opens operation log filtered by audit event', () => {
    const { openOperationLogByAuditEvent } = useGovernanceCrosslink();
    openOperationLogByAuditEvent('evt-2', 7);
    expect(push).toHaveBeenCalledWith({
      path: '/operation-log',
      query: {
        governance_audit_event_id: 'evt-2',
        governance_audit_sequence: '7',
      },
    });
  });

  it('opens operation log filtered by request id', () => {
    const { openOperationLogByRequestId } = useGovernanceCrosslink();
    openOperationLogByRequestId('req-9');
    expect(push).toHaveBeenCalledWith({
      path: '/operation-log',
      query: { request_id: 'req-9' },
    });
  });
});
