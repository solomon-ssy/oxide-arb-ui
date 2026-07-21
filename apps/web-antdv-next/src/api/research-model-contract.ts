import type { ErrorObject, ValidateFunction } from 'ajv';

import type {
  CreateModelSpecRequest,
  FeatureContractView,
  QuantModelSpecView,
  RunCpcvBacktestRequest,
} from '@vben/types';

import {
  validateCreateModelSpec as generatedValidateCreateModelSpec,
  validateFeatureContract as generatedValidateFeatureContract,
  validateModelSpec as generatedValidateModelSpec,
  validateRunCpcv as generatedValidateRunCpcv,
} from '@vben/types/research-model-api-validators';

/** A Rust-owned research-model API payload failed its generated wire schema. */
export class ResearchModelContractError extends Error {
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
      `${contract} violated the generated research-model API schema${violations.length > 0 ? ` (${violations.join(', ')})` : ''}`,
    );
    this.name = 'ResearchModelContractError';
    this.contract = contract;
    this.violations = violations;
  }
}

const validateCreateModelSpec =
  generatedValidateCreateModelSpec as ValidateFunction<CreateModelSpecRequest>;
const validateFeatureContract =
  generatedValidateFeatureContract as ValidateFunction<FeatureContractView>;
const validateModelSpec =
  generatedValidateModelSpec as ValidateFunction<QuantModelSpecView>;
const validateRunCpcv =
  generatedValidateRunCpcv as ValidateFunction<RunCpcvBacktestRequest>;

function decode<T>(
  contract: string,
  validate: ValidateFunction<T>,
  value: unknown,
): T {
  if (validate(value)) {
    return value;
  }
  throw new ResearchModelContractError(contract, validate.errors);
}

export function decodeCreateModelSpecRequest(
  value: unknown,
): CreateModelSpecRequest {
  return decode('CreateModelSpecRequest', validateCreateModelSpec, value);
}

export function decodeFeatureContract(value: unknown): FeatureContractView {
  return decode('FeatureContractView', validateFeatureContract, value);
}

export function decodeModelSpec(value: unknown): QuantModelSpecView {
  return decode('QuantModelSpecView', validateModelSpec, value);
}

export function decodeRunCpcvBacktestRequest(
  value: unknown,
): RunCpcvBacktestRequest {
  return decode('RunCpcvBacktestRequest', validateRunCpcv, value);
}
