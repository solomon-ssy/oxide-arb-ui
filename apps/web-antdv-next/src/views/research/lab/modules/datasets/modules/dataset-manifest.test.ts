import { describe, expect, it } from 'vitest';

import {
  datasetManifestBindingIssues,
  hasUsableDatasetManifest,
} from '#/views/research/components/dataset-manifest';

import { datasetFixture } from './dataset-test-fixture';

describe('dataset v3 manifest bindings', () => {
  it('accepts an exact structured manifest without substituting any field', () => {
    const value = datasetFixture();
    expect(datasetManifestBindingIssues(value)).toEqual([]);
    expect(hasUsableDatasetManifest(value)).toBe(true);
  });

  it('reports top-level and source-lineage tampering', () => {
    const value = datasetFixture();
    const manifest = value.manifest;
    if (!manifest) {
      throw new Error('test fixture requires a v3 manifest');
    }
    value.manifest = {
      ...manifest,
      format_version: 1,
      horizons_secs: [86_400, 3600],
      sample_count: 19,
      semantic_dataset_hash: `blake3:${'9'.repeat(64)}`,
      source_lineage: {
        ...manifest.source_lineage,
        runtime_config_hash: `blake3:${'1'.repeat(64)}`,
      },
    };
    expect(
      datasetManifestBindingIssues(value).map((issue) => issue.field),
    ).toEqual([
      'format_version',
      'source_lineage',
      'horizons_secs',
      'semantic_dataset_hash',
      'sample_count',
    ]);
    expect(hasUsableDatasetManifest(value)).toBe(false);
  });

  it('keeps an absent manifest unavailable instead of synthesizing v3', () => {
    const value = datasetFixture();
    value.manifest = null;
    expect(datasetManifestBindingIssues(value)).toEqual([]);
    expect(hasUsableDatasetManifest(value)).toBe(false);
  });

  it('rejects evaluation cohort count and artifact drift', () => {
    const value = datasetFixture('evaluation');
    const cohort = value.manifest?.cohort_manifest;
    if (!cohort || !value.manifest) {
      throw new Error('test fixture requires an evaluation cohort');
    }
    value.manifest = {
      ...value.manifest,
      cohort_manifest: {
        ...cohort,
        artifact: { ...cohort.artifact, row_count: 19 },
        counts: { ...cohort.counts, candidate_count: 24 },
      },
    };
    expect(
      datasetManifestBindingIssues(value).map((issue) => issue.field),
    ).toEqual([
      'cohort_manifest',
      'cohort_manifest.counts.candidate_count',
      'cohort_manifest.artifact.row_count',
    ]);
    expect(hasUsableDatasetManifest(value)).toBe(false);
  });
});
