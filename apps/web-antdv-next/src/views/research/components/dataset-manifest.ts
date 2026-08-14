import type { DatasetCohortManifest, TrainingDatasetView } from '@vben/types';

import { DATASET_PURPOSES } from '@vben/types';

export const DATASET_ARTIFACT_FORMAT_VERSION = 3;
export const DATASET_COHORT_MANIFEST_FORMAT_VERSION = 1;
export const DATASET_SOURCE_LINEAGE_FORMAT_VERSION = 1;

export interface DatasetManifestBindingIssue {
  actual: unknown;
  expected: unknown;
  field: string;
}

function sameJsonValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => sameJsonValue(value, right[index]))
    );
  }
  if (
    left === null ||
    right === null ||
    typeof left !== 'object' ||
    typeof right !== 'object'
  ) {
    return false;
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).toSorted();
  const rightKeys = Object.keys(rightRecord).toSorted();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] &&
        sameJsonValue(leftRecord[key], rightRecord[key]),
    )
  );
}

function cohortSemanticIssues(
  cohort: DatasetCohortManifest,
): DatasetManifestBindingIssue[] {
  const issues: DatasetManifestBindingIssue[] = [];
  const { counts } = cohort;
  const excluded = counts.exclusion_counts.reduce(
    (total, entry) => total + entry.count,
    0,
  );
  const censored = counts.censor_counts.reduce(
    (total, entry) => total + entry.count,
    0,
  );
  if (counts.candidate_count !== counts.eligible_count + excluded + censored) {
    issues.push({
      actual: counts.candidate_count,
      expected: counts.eligible_count + excluded + censored,
      field: 'cohort_manifest.counts.candidate_count',
    });
  }
  if (counts.included_count > counts.eligible_count) {
    issues.push({
      actual: counts.included_count,
      expected: `<= ${counts.eligible_count}`,
      field: 'cohort_manifest.counts.included_count',
    });
  }
  if (cohort.artifact.row_count !== counts.included_count) {
    issues.push({
      actual: cohort.artifact.row_count,
      expected: counts.included_count,
      field: 'cohort_manifest.artifact.row_count',
    });
  }
  return issues;
}

/**
 * Verify the transparent API projection against every normalized ledger field
 * duplicated in the v3 artifact manifest. This is a UI fail-closed affordance;
 * server-side validation and artifact read-back remain authoritative.
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
    if (!sameJsonValue(actual, expected)) {
      issues.push({ actual, expected, field });
    }
  };

  compare(
    'format_version',
    manifest.format_version,
    DATASET_ARTIFACT_FORMAT_VERSION,
  );
  compare(
    'source_lineage.format_version',
    manifest.source_lineage.format_version,
    DATASET_SOURCE_LINEAGE_FORMAT_VERSION,
  );
  compare(
    'training_dataset_id',
    manifest.training_dataset_id,
    dataset.training_dataset_id,
  );
  compare('model_spec_id', manifest.model_spec_id, dataset.model_spec_id);
  compare('model_family', manifest.model_family, dataset.model_family);
  compare(
    'model_spec_definition_hash',
    manifest.model_spec_definition_hash,
    dataset.model_spec_definition_hash,
  );
  compare('source_lineage', manifest.source_lineage, dataset.source_lineage);
  compare(
    'research_profile_artifact_id',
    manifest.source_lineage.research_profile_artifact_id,
    dataset.research_profile_artifact_id,
  );
  compare(
    'source_slice_id',
    manifest.source_lineage.source_slice_id,
    dataset.source_slice_id,
  );
  compare('pit_cutoff', manifest.source_lineage.pit_cutoff, dataset.pit_cutoff);
  compare(
    'decision_policy_snapshot_id',
    manifest.source_lineage.decision_policy_snapshot_id,
    dataset.decision_policy_snapshot_id,
  );
  compare('cohort_manifest', manifest.cohort_manifest, dataset.cohort_manifest);
  compare(
    'feedback_cohort',
    manifest.cohort_manifest?.cohort ?? null,
    dataset.feedback_cohort,
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
  compare('horizons_secs', manifest.horizons_secs, dataset.horizons_secs);
  compare(
    'feature_schema_hash',
    manifest.feature_schema_hash,
    dataset.feature_schema_hash,
  );
  compare(
    'feature_schema_version',
    manifest.feature_schema_version,
    dataset.feature_schema_version,
  );
  compare(
    'factor_serving_plane',
    manifest.factor_serving_plane,
    dataset.factor_serving_plane,
  );
  compare(
    'factor_schema_hash',
    manifest.factor_serving_plane.factor_schema_hash,
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

  const cohort = manifest.cohort_manifest;
  if (dataset.purpose === DATASET_PURPOSES.evaluation && !cohort) {
    issues.push({
      actual: null,
      expected: 'immutable evaluation cohort',
      field: 'cohort_manifest',
    });
  }
  if (dataset.purpose === DATASET_PURPOSES.policyFit && cohort) {
    issues.push({
      actual: cohort,
      expected: null,
      field: 'cohort_manifest',
    });
  }
  if (cohort) {
    compare(
      'cohort_manifest.format_version',
      cohort.format_version,
      DATASET_COHORT_MANIFEST_FORMAT_VERSION,
    );
    compare(
      'cohort_manifest.window.window_start',
      cohort.window.window_start,
      manifest.window_start,
    );
    compare(
      'cohort_manifest.window.cutoff',
      cohort.window.cutoff,
      manifest.window_end,
    );
    compare(
      'cohort_manifest.capability_registry_hashes',
      cohort.capability_registry_hashes,
      manifest.source_lineage.capability_registry_hashes,
    );
    issues.push(...cohortSemanticIssues(cohort));
  }

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
