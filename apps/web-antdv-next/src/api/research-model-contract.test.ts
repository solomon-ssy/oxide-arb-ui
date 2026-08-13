import { describe, expect, it } from 'vitest';

import {
  decodeCreateModelSpecRequest,
  decodeFeatureContract,
  decodeModelSpec,
  decodeRunCpcvBacktestRequest,
  ResearchModelContractError,
} from './research-model-contract';

const contentHash = `blake3:${'a'.repeat(64)}`;
const modelSpecId = '01900000-0000-7000-8000-000000000001';
const policyArtifactId = '01900000-0000-7000-8000-000000000002';

function modelSpec() {
  return {
    created_at: '2026-07-21T00:00:00Z',
    created_by_label: 'risk-owner',
    created_by_role: 'risk_owner',
    created_by_user_id: null,
    definition_hash: contentHash,
    feature_schema_version: 1,
    input_contract: {
      inputs: [{ feature_name: 'book.mid', requiredness: 'required' }],
    },
    label_schema_version: 1,
    model_family: 'weighted_factor',
    model_spec_id: modelSpecId,
    name: 'governed-baseline',
    prediction_horizon_secs: 86_400,
    reason: 'author the baseline',
    thesis: {
      hypothesis: 'book state predicts resolution',
      limitations: ['Polymarket only'],
      summary: 'governed baseline',
    },
    training_contract: {
      evaluation_trade_policy_artifact_id: policyArtifactId,
      target: { kind: 'outcome_payout' },
      validation_folds: 5,
    },
  };
}

describe('generated research-model API decoder', () => {
  it('accepts backend-open feature provenance strings without a UI union fork', () => {
    const decoded = decodeFeatureContract({
      feature_schema_hash: contentHash,
      feature_schema_version: 1,
      features: [
        {
          compute_revision: 1,
          family: 'domain',
          name: 'domain.future_source',
          null_policy: { policy: 'optional' },
          point_in_time_rule: 'new_server_owned_rule',
          source: 'new_server_owned_source',
          staleness_policy: 'new_server_owned_policy',
          unit: 'server_owned_unit',
          value_kind: 'decimal',
        },
      ],
    });

    expect(decoded.features[0]?.source).toBe('new_server_owned_source');
  });

  it('preserves the typed target and evaluation-policy binding', () => {
    const decoded = decodeModelSpec(modelSpec());
    expect(decoded.training_contract.target).toEqual({
      kind: 'outcome_payout',
    });
    expect(decoded.training_contract.evaluation_trade_policy_artifact_id).toBe(
      policyArtifactId,
    );

    const spec = modelSpec();
    expect(
      decodeCreateModelSpecRequest({
        feature_schema_version: spec.feature_schema_version,
        input_contract: spec.input_contract,
        label_schema_version: spec.label_schema_version,
        model_family: spec.model_family,
        name: spec.name,
        prediction_horizon_secs: spec.prediction_horizon_secs,
        reason: spec.reason,
        thesis: spec.thesis,
        training_contract: spec.training_contract,
      }).training_contract.evaluation_trade_policy_artifact_id,
    ).toBe(policyArtifactId);
  });

  it('rejects unknown model fields instead of silently accepting contract drift', () => {
    expect(() =>
      decodeModelSpec({ ...modelSpec(), client_only_fallback: true }),
    ).toThrow(ResearchModelContractError);
  });

  it('accepts only the generated CPCV request and rejects client-owned semantics', () => {
    const request = {
      decision_policy_snapshot_id: '01900000-0000-7000-8000-000000000003',
      reason: 'validate the frozen model',
      training_dataset_id: '01900000-0000-7000-8000-000000000004',
    };
    expect(decodeRunCpcvBacktestRequest(request)).toEqual(request);
    expect(() =>
      decodeRunCpcvBacktestRequest({
        ...request,
        model_family: 'weighted_factor',
      }),
    ).toThrow(ResearchModelContractError);
  });
});
