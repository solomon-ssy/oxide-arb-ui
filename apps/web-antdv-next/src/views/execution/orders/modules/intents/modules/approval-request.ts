import type { ApproveOrderIntentRequest, OrderIntentView } from '@vben/types';

/** Build the tagged approval wire without inferring or converting its unit. */
export function buildApproveIntentRequest(
  intent: OrderIntentView,
  fields: Record<string, string | undefined>,
  reason: string,
): ApproveOrderIntentRequest {
  return {
    override_amount: fields.override_amount
      ? {
          unit: intent.entry_order.amount.unit,
          value: fields.override_amount,
        }
      : undefined,
    override_price: fields.override_price,
    reason,
  };
}
