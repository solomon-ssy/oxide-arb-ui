<script lang="ts" setup>
import type {
  EntryConditionAuditView,
  EntryConditionDetailView,
  EntryConditionNodeV1,
} from '@vben/types';

import { computed, onMounted, ref, watch } from 'vue';

import { useRequestHandler } from '@vben/request/qp';

import {
  Alert,
  Descriptions,
  DescriptionsItem,
  Empty,
  Spin,
  Tag,
  Timeline,
  TimelineItem,
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

interface FlatNode {
  depth: number;
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
  let index = 0;
  const visit = (node: EntryConditionNodeV1, depth: number) => {
    const identity = artifact.nodes[index];
    rows.push({
      depth,
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
      <Descriptions :column="1" bordered size="small">
        <DescriptionsItem :label="$t('page.entryCondition.state')">
          <Tag>
            {{ $t(`enum.entryConditionState.${detail.instance.state}`) }}
          </Tag>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.entryCondition.truth')">
          <Tag
            v-if="truthKind"
            :color="
              truthKind === 'satisfied'
                ? 'green'
                : truthKind === 'unavailable'
                  ? 'red'
                  : 'orange'
            "
          >
            {{ $t(`enum.conditionTruth.${truthKind}`) }}
          </Tag>
          <template v-else>{{ EMPTY_PLACEHOLDER }}</template>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.entryCondition.revision')">
          {{ detail.instance.revision }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.entryCondition.confirmation')">
          {{ formatDateTimeLocal(detail.instance.confirmation_started_at) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.entryCondition.lastEvaluatedAt')">
          {{ formatDateTimeLocal(detail.instance.last_evaluated_at) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.entryCondition.nextEvaluationAt')">
          {{ formatDateTimeLocal(detail.instance.next_evaluation_at) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.entryCondition.evaluationHash')">
          <span class="font-mono text-xs break-all">
            {{ detail.instance.evaluation_hash ?? EMPTY_PLACEHOLDER }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.entryCondition.inputFingerprint')">
          <span class="font-mono text-xs break-all">
            {{ detail.instance.input_fingerprint ?? EMPTY_PLACEHOLDER }}
          </span>
        </DescriptionsItem>
      </Descriptions>

      <section>
        <h4 class="mb-2 font-medium">
          {{ $t('page.entryCondition.canonicalTree') }}
        </h4>
        <p v-if="!detail.artifact" class="text-muted-foreground text-sm">
          {{ $t('page.entryCondition.immediate') }}
        </p>
        <ol v-else class="flex flex-col gap-2" data-testid="condition-tree">
          <li
            v-for="node in flatTree"
            :key="`${node.nodeId}:${node.subtreeHash}`"
            class="border-border rounded-md border px-3 py-2"
            :style="{ marginInlineStart: `${node.depth * 16}px` }"
          >
            <div class="flex items-start justify-between gap-3">
              <span>{{ node.label }}</span>
              <code class="text-xs opacity-70">#{{ node.nodeId }}</code>
            </div>
            <div class="text-muted-foreground mt-1 truncate font-mono text-xs">
              {{ node.subtreeHash }}
            </div>
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
              <span class="text-muted-foreground text-xs">
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
