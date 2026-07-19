<script lang="ts" setup>
import type { QuantEvidenceView } from '@vben/types';

import { computed, ref, watch } from 'vue';

import { useRequestHandler } from '@vben/request/qp';

import {
  Alert,
  Card,
  Collapse,
  CollapsePanel,
  Descriptions,
  DescriptionsItem,
  Empty,
  Spin,
  Tag,
  Typography,
} from 'antdv-next';
import { Mode } from 'vanilla-jsoneditor';

import { getRecommendationEvidence } from '#/api/quant-recommendations';
import { $t } from '#/locales';
import DataList from '#/shared/components/data-list.vue';
import {
  EMPTY_PLACEHOLDER,
  formatDateTimeLocal,
} from '#/shared/components/format';
import {
  findTagOption,
  useFeatureCellStateTagOptions,
  useModelInputStateTagOptions,
} from '#/shared/components/format/tag-options';
import JsonEditorShell from '#/shared/components/json-editor/json-editor-shell.vue';

import { summarizeModelInputAudit } from '../model-input-audit';

defineOptions({ name: 'RecommendationEvidence' });

const props = defineProps<{ active: boolean; recommendationId: string }>();

const { handleRequest } = useRequestHandler();
const { Text } = Typography;
const featureCellStateOptions = useFeatureCellStateTagOptions();
const modelInputStateOptions = useModelInputStateTagOptions();

const evidence = ref<null | QuantEvidenceView>(null);
const loading = ref(false);
let loaded = false;

/** Single-value replay handles rendered as copyable rows. */
const handleRows = computed<Array<{ label: string; value: string }>>(() => {
  const view = evidence.value;
  if (!view) {
    return [];
  }
  return [
    {
      label: $t('page.quantRecommendations.evidence.signalCandidate'),
      value: view.signal_candidate_id,
    },
    {
      label: $t('page.quantRecommendations.evidence.featureVector'),
      value: view.feature_vector_id,
    },
    {
      label: $t('page.quantRecommendations.evidence.modelRun'),
      value: view.model_run_id,
    },
    {
      label: $t('page.quantRecommendations.evidence.marketSelection'),
      value: view.market_selection_id,
    },
    {
      label: $t('page.quantRecommendations.evidence.bookSnapshot'),
      value: view.book_snapshot_ref,
    },
    {
      label: $t('page.quantRecommendations.evidence.decisionPolicySnapshot'),
      value: view.decision_policy_snapshot_id,
    },
    {
      label: $t('page.quantRecommendations.evidence.modelVersion'),
      value: view.model_version_id,
    },
    {
      label: $t('page.quantRecommendations.evidence.dataQualitySnapshot'),
      value: view.data_quality_snapshot_ref,
    },
  ];
});

const sourceCutoffs = computed(() =>
  Object.entries(evidence.value?.decision_boundary?.per_source_cutoffs ?? {}),
);
const modelInputAudit = computed(() =>
  summarizeModelInputAudit(evidence.value?.model_inputs ?? []),
);

const featureColumns = [
  {
    dataIndex: 'feature_name',
    key: 'feature_name',
    title: $t('page.quantRecommendations.evidence.featureName'),
  },
  {
    dataIndex: 'state',
    key: 'state',
    title: $t('page.quantRecommendations.evidence.state'),
  },
  {
    dataIndex: 'raw_value',
    key: 'raw_value',
    title: $t('page.quantRecommendations.evidence.rawValue'),
  },
  {
    dataIndex: 'reason',
    key: 'reason',
    title: $t('page.quantRecommendations.evidence.reason'),
  },
  {
    dataIndex: 'source_kind',
    key: 'source_kind',
    title: $t('page.quantRecommendations.evidence.source'),
  },
  {
    dataIndex: 'staleness_ms',
    key: 'staleness_ms',
    title: $t('page.quantRecommendations.evidence.staleness'),
  },
  {
    dataIndex: 'evidence_reference',
    key: 'evidence_reference',
    title: $t('page.quantRecommendations.evidence.sourceReference'),
  },
  {
    dataIndex: 'evidence_effective_at',
    key: 'evidence_effective_at',
    title: $t('page.quantRecommendations.evidence.effectiveAt'),
  },
  {
    dataIndex: 'evidence_available_at',
    key: 'evidence_available_at',
    title: $t('page.quantRecommendations.evidence.availableAt'),
  },
  {
    dataIndex: 'audit_fingerprint',
    key: 'audit_fingerprint',
    title: $t('page.quantRecommendations.evidence.featureFingerprint'),
  },
];
const modelInputColumns = [
  {
    dataIndex: 'raw_input_name',
    key: 'raw_input_name',
    title: $t('page.quantRecommendations.evidence.rawInput'),
  },
  {
    dataIndex: 'raw_state',
    key: 'raw_state',
    title: $t('page.quantRecommendations.evidence.state'),
  },
  {
    dataIndex: 'raw_value',
    key: 'raw_value',
    title: $t('page.quantRecommendations.evidence.rawValue'),
  },
  {
    dataIndex: 'encoded_column',
    key: 'encoded_column',
    title: $t('page.quantRecommendations.evidence.encodedColumn'),
  },
  {
    dataIndex: 'encoded_value_bits',
    key: 'encoded_value_bits',
    title: $t('page.quantRecommendations.evidence.encodedBits'),
  },
  {
    dataIndex: 'audit_fingerprint',
    key: 'audit_fingerprint',
    title: $t('page.quantRecommendations.evidence.modelInputFingerprint'),
  },
];

function displayRecordValue(record: object, key: unknown) {
  if (typeof key !== 'string') {
    return EMPTY_PLACEHOLDER;
  }
  return (record as Record<string, unknown>)[key] ?? EMPTY_PLACEHOLDER;
}

async function loadOnce() {
  if (loaded) {
    return;
  }
  loaded = true;
  loading.value = true;
  try {
    evidence.value = await handleRequest(
      () => getRecommendationEvidence(props.recommendationId),
      { silent: true },
    );
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.active,
  (active) => {
    if (active) {
      void loadOnce();
    }
  },
  { immediate: true },
);
</script>

<template>
  <Spin :spinning="loading">
    <div v-if="evidence" class="flex flex-col gap-4">
      <Alert
        v-if="!evidence.evidence_complete"
        :message="$t('page.quantRecommendations.evidence.incomplete')"
        show-icon
        type="error"
      />
      <Card
        size="small"
        :title="$t('page.quantRecommendations.evidence.handles')"
      >
        <Descriptions :column="1" bordered size="small">
          <DescriptionsItem
            v-for="row in handleRows"
            :key="row.label"
            :label="row.label"
          >
            <Text
              class="font-mono text-xs break-all"
              copyable
              :aria-label="`${row.label}: ${row.value}`"
            >
              {{ row.value }}
            </Text>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.evidence.factorDefinitions')"
          >
            <div
              v-if="evidence.factor_definition_versions.length > 0"
              class="flex flex-col gap-1"
            >
              <Text
                v-for="version in evidence.factor_definition_versions"
                :key="version"
                class="font-mono text-xs break-all"
                copyable
                :aria-label="version"
              >
                {{ version }}
              </Text>
            </div>
            <span v-else>{{ EMPTY_PLACEHOLDER }}</span>
          </DescriptionsItem>
        </Descriptions>
      </Card>

      <Card
        size="small"
        :title="$t('page.quantRecommendations.evidence.decisionBoundary')"
      >
        <Descriptions :column="2" bordered size="small">
          <DescriptionsItem
            :label="$t('page.quantRecommendations.evidence.decisionAt')"
          >
            {{ formatDateTimeLocal(evidence.decision_boundary?.decision_at) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.evidence.knowledgeCutoff')"
          >
            {{
              formatDateTimeLocal(evidence.decision_boundary?.knowledge_cutoff)
            }}
          </DescriptionsItem>
          <DescriptionsItem
            v-for="[source, cutoff] in sourceCutoffs"
            :key="source"
            :label="source"
          >
            {{ formatDateTimeLocal(cutoff) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.evidence.featureSchemaHash')"
            :span="2"
          >
            <span class="font-mono text-xs break-all">{{
              evidence.feature_schema_hash ?? EMPTY_PLACEHOLDER
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.evidence.featureHash')"
            :span="2"
          >
            <span class="font-mono text-xs break-all">{{
              evidence.feature_hash ?? EMPTY_PLACEHOLDER
            }}</span>
          </DescriptionsItem>
        </Descriptions>
      </Card>

      <Card
        size="small"
        :title="$t('page.quantRecommendations.evidence.featureCells')"
      >
        <DataList
          v-if="evidence.feature_cells.length > 0"
          :columns="featureColumns"
          :data-source="evidence.feature_cells"
          row-key="feature_name"
          :scroll="{ x: 1500 }"
        >
          <template #bodyCell="{ column, record }">
            <Tag
              v-if="column.key === 'state'"
              :color="
                findTagOption(featureCellStateOptions, record.state)?.color
              "
            >
              {{
                findTagOption(featureCellStateOptions, record.state)?.label ??
                EMPTY_PLACEHOLDER
              }}
            </Tag>
            <span
              v-else-if="column.key === 'staleness_ms'"
              class="font-mono text-xs"
            >
              {{
                record.staleness_ms === null
                  ? EMPTY_PLACEHOLDER
                  : `${record.staleness_ms} ms`
              }}
            </span>
            <span
              v-else-if="
                column.key === 'evidence_effective_at' ||
                column.key === 'evidence_available_at'
              "
              class="text-xs"
            >
              {{
                formatDateTimeLocal(
                  column.key === 'evidence_effective_at'
                    ? record.evidence_effective_at
                    : record.evidence_available_at,
                )
              }}
            </span>
            <span v-else class="font-mono text-xs break-all">
              {{ displayRecordValue(record, column.key) }}
            </span>
          </template>
        </DataList>
        <Empty
          v-else
          :description="$t('page.quantRecommendations.evidence.noFeatureCells')"
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
        />
      </Card>

      <Card
        size="small"
        :title="$t('page.quantRecommendations.evidence.modelInputs')"
      >
        <Alert
          v-if="modelInputAudit && !modelInputAudit.consistent"
          class="mb-3"
          :message="$t('page.quantRecommendations.evidence.inconsistentInputs')"
          show-icon
          type="error"
        />
        <DataList
          v-if="evidence.model_inputs.length > 0"
          :columns="modelInputColumns"
          :data-source="evidence.model_inputs"
          row-key="audit_fingerprint"
          :scroll="{ x: 900 }"
        >
          <template #bodyCell="{ column, record }">
            <Tag
              v-if="column.key === 'raw_state'"
              :color="
                findTagOption(modelInputStateOptions, record.raw_state)?.color
              "
            >
              {{
                findTagOption(modelInputStateOptions, record.raw_state)
                  ?.label ?? EMPTY_PLACEHOLDER
              }}
            </Tag>
            <span v-else class="font-mono text-xs break-all">
              {{ displayRecordValue(record, column.key) }}
            </span>
          </template>
        </DataList>
        <Empty
          v-else
          :description="$t('page.quantRecommendations.evidence.noModelInputs')"
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
        />
        <Descriptions
          v-if="modelInputAudit"
          class="mt-3"
          :column="1"
          bordered
          size="small"
        >
          <DescriptionsItem
            :label="$t('page.quantRecommendations.evidence.inputContractHash')"
          >
            <span class="font-mono text-xs break-all">{{
              modelInputAudit.inputContractHash
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.evidence.transformHash')"
          >
            <span class="font-mono text-xs break-all">{{
              modelInputAudit.transformHash
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.evidence.trainingInputHash')"
          >
            <span class="font-mono text-xs break-all">{{
              modelInputAudit.trainingInputHash
            }}</span>
          </DescriptionsItem>
        </Descriptions>
      </Card>

      <Collapse ghost>
        <CollapsePanel
          key="raw"
          :header="$t('page.quantRecommendations.evidence.raw')"
        >
          <JsonEditorShell
            :model-value="evidence"
            :mode="Mode.tree"
            read-only
          />
        </CollapsePanel>
      </Collapse>
    </div>
    <Empty
      v-else-if="!loading"
      :description="$t('page.quantRecommendations.evidence.empty')"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
    />
  </Spin>
</template>
