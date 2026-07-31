<script lang="ts" setup>
import type { BacktestPathSetView, GateOutcome } from '@vben/types';

import { computed } from 'vue';
import { useRouter } from 'vue-router';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Empty,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  TypographyText,
} from 'antdv-next';

import { $t } from '#/locales';
import EntityRouteLink from '#/shared/components/entity-route-link.vue';
import { formatDateTimeLocal, formatScore } from '#/shared/components/format';

import SharpeDistributionChart from './sharpe-distribution-chart.vue';

defineOptions({ name: 'CpcvValidationPanel' });

const props = withDefaults(
  defineProps<{
    /** Active CPCV research job id (for deep-link while running). */
    activeJobId?: null | string;
    /** CPCV alpha gate rows from the selected validation evidence. */
    gateOutcomes?: GateOutcome[];
    /** When true, a CPCV job is queued/running for this model. */
    inProgress?: boolean;
    pathSet?: BacktestPathSetView | null;
    /** Historical path sets for the model (newest first). */
    pathSets?: BacktestPathSetView[];
    /** Completion fraction in `[0, 1]` when known. */
    progressPct?: null | number;
    /** Job progress phase name (e.g. `cpcv`, `trial_grid`). */
    progressPhase?: null | string;
    /** Currently selected path set id (controlled). */
    selectedPathSetId?: null | string;
  }>(),
  {
    inProgress: false,
    pathSet: null,
    pathSets: () => [],
    selectedPathSetId: null,
    gateOutcomes: () => [],
    activeJobId: null,
    progressPhase: null,
    progressPct: null,
  },
);

const emit = defineEmits<{
  'update:selectedPathSetId': [id: string];
}>();

const router = useRouter();

function onPathSetSelect(value: unknown) {
  if (typeof value === 'string' && value.length > 0) {
    emit('update:selectedPathSetId', value);
  }
}

const paths = computed(() => {
  const rows = props.pathSet?.paths;
  return Array.isArray(rows) ? rows : [];
});

const pathColumns = computed(() => [
  {
    title: $t('page.research.cpcv.pathIndex'),
    dataIndex: 'path_index',
    key: 'path_index',
    width: 56,
  },
  {
    title: $t('page.research.cpcv.pathSharpe'),
    dataIndex: 'sharpe',
    key: 'sharpe',
  },
  {
    title: $t('page.research.cpcv.pathRankIc'),
    dataIndex: 'rank_ic',
    key: 'rank_ic',
  },
  {
    title: $t('page.research.cpcv.pathMaxDrawdown'),
    dataIndex: 'max_drawdown',
    key: 'max_drawdown',
  },
  {
    title: $t('page.research.cpcv.pathTailLoss'),
    dataIndex: 'tail_loss',
    key: 'tail_loss',
  },
]);

const historyOptions = computed(() =>
  (props.pathSets ?? []).map((row) => ({
    label: `${formatDateTimeLocal(row.created_at)} · ${row.path_set_id.slice(0, 8)}`,
    value: row.path_set_id,
  })),
);

const showGateTags = computed(() => props.gateOutcomes.length > 0);

function gateFor(id: GateOutcome['gate']): GateOutcome | undefined {
  return props.gateOutcomes.find((row) => row.gate === id);
}

function gateTag(outcome: GateOutcome | undefined): null | {
  color: string;
  label: string;
} {
  if (!outcome || outcome.status === 'not_applicable') {
    return null;
  }
  const pass = outcome.status === 'pass';
  let color: string;
  if (pass) {
    color = 'success';
  } else if (outcome.status === 'fail') {
    color = 'error';
  } else {
    color = 'warning';
  }
  return {
    color,
    label: pass
      ? $t('page.research.cpcv.gatePass')
      : $t('page.research.cpcv.gateFail'),
  };
}

function formatProbability(value: null | string | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return value;
  }
  return `${(n * 100).toFixed(1)}%`;
}

function thresholdOp(gateId: GateOutcome['gate']): string {
  // PBO is an upper bound (≤ max_pbo); rank IC / DSR are lower bounds (≥).
  return gateId === 'pbo'
    ? $t('page.research.cpcv.thresholdMax')
    : $t('page.research.cpcv.thresholdMin');
}

function metricWithGate(
  observed: string,
  gateId: GateOutcome['gate'],
): { gate: ReturnType<typeof gateTag>; observed: string } {
  const outcome = showGateTags.value ? gateFor(gateId) : undefined;
  const threshold =
    outcome && outcome.threshold !== 'n/a'
      ? ` (${thresholdOp(gateId)} ${outcome.threshold})`
      : '';
  return {
    observed: `${observed}${threshold}`,
    gate: gateTag(outcome),
  };
}

function formatMinTrl(secs: null | number | undefined): string {
  if (secs === null || secs === undefined) {
    return $t('page.research.cpcv.minTrlUnavailable');
  }
  if (secs < 60) {
    return $t('page.research.cpcv.minTrlSeconds', { n: secs });
  }
  if (secs < 3600) {
    const minutes = Math.floor(secs / 60);
    const rem = secs % 60;
    return rem === 0
      ? $t('page.research.cpcv.minTrlMinutes', { n: minutes })
      : $t('page.research.cpcv.minTrlMinutesSeconds', {
          m: minutes,
          s: rem,
        });
  }
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  return minutes === 0
    ? $t('page.research.cpcv.minTrlHours', { n: hours })
    : $t('page.research.cpcv.minTrlHoursMinutes', { h: hours, m: minutes });
}

const progressPercent = computed(() => {
  const pct = props.progressPct;
  if (pct === null || pct === undefined || !Number.isFinite(pct)) {
    return null;
  }
  return Math.round(Math.min(1, Math.max(0, pct)) * 100);
});

const progressPhaseLabel = computed(() => {
  const phase = props.progressPhase;
  if (!phase) {
    return $t('page.research.cpcv.inProgress');
  }
  const key = `page.research.cpcv.phase.${phase}`;
  const translated = $t(key);
  return translated === key ? phase : translated;
});

function openActiveJob() {
  if (!props.activeJobId) {
    return;
  }
  void router.push(`/research/jobs?open=${props.activeJobId}`);
}

const rankIcMetric = computed(() =>
  props.pathSet
    ? metricWithGate(formatScore(props.pathSet.median_rank_ic), 'rank_ic')
    : null,
);
const dsrMetric = computed(() =>
  props.pathSet
    ? metricWithGate(
        formatScore(props.pathSet.deflated_sharpe),
        'deflated_sharpe',
      )
    : null,
);
const pboMetric = computed(() =>
  props.pathSet
    ? metricWithGate(formatProbability(props.pathSet.pbo), 'pbo')
    : null,
);
const baselineUpliftMetric = computed(() => {
  const uplift = props.pathSet?.sharpe_distribution?.baseline_uplift;
  if (uplift === null || uplift === undefined || uplift === '') {
    return null;
  }
  return metricWithGate(formatScore(uplift), 'sell_baseline_uplift');
});
</script>

<template>
  <Alert v-if="inProgress" class="mb-4" show-icon type="info">
    <template #message>
      <div class="flex flex-col gap-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span>{{ progressPhaseLabel }}</span>
          <Button
            v-if="activeJobId"
            size="small"
            type="link"
            @click="openActiveJob"
          >
            {{ $t('page.research.cpcv.viewJob') }}
          </Button>
        </div>
        <Progress
          v-if="progressPercent !== null"
          :percent="progressPercent"
          size="small"
          status="active"
        />
        <span v-else class="text-muted-foreground text-xs">
          {{ $t('page.research.cpcv.inProgressIndeterminate') }}
        </span>
      </div>
    </template>
  </Alert>
  <Empty
    v-if="!pathSet"
    :description="$t('page.research.cpcv.empty')"
    :image="Empty.PRESENTED_IMAGE_SIMPLE"
  />
  <div v-else class="flex flex-col gap-4">
    <Alert
      :message="$t('page.research.cpcv.sharpeUnannualized')"
      show-icon
      type="info"
    />
    <div class="flex flex-wrap items-center gap-2">
      <div v-if="historyOptions.length > 1" class="flex items-center gap-2">
        <span class="text-muted-foreground text-sm">
          {{ $t('page.research.cpcv.history') }}
        </span>
        <Select
          class="min-w-64"
          :options="historyOptions"
          :value="selectedPathSetId ?? pathSet.path_set_id"
          @update:value="onPathSetSelect"
        />
      </div>
    </div>
    <Descriptions bordered :column="2" size="small">
      <DescriptionsItem :label="$t('page.research.cpcv.pathSetId')">
        <TypographyText code copyable>
          {{ pathSet.path_set_id }}
        </TypographyText>
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.research.cpcv.createdAt')">
        {{ formatDateTimeLocal(pathSet.created_at) }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.research.cpcv.pathCount')">
        {{ pathSet.path_count }} / {{ pathSet.combination_count }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.research.cpcv.medianRankIc')">
        <Space>
          <span>{{ rankIcMetric?.observed }}</span>
          <Tag v-if="rankIcMetric?.gate" :color="rankIcMetric.gate.color">
            {{ rankIcMetric.gate.label }}
          </Tag>
        </Space>
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.research.cpcv.deflatedSharpe')">
        <Space>
          <span>{{ dsrMetric?.observed }}</span>
          <Tag v-if="dsrMetric?.gate" :color="dsrMetric.gate.color">
            {{ dsrMetric.gate.label }}
          </Tag>
        </Space>
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.research.cpcv.dsrBenchmark')">
        {{ formatScore(pathSet.dsr_benchmark_sharpe) }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.research.cpcv.pbo')">
        <Space>
          <span>{{ pboMetric?.observed }}</span>
          <Tag v-if="pboMetric?.gate" :color="pboMetric.gate.color">
            {{ pboMetric.gate.label }}
          </Tag>
        </Space>
      </DescriptionsItem>
      <DescriptionsItem
        v-if="baselineUpliftMetric"
        :label="$t('page.research.cpcv.baselineUplift')"
      >
        <Space>
          <span>{{ baselineUpliftMetric.observed }}</span>
          <Tag
            v-if="baselineUpliftMetric.gate"
            :color="baselineUpliftMetric.gate.color"
          >
            {{ baselineUpliftMetric.gate.label }}
          </Tag>
        </Space>
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.research.cpcv.minTrl')">
        {{ formatMinTrl(pathSet.min_track_record_length_secs) }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.research.cpcv.trialCount')">
        {{ pathSet.trial_count }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.research.cpcv.trialGridCount')">
        {{ pathSet.trial_grid_count }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.research.cpcv.coordSearchEffectiveN')">
        {{ pathSet.coord_search_effective_n }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.research.cpcv.pathSetHash')">
        <TypographyText code copyable class="text-xs break-all">
          {{ pathSet.path_set_hash }}
        </TypographyText>
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.research.cpcv.window')">
        {{ formatDateTimeLocal(pathSet.window_start) }}
        →
        {{ formatDateTimeLocal(pathSet.window_end) }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.research.cpcv.dataset')">
        <EntityRouteLink
          mono
          :label="pathSet.training_dataset_id"
          :to="`/research/datasets?open=${pathSet.training_dataset_id}`"
        />
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('page.research.cpcv.decisionPolicySnapshot')"
      >
        <TypographyText code copyable class="text-xs break-all">
          {{ pathSet.decision_policy_snapshot_id }}
        </TypographyText>
      </DescriptionsItem>
    </Descriptions>

    <Card size="small" :title="$t('page.research.cpcv.sharpeDistribution')">
      <SharpeDistributionChart :distribution="pathSet.sharpe_distribution" />
    </Card>

    <Card size="small" :title="$t('page.research.cpcv.paths')">
      <Table
        :columns="pathColumns"
        :data-source="paths"
        :pagination="false"
        row-key="path_index"
        size="small"
      />
    </Card>
  </div>
</template>
