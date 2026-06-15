import { useRouter } from 'vue-router';

/** Deep-link helpers between Operation Log and Audit Chain pages. */
export function useGovernanceCrosslink() {
  const router = useRouter();

  function openAuditAt(params: { eventId?: string; sequence?: number }) {
    void router.push({
      path: '/audit',
      query: {
        ...(params.eventId ? { event_id: params.eventId } : {}),
        ...(params.sequence === null || params.sequence === undefined
          ? {}
          : { sequence: String(params.sequence) }),
      },
    });
  }

  function openOperationLogByRequestId(requestId: string) {
    void router.push({
      path: '/operation-log',
      query: { request_id: requestId },
    });
  }

  function openOperationLogByAuditEvent(eventId: string, sequence?: number) {
    void router.push({
      path: '/operation-log',
      query: {
        governance_audit_event_id: eventId,
        ...(sequence === null || sequence === undefined
          ? {}
          : { governance_audit_sequence: String(sequence) }),
      },
    });
  }

  return {
    openAuditAt,
    openOperationLogByAuditEvent,
    openOperationLogByRequestId,
  };
}
