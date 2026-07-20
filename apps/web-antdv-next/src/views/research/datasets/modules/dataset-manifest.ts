import type { TrainingDatasetView } from '@vben/types';

export const DATASET_ARTIFACT_FORMAT_VERSION = 1;

export interface DatasetManifestBindingIssue {
  actual: unknown;
  expected: unknown;
  field: string;
}

function sameOrderedValues(left: unknown[], right: unknown[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

/**
 * Verify the transparent API projection against the dataset ledger fields the
 * manifest freezes. This is a UI fail-closed affordance only; the server's
 * integrity gate and artifact loader remain authoritative.
 */
export function datasetManifestBindingIssues(
  dataset: TrainingDatasetView,
): DatasetManifestBindingIssue[] {
  const manifest = dataset.manifest;
  if (!manifest) {
    return [];
  }

  const issues: DatasetManifestBindingIssue[] = [];
  const compare = (field: string, actual: unknown, expected: unknown) => {
    if (actual !== expected) {
      issues.push({ actual, expected, field });
    }
  };

  compare(
    'format_version',
    manifest.format_version,
    DATASET_ARTIFACT_FORMAT_VERSION,
  );
  compare(
    'training_dataset_id',
    manifest.training_dataset_id,
    dataset.training_dataset_id,
  );
  compare('model_spec_id', manifest.model_spec_id, dataset.model_spec_id);
  compare(
    'model_spec_definition_hash',
    manifest.model_spec_definition_hash,
    dataset.model_spec_definition_hash,
  );
  compare(
    'decision_policy_snapshot_id',
    manifest.decision_policy_snapshot_id,
    dataset.decision_policy_snapshot_id,
  );
  compare('window_start', manifest.window_start, dataset.window_start);
  compare('window_end', manifest.window_end, dataset.window_end);
  compare('purpose', manifest.purpose, dataset.purpose);
  compare(
    'knowledge_lag_secs',
    manifest.knowledge_lag_secs,
    dataset.knowledge_lag_secs,
  );
  compare(
    'sample_interval_secs',
    manifest.sample_interval_secs,
    dataset.sample_interval_secs,
  );
  if (!sameOrderedValues(manifest.horizons_secs, dataset.horizons_secs)) {
    issues.push({
      actual: manifest.horizons_secs,
      expected: dataset.horizons_secs,
      field: 'horizons_secs',
    });
  }
  compare(
    'feature_schema_hash',
    manifest.feature_schema_hash,
    dataset.feature_schema_hash,
  );
  compare(
    'factor_schema_hash',
    manifest.factor_schema_hash,
    dataset.factor_schema_hash,
  );
  compare(
    'label_schema_hash',
    manifest.label_schema_hash,
    dataset.label_schema_hash,
  );
  compare(
    'semantic_dataset_hash',
    manifest.semantic_dataset_hash,
    dataset.dataset_hash,
  );
  compare('sample_count', manifest.sample_count, dataset.sample_count);

  return issues;
}

export function hasUsableDatasetManifest(
  dataset: TrainingDatasetView,
): boolean {
  return (
    dataset.manifest !== null &&
    datasetManifestBindingIssues(dataset).length === 0
  );
}
