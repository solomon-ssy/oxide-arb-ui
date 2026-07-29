import type {
  DatasetCohortManifest,
  DatasetPurpose,
  DatasetSourceLineage,
  TrainingDatasetView,
} from '@vben/types';

import {
  DATASET_PURPOSES,
  FEEDBACK_COHORTS,
  MODEL_FAMILIES,
} from '@vben/types';

const DATASET_ID = '01900000-0000-7000-8000-000000000001';
const POLICY_ID = '01900000-0000-7000-8000-000000000002';
const SOURCE_SLICE_ID = '01900000-0000-7000-8000-000000000003';
const WINDOW_START = '2026-07-09T10:00:00.000Z';
const WINDOW_END = '2026-07-10T10:00:00.000Z';
const PIT_CUTOFF = '2026-07-10T11:00:00.000Z';

const datasetHash = `blake3:${'a'.repeat(64)}`;
const featureHash = `blake3:${'b'.repeat(64)}`;
const factorHash = `blake3:${'c'.repeat(64)}`;
const labelHash = `blake3:${'d'.repeat(64)}`;
const modelSpecDefinitionHash = `blake3:${'6'.repeat(64)}`;
const capabilityHash = `blake3:${'7'.repeat(64)}`;

const profileRef = {
  content_hash: `blake3:${'2'.repeat(64)}`,
  id: 'pooled_1h_control',
  version: 1,
};
const profileArtifactId = 'pooled_1h_control@1:fixture';

function sourceLineage(): DatasetSourceLineage {
  return {
    capability_registry_hashes: [capabilityHash],
    decision_policy_snapshot_id: POLICY_ID,
    format_version: 1,
    pit_cutoff: PIT_CUTOFF,
    reader_contract_version: 'reader@2',
    research_profile_artifact_id: profileArtifactId,
    research_program_hash: `blake3:${'3'.repeat(64)}`,
    runtime_config_hash: `blake3:${'8'.repeat(64)}`,
    schema_contract_version: 'source-slice@2',
    source_schema_hash: `blake3:${'9'.repeat(64)}`,
    source_slice: {
      manifest_hash: `blake3:${'4'.repeat(64)}`,
      manifest_uri: 's3://source-slices/control.json',
    },
    source_slice_id: SOURCE_SLICE_ID,
    source_slice_identity_hash: `blake3:${'5'.repeat(64)}`,
    source_window_end: WINDOW_END,
    source_window_start: WINDOW_START,
  };
}

function modelLearningCohort(): DatasetCohortManifest {
  return {
    artifact: {
      bytes_hash: `blake3:${'1'.repeat(64)}`,
      row_count: 20,
      schema_hash: `blake3:${'2'.repeat(64)}`,
      source_hash: `blake3:${'3'.repeat(64)}`,
      uri: 's3://feedback-cohorts/model-learning.parquet',
    },
    capability_registry_hashes: [capabilityHash],
    cohort: FEEDBACK_COHORTS.modelLearning,
    counts: {
      candidate_count: 25,
      censor_counts: [{ count: 2, reason: 'resolution_unavailable_at_cutoff' }],
      eligible_count: 22,
      exclusion_counts: [{ count: 1, reason: 'recommendation_not_published' }],
      included_count: 20,
    },
    format_version: 1,
    window: {
      cutoff: WINDOW_END,
      profile_ref: { ...profileRef },
      window_start: WINDOW_START,
    },
  };
}

/** Build a fresh, internally consistent v3 dataset wire fixture. */
export function datasetFixture(
  purpose: DatasetPurpose = DATASET_PURPOSES.training,
): TrainingDatasetView {
  const evaluation = purpose === DATASET_PURPOSES.evaluation;
  const datasetCohort = evaluation ? modelLearningCohort() : null;
  const manifestCohort = evaluation ? modelLearningCohort() : null;
  return {
    artifact_bytes_hash: `blake3:${'e'.repeat(64)}`,
    cohort_manifest: datasetCohort,
    completed_at: '2026-07-10T12:00:00.000Z',
    coverage: null,
    created_at: '2026-07-10T10:00:00.000Z',
    dataset_hash: datasetHash,
    decision_policy_snapshot_id: POLICY_ID,
    factor_serving_plane: {
      definitions: [],
      factor_schema_hash: factorHash,
      format_version: 1,
    },
    factor_schema_hash: factorHash,
    failure_detail: null,
    feature_schema_hash: featureHash,
    feature_schema_version: 1,
    feedback_cohort: evaluation ? FEEDBACK_COHORTS.modelLearning : null,
    horizons_secs: [3600, 86_400],
    knowledge_lag_secs: 10,
    label_schema_hash: labelHash,
    manifest: {
      cohort_manifest: manifestCohort,
      factor_serving_plane: {
        definitions: [],
        factor_schema_hash: factorHash,
        format_version: 1,
      },
      feature_schema_hash: featureHash,
      feature_schema_version: 1,
      format_version: 3,
      horizons_secs: [3600, 86_400],
      knowledge_lag_secs: 10,
      label_schema_hash: labelHash,
      model_family: MODEL_FAMILIES.classicalLogisticRegression,
      model_spec_definition_hash: modelSpecDefinitionHash,
      model_spec_id: 'model-spec',
      purpose,
      sample_count: 20,
      sample_interval_secs: 300,
      semantic_dataset_hash: datasetHash,
      source_fingerprint: `blake3:${'f'.repeat(64)}`,
      source_lineage: sourceLineage(),
      trade_policy_artifact_id: null,
      trade_policy_hash: null,
      training_dataset_id: DATASET_ID,
      window_end: WINDOW_END,
      window_start: WINDOW_START,
    },
    manifest_hash: `blake3:${'0'.repeat(64)}`,
    model_family: MODEL_FAMILIES.classicalLogisticRegression,
    model_spec_definition_hash: modelSpecDefinitionHash,
    model_spec_id: 'model-spec',
    parquet_uri: 's3://datasets/frozen.parquet',
    pit_cutoff: PIT_CUTOFF,
    purpose,
    research_profile_artifact_id: profileArtifactId,
    sample_count: 20,
    sample_interval_secs: 300,
    sample_sources: ['historical_pit'],
    source_lineage: sourceLineage(),
    source_slice_id: SOURCE_SLICE_ID,
    status: 'ready',
    training_dataset_id: DATASET_ID,
    window_end: WINDOW_END,
    window_start: WINDOW_START,
  };
}
