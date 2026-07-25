<script lang="ts" setup>
import type { TrainingDatasetView } from '@vben/types';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';
import { DATASET_PURPOSES } from '@vben/types';

import {
  Alert,
  Button,
  Card,
  Collapse,
  CollapsePanel,
  Descriptions,
  DescriptionsItem,
  Spin,
  Tag,
} from 'antdv-next';
import { Mode } from 'vanilla-jsoneditor';

import { getTrainingDataset } from '#/api/research';
import { $t } from '#/locales';
import FeatureParityStatusPanel from '#/shared/components/feature-parity-status-panel.vue';
import {
  EMPTY_PLACEHOLDER,
  formatDateTimeLocal,
  formatDurationSecs,
} from '#/shared/components/format';
import {
  findTagOption,
  useTrainingDatasetStatusTagOptions,
} from '#/shared/components/format/tag-options';
import JsonEditorShell from '#/shared/components/json-editor/json-editor-shell.vue';
import { usePolling } from '#/shared/composables/use-polling';
import { useQpAccess } from '#/shared/composables/use-qp-access';

import { datasetManifestBindingIssues } from '../../shared/dataset-manifest';
import { canTrainDataset } from './dataset-action-state';

defineOptions({ name: 'DatasetDetailDrawer' });

const emit = defineEmits<{ train: [dataset: TrainingDatasetView] }>();

interface DatasetDrawerData {
  dataset: TrainingDatasetView;
}

/** Non-terminal statuses are still materializing — poll until they settle. */
const NON_TERMINAL = new Set(['building', 'planned']);

const { handleRequest } = useRequestHandler();
const { hasAccessByCodes } = useQpAccess();
const statusTagOptions = useTrainingDatasetStatusTagOptions();
const hasTrainAccess = hasAccessByCodes(['materialization:create']);

const dataset = ref<null | TrainingDatasetView>(null);
const loading = ref(false);
const openId = ref<null | string>(null);

const coverage = computed(() => dataset.value?.coverage ?? {});
const integrityCoverage = computed(() => dataset.value?.coverage ?? null);
const statusTag = computed(() =>
  findTagOption(statusTagOptions, dataset.value?.status),
);
const canTrain = computed(
  () => !!dataset.value && canTrainDataset(hasTrainAccess, dataset.value),
);
const polling = computed(
  () =>
    !!openId.value && !!dataset.value && NON_TERMINAL.has(dataset.value.status),
);
const featureStates = computed(
  () => integrityCoverage.value?.feature_state_counts,
);
const pitExclusions = computed(
  () => integrityCoverage.value?.pit_selection_excluded,
);
const manifest = computed(() => dataset.value?.manifest ?? null);
const cohort = computed(() => dataset.value?.cohort_manifest ?? null);
const evaluationCohortMissing = computed(
  () =>
    dataset.value?.purpose === DATASET_PURPOSES.evaluation &&
    cohort.value === null,
);
const cohortExcluded = computed(
  () =>
    cohort.value?.counts.exclusion_counts.reduce(
      (total, entry) => total + entry.count,
      0,
    ) ?? 0,
);
const cohortCensored = computed(
  () =>
    cohort.value?.counts.censor_counts.reduce(
      (total, entry) => total + entry.count,
      0,
    ) ?? 0,
);
const cohortExclusionText = computed(() =>
  (cohort.value?.counts.exclusion_counts ?? [])
    .map(
      (entry) =>
        `${$t(`enum.cohortExclusionReason.${entry.reason}`)}: ${entry.count}`,
    )
    .join(' · '),
);
const cohortCensorText = computed(() =>
  (cohort.value?.counts.censor_counts ?? [])
    .map(
      (entry) =>
        `${$t(`enum.cohortCensorReason.${entry.reason}`)}: ${entry.count}`,
    )
    .join(' · '),
);
const manifestIssues = computed(() =>
  dataset.value ? datasetManifestBindingIssues(dataset.value) : [],
);
const sampleSourceLabels = computed(() =>
  (dataset.value?.sample_sources ?? []).map((source) =>
    $t(`enum.trainingSampleSource.${source}`),
  ),
);

async function refresh(id: string) {
  loading.value = true;
  try {
    const fresh = await handleRequest(() => getTrainingDataset(id), {
      silent: true,
    });
    if (openId.value === id) {
      dataset.value = fresh ?? null;
    }
  } finally {
    loading.value = false;
  }
}

// Poll while the dataset is still building (WS is a hint, not the truth source).
usePolling(
  () => {
    const id = openId.value;
    if (id) {
      void refresh(id);
    }
  },
  { enabled: polling, intervalMs: 4000 },
);

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<DatasetDrawerData>();
      openId.value = data.dataset.training_dataset_id;
      dataset.value = data.dataset;
      void refresh(data.dataset.training_dataset_id);
    } else {
      openId.value = null;
      dataset.value = null;
    }
  },
});

function onTrain() {
  if (dataset.value) {
    emit('train', dataset.value);
  }
}
</script>

<template>
  <Drawer
    :title="$t('page.research.datasets.detail.title')"
    class="w-full max-w-3xl"
  >
    <Spin :spinning="loading">
      <div v-if="dataset" class="flex min-w-0 flex-col gap-4">
        <div class="flex items-center justify-between gap-2">
          <Tag :color="statusTag?.color">{{ statusTag?.label }}</Tag>
          <Button v-if="canTrain" type="primary" @click="onTrain">
            {{ $t('page.research.datasets.actions.train') }}
          </Button>
        </div>

        <Card size="small" :title="$t('page.research.datasets.detail.summary')">
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem
              :label="$t('page.research.datasets.columns.datasetId')"
            >
              <span class="font-mono text-xs break-all">
                {{ dataset.training_dataset_id }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.columns.modelSpec')"
            >
              {{ dataset.model_spec_id }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.form.purpose')"
            >
              {{ $t(`enum.datasetPurpose.${dataset.purpose}`) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.datasets.detail.researchProfileArtifact')
              "
            >
              <span class="font-mono text-xs break-all">
                {{ dataset.research_profile_artifact_id }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.sourceSliceId')"
            >
              <span class="font-mono text-xs break-all">
                {{ dataset.source_slice_id }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.pitCutoff')"
            >
              {{ formatDateTimeLocal(dataset.pit_cutoff) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.feedbackCohort')"
            >
              {{
                dataset.feedback_cohort
                  ? $t(`enum.feedbackCohort.${dataset.feedback_cohort}`)
                  : EMPTY_PLACEHOLDER
              }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.datasets.detail.decisionPolicySnapshot')
              "
            >
              <span class="font-mono text-xs break-all">
                {{ dataset.decision_policy_snapshot_id }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.columns.windowStart')"
            >
              {{ formatDateTimeLocal(dataset.window_start) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.columns.windowEnd')"
            >
              {{ formatDateTimeLocal(dataset.window_end) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.columns.sampleCount')"
            >
              {{ dataset.sample_count ?? EMPTY_PLACEHOLDER }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.datasetHash')"
            >
              <span class="font-mono text-xs break-all">
                {{ dataset.dataset_hash ?? EMPTY_PLACEHOLDER }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.featureSchemaVersion')"
            >
              {{ dataset.feature_schema_version ?? EMPTY_PLACEHOLDER }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.knowledgeLag')"
            >
              {{ formatDurationSecs(dataset.knowledge_lag_secs) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.sampleInterval')"
            >
              {{ formatDurationSecs(dataset.sample_interval_secs) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.horizons')"
            >
              {{
                dataset.horizons_secs.length > 0
                  ? dataset.horizons_secs.map(formatDurationSecs).join(', ')
                  : EMPTY_PLACEHOLDER
              }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.sampleSources')"
            >
              {{ sampleSourceLabels.join(', ') || EMPTY_PLACEHOLDER }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.parquetUri')"
            >
              <span class="font-mono text-xs break-all">
                {{ dataset.parquet_uri ?? EMPTY_PLACEHOLDER }}
              </span>
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card
          size="small"
          :title="$t('page.research.datasets.detail.manifest')"
        >
          <Alert
            v-if="!manifest"
            :message="$t('page.research.datasets.detail.manifestUnavailable')"
            show-icon
            type="warning"
          />
          <template v-else>
            <Alert
              v-if="manifestIssues.length > 0"
              class="mb-3"
              :description="
                $t('page.research.datasets.detail.manifestMismatchFields', {
                  fields: manifestIssues.map((issue) => issue.field).join(', '),
                })
              "
              :message="$t('page.research.datasets.detail.manifestMismatch')"
              show-icon
              type="error"
            />
            <Alert
              v-else
              class="mb-3"
              :message="$t('page.research.datasets.detail.manifestVerified')"
              show-icon
              type="success"
            />
            <Descriptions :column="2" bordered size="small">
              <DescriptionsItem
                :label="$t('page.research.datasets.detail.formatVersion')"
              >
                {{ manifest.format_version }}
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.research.datasets.form.purpose')"
              >
                {{ $t(`enum.datasetPurpose.${manifest.purpose}`) }}
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.research.datasets.columns.datasetId')"
                :span="2"
              >
                <span class="font-mono text-xs break-all">
                  {{ manifest.training_dataset_id }}
                </span>
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.research.datasets.columns.modelSpec')"
                :span="2"
              >
                <span class="font-mono text-xs break-all">
                  {{ manifest.model_spec_id }}
                </span>
              </DescriptionsItem>
              <DescriptionsItem
                :label="
                  $t('page.research.datasets.detail.decisionPolicySnapshot')
                "
                :span="2"
              >
                <span class="font-mono text-xs break-all">
                  {{ manifest.source_lineage.decision_policy_snapshot_id }}
                </span>
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.research.datasets.columns.windowStart')"
              >
                {{ formatDateTimeLocal(manifest.window_start) }}
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.research.datasets.columns.windowEnd')"
              >
                {{ formatDateTimeLocal(manifest.window_end) }}
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.research.datasets.detail.knowledgeLag')"
              >
                {{ formatDurationSecs(manifest.knowledge_lag_secs) }}
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.research.datasets.detail.sampleInterval')"
              >
                {{ formatDurationSecs(manifest.sample_interval_secs) }}
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.research.datasets.detail.horizons')"
              >
                {{ manifest.horizons_secs.map(formatDurationSecs).join(', ') }}
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.research.datasets.columns.sampleCount')"
              >
                {{ manifest.sample_count }}
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.research.datasets.detail.featureContractHash')"
                :span="2"
              >
                <span class="font-mono text-xs break-all">
                  {{ manifest.feature_schema_hash }}
                </span>
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.research.datasets.detail.factorContractHash')"
                :span="2"
              >
                <span class="font-mono text-xs break-all">
                  {{ manifest.factor_schema_hash }}
                </span>
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.research.datasets.detail.labelContractHash')"
                :span="2"
              >
                <span class="font-mono text-xs break-all">
                  {{ manifest.label_schema_hash }}
                </span>
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.research.datasets.detail.semanticDatasetHash')"
                :span="2"
              >
                <span class="font-mono text-xs break-all">
                  {{ manifest.semantic_dataset_hash }}
                </span>
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.research.datasets.detail.sourceFingerprint')"
                :span="2"
              >
                <span class="font-mono text-xs break-all">
                  {{ manifest.source_fingerprint }}
                </span>
              </DescriptionsItem>
            </Descriptions>
          </template>
        </Card>

        <Card
          size="small"
          :title="$t('page.research.datasets.detail.sourceLineage')"
        >
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.researchProgramHash')"
            >
              <span class="font-mono text-xs break-all">
                {{ dataset.source_lineage.research_program_hash }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.runtimeConfigHash')"
            >
              <span class="font-mono text-xs break-all">
                {{ dataset.source_lineage.runtime_config_hash }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.readerContract')"
            >
              {{ dataset.source_lineage.reader_contract_version }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.schemaContract')"
            >
              {{ dataset.source_lineage.schema_contract_version }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.sourceSchemaHash')"
            >
              <span class="font-mono text-xs break-all">
                {{ dataset.source_lineage.source_schema_hash }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.sourceManifestHash')"
            >
              <span class="font-mono text-xs break-all">
                {{ dataset.source_lineage.source_slice.manifest_hash }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.sourceManifestUri')"
            >
              <span class="font-mono text-xs break-all">
                {{ dataset.source_lineage.source_slice.manifest_uri }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.capabilityHashes')"
            >
              <div class="flex flex-col gap-1">
                <span
                  v-for="hash in dataset.source_lineage
                    .capability_registry_hashes"
                  :key="hash"
                  class="font-mono text-xs break-all"
                >
                  {{ hash }}
                </span>
                <span
                  v-if="
                    dataset.source_lineage.capability_registry_hashes.length ===
                    0
                  "
                >
                  {{ EMPTY_PLACEHOLDER }}
                </span>
              </div>
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card
          v-if="cohort || evaluationCohortMissing"
          size="small"
          :title="$t('page.research.datasets.detail.cohortEvidence')"
        >
          <Alert
            v-if="evaluationCohortMissing"
            :message="$t('page.research.datasets.detail.cohortUnavailable')"
            show-icon
            type="error"
          />
          <Descriptions v-else-if="cohort" :column="2" bordered size="small">
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.feedbackCohort')"
              :span="2"
            >
              {{ $t(`enum.feedbackCohort.${cohort.cohort}`) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.cohortCandidates')"
            >
              {{ cohort.counts.candidate_count }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.cohortEligible')"
            >
              {{ cohort.counts.eligible_count }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.cohortIncluded')"
            >
              {{ cohort.counts.included_count }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.cohortExcluded')"
            >
              {{ cohortExcluded }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.cohortCensored')"
              :span="2"
            >
              {{ cohortCensored }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.cohortArtifactUri')"
              :span="2"
            >
              <span class="font-mono text-xs break-all">
                {{ cohort.artifact.uri }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.cohortArtifactHash')"
              :span="2"
            >
              <span class="font-mono text-xs break-all">
                {{ cohort.artifact.bytes_hash }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.cohortSourceHash')"
              :span="2"
            >
              <span class="font-mono text-xs break-all">
                {{ cohort.artifact.source_hash }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.cohortSchemaHash')"
              :span="2"
            >
              <span class="font-mono text-xs break-all">
                {{ cohort.artifact.schema_hash }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              v-if="cohortExclusionText"
              :label="$t('page.research.datasets.detail.cohortExcluded')"
              :span="2"
            >
              {{ cohortExclusionText }}
            </DescriptionsItem>
            <DescriptionsItem
              v-if="cohortCensorText"
              :label="$t('page.research.datasets.detail.cohortCensored')"
              :span="2"
            >
              {{ cohortCensorText }}
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card
          size="small"
          :title="$t('page.research.datasets.detail.integrity')"
        >
          <Descriptions :column="2" bordered size="small">
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.featureContractHash')"
              :span="2"
            >
              <span class="font-mono text-xs break-all">
                {{ dataset.feature_schema_hash ?? EMPTY_PLACEHOLDER }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.factorContractHash')"
              :span="2"
            >
              <span class="font-mono text-xs break-all">
                {{ dataset.factor_schema_hash ?? EMPTY_PLACEHOLDER }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.labelContractHash')"
              :span="2"
            >
              <span class="font-mono text-xs break-all">
                {{ dataset.label_schema_hash ?? EMPTY_PLACEHOLDER }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.manifestHash')"
              :span="2"
            >
              <span class="font-mono text-xs break-all">
                {{ dataset.manifest_hash ?? EMPTY_PLACEHOLDER }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.artifactBytesHash')"
              :span="2"
            >
              <span class="font-mono text-xs break-all">
                {{ dataset.artifact_bytes_hash ?? EMPTY_PLACEHOLDER }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.gateStatus')"
            >
              <Tag :color="statusTag?.color">{{ statusTag?.label }}</Tag>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.completedAt')"
            >
              {{ formatDateTimeLocal(dataset.completed_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              v-if="dataset.failure_detail"
              :label="$t('page.research.datasets.detail.failureDetail')"
              :span="2"
            >
              {{ dataset.failure_detail }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.plannedSamples')"
            >
              {{ integrityCoverage?.planned_samples ?? '—' }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.builtExamples')"
            >
              {{ integrityCoverage?.built_examples ?? '—' }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.labelsAvailable')"
            >
              {{ integrityCoverage?.labels_available ?? '—' }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.labelsUnavailable')"
            >
              {{ integrityCoverage?.labels_unavailable ?? '—' }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.bookDecodeFailures')"
              :span="2"
            >
              {{ integrityCoverage?.book_decode_failures ?? '—' }}
            </DescriptionsItem>
            <DescriptionsItem
              v-if="integrityCoverage?.matrix_probe"
              :label="$t('page.research.datasets.detail.matrixAccepted')"
            >
              {{ integrityCoverage.matrix_probe.accepted_rows }}
            </DescriptionsItem>
            <DescriptionsItem
              v-if="integrityCoverage?.matrix_probe"
              :label="$t('page.research.datasets.detail.matrixRejected')"
            >
              {{ integrityCoverage.matrix_probe.rejected_rows }}
            </DescriptionsItem>
            <DescriptionsItem
              v-if="integrityCoverage?.matrix_probe"
              :label="$t('page.research.datasets.detail.targetLabel')"
            >
              {{ integrityCoverage.matrix_probe.label_name }}
            </DescriptionsItem>
            <DescriptionsItem
              v-if="integrityCoverage?.matrix_probe"
              :label="$t('page.research.datasets.detail.targetLabelHorizon')"
            >
              {{
                formatDurationSecs(
                  integrityCoverage.matrix_probe.label_horizon_secs,
                )
              }}
            </DescriptionsItem>
            <DescriptionsItem
              v-if="integrityCoverage?.matrix_probe"
              :label="$t('page.research.datasets.detail.targetLabelRows')"
            >
              {{ integrityCoverage.matrix_probe.label_rows }}
            </DescriptionsItem>
            <DescriptionsItem
              v-if="integrityCoverage?.matrix_probe"
              :label="$t('page.research.datasets.detail.featureColumns')"
            >
              {{ integrityCoverage.matrix_probe.feature_columns }}
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card
          size="small"
          :title="$t('page.research.datasets.detail.pitCoverage')"
        >
          <Descriptions :column="2" bordered size="small">
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.pitCandidates')"
            >
              {{
                integrityCoverage?.pit_selection_candidates ?? EMPTY_PLACEHOLDER
              }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.pitIncluded')"
            >
              {{
                integrityCoverage?.pit_selection_included ?? EMPTY_PLACEHOLDER
              }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.rejectedStaleBook')"
            >
              {{ pitExclusions?.stale_book_count ?? EMPTY_PLACEHOLDER }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.rejectedLiquidity')"
            >
              {{
                pitExclusions?.insufficient_liquidity_count ?? EMPTY_PLACEHOLDER
              }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.rejectedOperator')"
            >
              {{
                pitExclusions?.excluded_by_operator_count ?? EMPTY_PLACEHOLDER
              }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.rejectedOther')"
            >
              {{ pitExclusions?.other_count ?? EMPTY_PLACEHOLDER }}
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card
          class="min-w-0"
          size="small"
          :title="$t('page.research.datasets.detail.featureStates')"
        >
          <Descriptions :column="{ xs: 2, sm: 4 }" bordered size="small">
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.stateObserved')"
            >
              {{ featureStates?.observed ?? EMPTY_PLACEHOLDER }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.stateSubstituted')"
            >
              {{ featureStates?.substituted ?? EMPTY_PLACEHOLDER }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.stateMissing')"
            >
              {{ featureStates?.missing ?? EMPTY_PLACEHOLDER }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.stateNotApplicable')"
            >
              {{ featureStates?.not_applicable ?? EMPTY_PLACEHOLDER }}
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card size="small" :title="$t('page.research.datasets.detail.parity')">
          <FeatureParityStatusPanel
            :training-dataset-id="dataset.training_dataset_id"
          />
        </Card>

        <Collapse ghost>
          <CollapsePanel
            v-if="manifest"
            key="manifest"
            :header="$t('page.research.datasets.detail.manifestRaw')"
          >
            <JsonEditorShell
              :model-value="manifest"
              :mode="Mode.tree"
              read-only
            />
          </CollapsePanel>
          <CollapsePanel
            key="raw"
            :header="$t('page.research.datasets.detail.coverageRaw')"
          >
            <JsonEditorShell
              :model-value="coverage"
              :mode="Mode.tree"
              read-only
            />
          </CollapsePanel>
        </Collapse>
      </div>
    </Spin>
  </Drawer>
</template>
