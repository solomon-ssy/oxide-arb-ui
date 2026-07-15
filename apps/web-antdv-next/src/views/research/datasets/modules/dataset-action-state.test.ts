import type { TrainingDatasetView } from '@vben/types';

import { TRAINING_DATASET_STATUSES } from '@vben/types';

import { describe, expect, it } from 'vitest';

import { canTrainDataset } from './dataset-action-state';

const datasetHash = `blake3:${'a'.repeat(64)}`;
const featureHash = `blake3:${'b'.repeat(64)}`;
const factorHash = `blake3:${'c'.repeat(64)}`;
const labelHash = `blake3:${'d'.repeat(64)}`;

const readyDataset: TrainingDatasetView = {
  artifact_bytes_hash: `blake3:${'e'.repeat(64)}`,
  completed_at: '2026-07-10T11:00:00.000Z',
  coverage_json: null,
  created_at: '2026-07-10T10:00:00.000Z',
  dataset_hash: datasetHash,
  factor_schema_hash: factorHash,
  failure_detail: null,
  feature_schema_hash: featureHash,
  feature_schema_version: 6,
  horizons_secs: [3600],
  knowledge_lag_secs: 10,
  label_schema_hash: labelHash,
  manifest: {
    factor_schema_hash: factorHash,
    feature_schema_hash: featureHash,
    format_version: 5,
    horizons_secs: [3600],
    knowledge_lag_secs: 10,
    label_schema_hash: labelHash,
    model_spec_id: 'model-spec',
    profile_ref: {
      content_hash: `blake3:${'2'.repeat(64)}`,
      id: 'pooled_1h_control',
      version: 1,
    },
    purpose: 'training',
    research_program_hash: `blake3:${'3'.repeat(64)}`,
    runtime_config_version_id: '01900000-0000-7000-8000-000000000002',
    sample_count: 20,
    sample_interval_secs: 300,
    semantic_dataset_hash: datasetHash,
    source_fingerprint: `blake3:${'f'.repeat(64)}`,
    source_slice: {
      manifest_hash: `blake3:${'4'.repeat(64)}`,
      manifest_uri: 's3://source-slices/control.json',
    },
    trade_policy_artifact_id: null,
    trade_policy_hash: null,
    training_dataset_id: '01900000-0000-7000-8000-000000000001',
    window_end: '2026-07-10T10:00:00.000Z',
    window_start: '2026-07-09T10:00:00.000Z',
  },
  manifest_hash: `blake3:${'1'.repeat(64)}`,
  model_spec_id: 'model-spec',
  parquet_uri: 's3://datasets/frozen.parquet',
  purpose: 'training',
  runtime_config_version_id: '01900000-0000-7000-8000-000000000002',
  sample_count: 20,
  sample_interval_secs: 300,
  sample_sources: ['historical_pit'],
  status: 'ready',
  training_dataset_id: '01900000-0000-7000-8000-000000000001',
  window_end: '2026-07-10T10:00:00.000Z',
  window_start: '2026-07-09T10:00:00.000Z',
};

describe('canTrainDataset', () => {
  it('offers Train only for an authorized Ready dataset with a bound v5 manifest', () => {
    for (const status of Object.values(TRAINING_DATASET_STATUSES)) {
      expect(canTrainDataset(true, { ...readyDataset, status })).toBe(
        status === TRAINING_DATASET_STATUSES.ready,
      );
    }
    expect(canTrainDataset(false, readyDataset)).toBe(false);
  });

  it('fails closed for legacy rows and any manifest-ledger mismatch', () => {
    const manifest = readyDataset.manifest;
    if (!manifest) {
      throw new Error('test fixture requires a v5 manifest');
    }
    expect(canTrainDataset(true, { ...readyDataset, manifest: null })).toBe(
      false,
    );
    expect(
      canTrainDataset(true, {
        ...readyDataset,
        manifest: {
          ...manifest,
          semantic_dataset_hash: `blake3:${'9'.repeat(64)}`,
        },
      }),
    ).toBe(false);
  });
});
