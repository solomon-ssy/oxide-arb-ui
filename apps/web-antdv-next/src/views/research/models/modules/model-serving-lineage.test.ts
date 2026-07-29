import type { FactorDefinitionDetailView, ModelDetailView } from '@vben/types';

import { describe, expect, it } from 'vitest';

import {
  factorServingUsage,
  modelServingCommitments,
  modelServingLineage,
} from './model-serving-lineage';

describe('read-only serving lineage presentation', () => {
  it('preserves exact factor revision hashes and serving contract identity', () => {
    const detail = {
      serving_contract_hash: 'blake3:serving',
      serving_contract: {
        contract_hash: 'blake3:serving',
        contract_version: 2,
        bindings: {
          capability_registry_hashes: ['blake3:capability'],
          factors: {
            plane: {
              definitions: [
                {
                  definition_hash: 'blake3:factor-definition',
                  factor_definition_id: 'factor-1',
                  feature_contract_hash: 'blake3:feature-contract',
                  input_schema_version: 1,
                  output_schema_version: 1,
                  revision_version: 1,
                  definition: {},
                },
              ],
              factor_schema_hash: 'blake3:factor-schema',
              format_version: 1,
            },
            bias_table: null,
          },
          required_domain_families: ['crypto'],
        },
      },
      evaluation_lineage: {
        has_next: true,
        items: [],
        page: 1,
        size: 20,
        total: 3,
      },
      promotion_lineage: [{ audit_id: 'promotion-audit-1' }],
    } as unknown as ModelDetailView;

    expect(modelServingLineage(detail)).toEqual({
      capabilityRegistryHashes: ['blake3:capability'],
      contractHash: 'blake3:serving',
      contractVersion: 2,
      evaluationCount: 3,
      evaluationHasNext: true,
      evaluationPage: 1,
      evaluationSize: 20,
      factorDefinitions: [
        {
          definition_hash: 'blake3:factor-definition',
          factor_definition_id: 'factor-1',
          feature_contract_hash: 'blake3:feature-contract',
          input_schema_version: 1,
          output_schema_version: 1,
          revision_version: 1,
          definition: {},
        },
      ],
      factorSchemaHash: 'blake3:factor-schema',
      promotionCount: 1,
      requiredDomainFamilies: ['crypto'],
    });
  });

  it('preserves every content-addressed serving commitment', () => {
    const profileArtifact = (kind: string) => ({
      content_hash: `blake3:profile-${kind}`,
      kind,
      profile_artifact_id: `profile-${kind}`,
    });
    const detail = {
      serving_contract: {
        bindings: {
          dataset: {
            artifact_bytes_hash: 'blake3:dataset-bytes',
            manifest_hash: 'blake3:dataset-manifest',
          },
          factors: {
            bias_table: {
              content_hash: 'blake3:bias-table',
            },
          },
          model: {
            calibration: {
              content_hash: 'blake3:model-calibration',
            },
            estimator: {
              estimator_kind: 'classical',
              model_payload_hash: 'blake3:model-payload',
              serialized_model_hash: 'blake3:serialized-model',
            },
            model_spec_definition_hash: 'blake3:model-spec',
            profile_ref: {
              content_hash: 'blake3:research-profile',
            },
          },
          policy_snapshot: {
            profile_artifacts: {
              domain: profileArtifact('domain'),
              features: profileArtifact('feature'),
              research_method: profileArtifact('research_method'),
              scoring: profileArtifact('scoring'),
            },
            snapshot_hash: 'blake3:policy-snapshot',
          },
          schemas: {
            feature_schema_hash: 'blake3:feature-schema',
            label_schema_hash: 'blake3:label-schema',
          },
          trade_policy: {
            content_hash: 'blake3:trade-policy',
          },
          transform: {
            input_contract_hash: 'blake3:input-contract',
            input_transform_hash: 'blake3:input-transform',
            training_dataset_hash: 'blake3:training-dataset',
            training_input_hash: 'blake3:training-input',
          },
        },
      },
    } as unknown as ModelDetailView;

    expect(modelServingCommitments(detail)).toEqual({
      biasTableHash: 'blake3:bias-table',
      datasetBytesHash: 'blake3:dataset-bytes',
      datasetManifestHash: 'blake3:dataset-manifest',
      featureSchemaHash: 'blake3:feature-schema',
      inputContractHash: 'blake3:input-contract',
      inputTransformHash: 'blake3:input-transform',
      labelSchemaHash: 'blake3:label-schema',
      modelCalibrationHash: 'blake3:model-calibration',
      modelPayloadHash: 'blake3:model-payload',
      modelSpecDefinitionHash: 'blake3:model-spec',
      policySnapshotHash: 'blake3:policy-snapshot',
      profileArtifacts: [
        profileArtifact('feature'),
        profileArtifact('scoring'),
        profileArtifact('domain'),
        profileArtifact('research_method'),
      ],
      profileContentHash: 'blake3:research-profile',
      serializedModelHash: 'blake3:serialized-model',
      tradePolicyHash: 'blake3:trade-policy',
      trainingDatasetHash: 'blake3:training-dataset',
      trainingInputHash: 'blake3:training-input',
    });
  });

  it('keeps factor serving usage independently paginated and read-only', () => {
    const detail = {
      definition: {
        factor_definition_id: 'factor-1',
        definition_hash: 'blake3:definition',
      },
      serving_usage: {
        has_next: true,
        items: [
          {
            model_version_id: 'model-1',
            serving_contract_hash: 'blake3:serving',
          },
        ],
        page: 1,
        size: 20,
        total: 21,
      },
    } as FactorDefinitionDetailView;

    expect(factorServingUsage(detail)).toMatchObject({
      hasNext: true,
      items: [
        {
          model_version_id: 'model-1',
          serving_contract_hash: 'blake3:serving',
        },
      ],
      total: 21,
    });
  });
});
