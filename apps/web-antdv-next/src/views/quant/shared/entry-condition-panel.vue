<script lang="ts" setup>
import type {
  EntryConditionAuditView,
  EntryConditionDetailView,
  EntryConditionLeafEvidenceView,
  EntryConditionNodeEvaluationView,
  EntryConditionNodeV1,
} from '@vben/types';

import { computed, onMounted, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { useRequestHandler } from '@vben/request/qp';

import { useClipboard } from '@vueuse/core';
import {
  Alert,
  Button,
  Collapse,
  CollapsePanel,
  Descriptions,
  DescriptionsItem,
  Empty,
  Spin,
  Tag,
  Timeline,
  TimelineItem,
  Tooltip,
} from 'antdv-next';

import {
  getRecommendationEntryCondition,
  getRecommendationEntryConditionAudits,
} from '#/api/quant-recommendations';
import { $t } from '#/locales';
import {
  EMPTY_PLACEHOLDER,
  formatDateTimeLocal,
} from '#/shared/components/format';
import { useEntryConditionStore } from '#/store/entry-condition';

defineOptions({ name: 'EntryConditionPanel' });

const props = defineProps<{ recommendationId: string }>();

const { handleRequest } = useRequestHandler();
const conditionStore = useEntryConditionStore();
const detail = ref<EntryConditionDetailView | null>(null);
const audits = ref<EntryConditionAuditView[]>([]);
const loading = ref(false);
const loadFailed = ref(false);
const { copy } = useClipboard();

interface FlatNode {
  depth: number;
  evidence: EntryConditionLeafEvidenceView | null;
  evaluation: EntryConditionNodeEvaluationView | null;
  label: string;
  nodeId: number;
  subtreeHash: string;
}

function eventLabel(
  node: Extract<EntryConditionNodeV1, { kind: 'market_event' }>,
) {
  switch (node.event.kind) {
    case 'crypto_subject_predicate_entered': {
      return $t('page.entryCondition.node.cryptoEvent');
    }
    case 'weather_daily_high_entered_band': {
      return $t('page.entryCondition.node.weatherEnterBand');
    }
    case 'weather_daily_high_exceeded_band_upper': {
      return $t('page.entryCondition.node.weatherExceedUpper');
    }
    case 'weather_observation_day_closed_outside_band': {
      return $t('page.entryCondition.node.weatherDayClosedOutside');
    }
  }
}

function nodeLabel(node: EntryConditionNodeV1) {
  switch (node.kind) {
    case 'all': {
      return $t('page.entryCondition.node.all');
    }
    case 'any': {
      return $t('page.entryCondition.node.any');
    }
    case 'clock': {
      return $t('page.entryCondition.node.clock', {
        deadline: formatDateTimeLocal(node.deadline_at),
      });
    }
    case 'factor': {
      return $t('page.entryCondition.node.factor', {
        comparison: $t(`enum.priceComparison.${node.comparison}`),
        id: node.definition_id,
        measure: node.measure,
        threshold: node.threshold,
      });
    }
    case 'market_event': {
      return eventLabel(node);
    }
    case 'price': {
      return $t('page.entryCondition.node.price', {
        comparison: $t(`enum.priceComparison.${node.comparison}`),
        threshold: node.threshold,
      });
    }
  }
}

const flatTree = computed<FlatNode[]>(() => {
  const artifact = detail.value?.artifact;
  if (!artifact) return [];
  const rows: FlatNode[] = [];
  const evidence = new Map(
    (detail.value?.latest_authoritative_evaluation?.leaf_evidence ?? []).map(
      (leaf) => [leaf.node_id, leaf],
    ),
  );
  const evaluations = new Map<number, EntryConditionNodeEvaluationView>();
  const collectEvaluation = (node: EntryConditionNodeEvaluationView) => {
    evaluations.set(node.node_id, node);
    for (const child of node.children) collectEvaluation(child);
  };
  if (detail.value?.latest_authoritative_evaluation) {
    collectEvaluation(detail.value.latest_authoritative_evaluation.tree);
  }
  let index = 0;
  const visit = (node: EntryConditionNodeV1, depth: number) => {
    const identity = artifact.nodes[index];
    rows.push({
      depth,
      evidence: evidence.get(identity?.node_id ?? index) ?? null,
      evaluation: evaluations.get(identity?.node_id ?? index) ?? null,
      label: nodeLabel(node),
      nodeId: identity?.node_id ?? index,
      subtreeHash: identity?.subtree_hash ?? '',
    });
    index += 1;
    if (node.kind === 'all' || node.kind === 'any') {
      for (const child of node.children) visit(child, depth + 1);
    }
  };
  visit(artifact.artifact.root, 0);
  return rows;
});

const truthKind = computed(() => detail.value?.instance.truth?.kind ?? null);

function truthColor(kind: null | string | undefined) {
  if (kind === 'satisfied') return 'green';
  if (kind === 'unavailable') return 'red';
  return 'orange';
}

function prettyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function freshnessLabel(value: null | number) {
  if (value === null) return EMPTY_PLACEHOLDER;
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(1)} s`;
}

function unavailableReasonLabel(
  reason: EntryConditionLeafEvidenceView['unavailable_reason'],
) {
  if (!reason) return '';
  const suffix = 'source_id' in reason ? ` · ${reason.source_id}` : '';
  return `${$t(`page.entryCondition.unavailableReason.${reason.kind}`)}${suffix}`;
}

function copyHash(value: null | string | undefined) {
  if (value) void copy(value);
}

async function load() {
  loading.value = true;
  loadFailed.value = false;
  try {
    const [nextDetail, nextAudits] = await Promise.all([
      handleRequest(
        () => getRecommendationEntryCondition(props.recommendationId),
        { silent: true },
      ),
      handleRequest(
        () => getRecommendationEntryConditionAudits(props.recommendationId),
        { silent: true },
      ),
    ]);
    if (!nextDetail || !nextAudits) {
      loadFailed.value = true;
      return;
    }
    detail.value = nextDetail;
    audits.value = nextAudits;
  } catch {
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.recommendationId,
  () => void load(),
);
watch(
  () => conditionStore.lastEvent,
  (event) => {
    if (
      event &&
      event.condition_instance_id ===
        detail.value?.instance.condition_instance_id
    ) {
      void load();
    }
  },
);
onMounted(() => void load());
</script>

<template>
  <Spin :spinning="loading">
    <Alert
      v-if="loadFailed"
      show-icon
      type="error"
      :message="$t('page.entryCondition.loadError')"
    />
    <div
      v-else-if="detail"
      aria-live="polite"
      class="flex flex-col gap-4"
      data-testid="entry-condition-panel"
    >
      <div
        v-if="detail.latest_authoritative_evaluation"
        class="bg-background/95 border-border sticky top-0 z-10 flex items-center justify-between gap-3 border-b py-2 backdrop-blur"
      >
        <div class="min-w-0">
          <div class="text-sm font-medium">
            {{ $t('page.entryCondition.authoritativeEvaluation') }}
          </div>
          <div
            class="text-muted-foreground truncate font-mono text-xs"
            data-screenshot-volatile="true"
          >
            {{ detail.latest_authoritative_evaluation.evaluation_id }}
          </div>
        </div>
        <Tooltip :title="$t('page.entryCondition.copyHash')">
          <Button
            :aria-label="$t('page.entryCondition.copyEvaluationId')"
            size="small"
            type="text"
            @click="
              copyHash(detail.latest_authoritative_evaluation.evaluation_id)
            "
          >
            <IconifyIcon class="size-4" icon="lucide:copy" />
          </Button>
        </Tooltip>
      </div>

      <Descriptions :column="1" bordered size="small">
        <DescriptionsItem :label="$t('page.entryCondition.state')">
          <Tag>
            {{ $t(`enum.entryConditionState.${detail.instance.state}`) }}
          </Tag>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.entryCondition.truth')">
          <Tag v-if="truthKind" :color="truthColor(truthKind)">
            {{ $t(`enum.conditionTruth.${truthKind}`) }}
          </Tag>
          <template v-else>{{ EMPTY_PLACEHOLDER }}</template>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.entryCondition.revision')">
          {{ detail.instance.revision }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.entryCondition.confirmation')">
          <span data-screenshot-volatile="true">
            {{ formatDateTimeLocal(detail.instance.confirmation_started_at) }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.entryCondition.lastEvaluatedAt')">
          <span data-screenshot-volatile="true">
            {{ formatDateTimeLocal(detail.instance.last_evaluated_at) }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.entryCondition.nextEvaluationAt')">
          <span data-screenshot-volatile="true">
            {{ formatDateTimeLocal(detail.instance.next_evaluation_at) }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.entryCondition.evaluationHash')">
          <div class="flex items-start gap-2">
            <span
              class="min-w-0 flex-1 break-all font-mono text-xs"
              data-screenshot-volatile="true"
            >
              {{ detail.instance.evaluation_hash ?? EMPTY_PLACEHOLDER }}
            </span>
            <Button
              v-if="detail.instance.evaluation_hash"
              :aria-label="$t('page.entryCondition.copyEvaluationHash')"
              size="small"
              type="text"
              @click="copyHash(detail.instance.evaluation_hash)"
            >
              <IconifyIcon class="size-4" icon="lucide:copy" />
            </Button>
          </div>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.entryCondition.inputFingerprint')">
          <div class="flex items-start gap-2">
            <span
              class="min-w-0 flex-1 break-all font-mono text-xs"
              data-screenshot-volatile="true"
            >
              {{ detail.instance.input_fingerprint ?? EMPTY_PLACEHOLDER }}
            </span>
            <Button
              v-if="detail.instance.input_fingerprint"
              :aria-label="$t('page.entryCondition.copyInputFingerprint')"
              size="small"
              type="text"
              @click="copyHash(detail.instance.input_fingerprint)"
            >
              <IconifyIcon class="size-4" icon="lucide:copy" />
            </Button>
          </div>
        </DescriptionsItem>
      </Descriptions>

      <section>
        <div class="mb-2 flex items-center justify-between gap-3">
          <h4 class="font-medium">
            {{ $t('page.entryCondition.canonicalTree') }}
          </h4>
          <Button
            v-if="detail.artifact"
            :aria-label="$t('page.entryCondition.copyArtifactHash')"
            size="small"
            type="text"
            @click="copyHash(detail.artifact.content_hash)"
          >
            <IconifyIcon class="size-4" icon="lucide:copy" />
          </Button>
        </div>
        <p v-if="!detail.artifact" class="text-muted-foreground text-sm">
          {{ $t('page.entryCondition.immediate') }}
        </p>
        <ol v-else class="flex flex-col gap-2" data-testid="condition-tree">
          <li
            v-for="node in flatTree"
            :key="`${node.nodeId}:${node.subtreeHash}`"
            class="border-border focus-visible:ring-primary rounded-md border px-3 py-2 outline-none focus-visible:ring-2"
            :style="{ marginInlineStart: `${node.depth * 16}px` }"
            :aria-label="`${node.label}, ${node.evaluation ? $t(`enum.conditionTruth.${node.evaluation.truth.kind}`) : $t('page.entryCondition.notEvaluated')}`"
            tabindex="0"
          >
            <div class="flex items-start justify-between gap-3">
              <span>{{ node.label }}</span>
              <code class="text-xs opacity-70">#{{ node.nodeId }}</code>
            </div>
            <div
              v-if="node.evaluation"
              class="mt-2 flex flex-wrap items-center gap-2"
            >
              <Tag :color="truthColor(node.evaluation.truth.kind)">
                {{ $t(`enum.conditionTruth.${node.evaluation.truth.kind}`) }}
              </Tag>
              <Tag v-if="node.evaluation.decisive_child_id !== null">
                {{ $t('page.entryCondition.decisiveChild') }}
                #{{ node.evaluation.decisive_child_id }}
              </Tag>
              <span v-if="node.evidence" class="text-muted-foreground text-xs">
                {{ $t('page.entryCondition.freshness') }}:
                {{ freshnessLabel(node.evidence.freshness_ms) }}
              </span>
              <span
                v-if="node.evidence?.unavailable_reason"
                class="text-danger text-xs"
              >
                {{ unavailableReasonLabel(node.evidence.unavailable_reason) }}
              </span>
            </div>
            <div
              class="text-muted-foreground mt-1 truncate font-mono text-xs"
              data-screenshot-volatile="true"
            >
              {{ node.subtreeHash }}
            </div>
            <Collapse v-if="node.evidence" class="mt-2" ghost>
              <CollapsePanel
                :header="$t('page.entryCondition.leafEvidence')"
                :key="`evidence-${node.nodeId}`"
              >
                <Descriptions :column="1" size="small">
                  <DescriptionsItem
                    :label="$t('page.entryCondition.observedAt')"
                  >
                    <span data-screenshot-volatile="true">
                      {{ formatDateTimeLocal(node.evidence.observed_at) }}
                    </span>
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="$t('page.entryCondition.availableAt')"
                  >
                    <span data-screenshot-volatile="true">
                      {{ formatDateTimeLocal(node.evidence.available_at) }}
                    </span>
                  </DescriptionsItem>
                </Descriptions>
                <div class="text-muted-foreground mt-2 text-xs font-medium">
                  {{ $t('page.entryCondition.evidencePayload') }}
                </div>
                <pre
                  class="bg-muted mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded p-2 text-xs"
                ><code data-screenshot-volatile="true">{{ prettyJson(node.evidence.evidence) }}</code></pre>
                <div
                  v-if="node.evidence.source_checkpoint"
                  class="text-muted-foreground mt-2 text-xs font-medium"
                >
                  {{ $t('page.entryCondition.sourceCheckpoint') }}
                </div>
                <pre
                  v-if="node.evidence.source_checkpoint"
                  class="bg-muted mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded p-2 text-xs"
                ><code data-screenshot-volatile="true">{{ prettyJson(node.evidence.source_checkpoint) }}</code></pre>
              </CollapsePanel>
            </Collapse>
          </li>
        </ol>
      </section>

      <section>
        <h4 class="mb-2 font-medium">{{ $t('page.entryCondition.audits') }}</h4>
        <Empty
          v-if="audits.length === 0"
          :description="$t('page.entryCondition.emptyAudits')"
        />
        <Timeline v-else>
          <TimelineItem v-for="audit in audits" :key="audit.audit_id">
            <div class="flex flex-col gap-1">
              <span>
                {{ $t(`enum.entryConditionAuditAction.${audit.action}`) }} ·
                {{ $t(`enum.entryConditionState.${audit.to_state}`) }}
              </span>
              <span
                class="text-muted-foreground text-xs"
                data-screenshot-volatile="true"
              >
                r{{ audit.revision }} ·
                {{ formatDateTimeLocal(audit.occurred_at) }}
              </span>
              <span v-if="audit.detail" class="text-sm">{{
                audit.detail
              }}</span>
            </div>
          </TimelineItem>
        </Timeline>
      </section>
    </div>
  </Spin>
</template>
