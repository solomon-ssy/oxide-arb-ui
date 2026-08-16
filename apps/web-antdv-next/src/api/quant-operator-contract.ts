import type { ErrorObject, ValidateFunction } from 'ajv';

import type {
  AccountSnapshotView,
  CreateIntentRequest,
  EquitySnapshotView,
  IncentiveReconciliationView,
  LiveAccountView,
  OrderIntentView,
  QuantRecommendationView,
  QuantReportDetailView,
  QuantReportView,
  ReportDiffView,
  VenueIncentiveEventView,
} from '@vben/types';

import {
  validateAccountSnapshot as generatedValidateAccountSnapshot,
  validateCreateIntent as generatedValidateCreateIntent,
  validateEquitySnapshot as generatedValidateEquitySnapshot,
  validateExecutionConfirmation as generatedValidateExecutionConfirmation,
  validateIncentiveEvent as generatedValidateIncentiveEvent,
  validateIncentiveReconciliation as generatedValidateIncentiveReconciliation,
  validateLiveAccount as generatedValidateLiveAccount,
  validateRecommendation as generatedValidateRecommendation,
  validateReportDetail as generatedValidateReportDetail,
  validateReportDiff as generatedValidateReportDiff,
  validateReportListRow as generatedValidateReportListRow,
} from '@vben/types/quant-operator-api-validators';

/** A Rust-owned operator API payload violated its generated wire contract. */
export class QuantOperatorContractError extends Error {
  readonly contract: string;
  readonly violations: readonly string[];

  constructor(
    contract: string,
    errors: null | readonly ErrorObject[] | undefined,
  ) {
    const violations = (errors ?? []).map(
      ({ instancePath, keyword }) => `${instancePath || '/'}:${keyword}`,
    );
    super(
      `${contract} violated the generated quant operator API schema${violations.length > 0 ? ` (${violations.join(', ')})` : ''}`,
    );
    this.name = 'QuantOperatorContractError';
    this.contract = contract;
    this.violations = violations;
  }
}

function decode<T>(
  contract: string,
  validate: ValidateFunction<T>,
  value: unknown,
): T {
  if (validate(value)) return value;
  throw new QuantOperatorContractError(contract, validate.errors);
}

function decoder<T>(
  contract: string,
  validate: ValidateFunction<T>,
): (value: unknown) => T {
  return (value) => decode(contract, validate, value);
}

function boundaryValidator<T>(validate: unknown): ValidateFunction<T> {
  return validate as ValidateFunction<T>;
}

const accountSnapshotDecoder = decoder(
  'AccountSnapshotView',
  boundaryValidator<AccountSnapshotView>(generatedValidateAccountSnapshot),
);
const createIntentDecoder = decoder(
  'CreateIntentRequest',
  boundaryValidator<CreateIntentRequest>(generatedValidateCreateIntent),
);
const equitySnapshotDecoder = decoder(
  'EquitySnapshotView',
  boundaryValidator<EquitySnapshotView>(generatedValidateEquitySnapshot),
);
const executionConfirmationDecoder = decoder(
  'OrderIntentView',
  boundaryValidator<OrderIntentView>(generatedValidateExecutionConfirmation),
);
const incentiveEventDecoder = decoder(
  'VenueIncentiveEventView',
  boundaryValidator<VenueIncentiveEventView>(generatedValidateIncentiveEvent),
);
const incentiveReconciliationDecoder = decoder(
  'IncentiveReconciliationView',
  boundaryValidator<IncentiveReconciliationView>(
    generatedValidateIncentiveReconciliation,
  ),
);
const liveAccountDecoder = decoder(
  'LiveAccountView',
  boundaryValidator<LiveAccountView>(generatedValidateLiveAccount),
);
const recommendationDecoder = decoder(
  'QuantRecommendationView',
  boundaryValidator<QuantRecommendationView>(generatedValidateRecommendation),
);
const reportDetailDecoder = decoder(
  'QuantReportDetailView',
  boundaryValidator<QuantReportDetailView>(generatedValidateReportDetail),
);
const reportDiffDecoder = decoder(
  'ReportDiffView',
  boundaryValidator<ReportDiffView>(generatedValidateReportDiff),
);
const reportListRowDecoder = decoder(
  'QuantReportView',
  boundaryValidator<QuantReportView>(generatedValidateReportListRow),
);

export const decodeAccountSnapshot = accountSnapshotDecoder;
export const decodeCreateIntentRequest = createIntentDecoder;
export const decodeEquitySnapshot = equitySnapshotDecoder;
export const decodeExecutionConfirmation = executionConfirmationDecoder;
export const decodeIncentiveEvent = incentiveEventDecoder;
export const decodeIncentiveReconciliation = incentiveReconciliationDecoder;
export const decodeLiveAccount = liveAccountDecoder;
export const decodeRecommendation = recommendationDecoder;
export const decodeReportDetail = reportDetailDecoder;
export const decodeReportDiff = reportDiffDecoder;
export const decodeReportListRow = reportListRowDecoder;

export function decodeMany<T>(
  values: unknown[],
  decodeValue: (value: unknown) => T,
): T[] {
  return values.map((value) => decodeValue(value));
}
