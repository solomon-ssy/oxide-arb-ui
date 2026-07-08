<script lang="ts" setup>
import type { GateOutcome, QualityGateReportView } from '@vben/types';

import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Alert,
  Collapse,
  CollapsePanel,
  Empty,
  Skeleton,
  Tag,
  Tooltip,
} from 'antdv-next';

import { $t } from '#/locales';
import DataList from '#/shared/components/data-list.vue';
import { formatDateTimeLocal } from '#/shared/components/format';

import { gateStatusColor, parseQualityGate } from './quality-gate';

defineOptions({ name: 'QualityGateScorecard' });

const props = withDefaults(
  defineProps<{
    loading?: boolean;
    report?: null | QualityGateReportView;
  }>(),
  { loading: false, report: null },
);

const parsed = computed(() => parseQualityGate(props.report));

const verdict = computed(() => {
  switch (parsed.value?.verdict) {
    case 'blocked': {
      return {
        message: $t('page.research.qualityGate.verdict.blocked', {
          count: parsed.value.hardFailures.length,
        }),
        type: 'error' as const,
      };
    }
    case 'ready': {
      return {
        message: $t('page.research.qualityGate.verdict.ready'),
        type: 'success' as const,
      };
    }
    case 'warnings': {
      return {
        message: $t('page.research.qualityGate.verdict.warnings', {
          count: parsed.value.softWarnings.length,
        }),
        type: 'warning' as const,
      };
    }
    default: {
      return null;
    }
  }
});

const intentLabel = computed(() => {
  const intent = props.report?.intent;
  if (!intent) {
    return '';
  }
  const key = `enum.gatePreviewIntent.${intent}`;
  const label = $t(key);
  return label === key ? intent : label;
});

interface EvaluatedRow extends GateOutcome {
  key: string;
}

interface NotApplicableRow {
  detail: string;
  gate: string;
  key: string;
}

type BodyCell<T> = {
  column: { key?: string };
  record: T;
};

function asBodyCell<T extends object>(slotProps: unknown): BodyCell<T> {
  return slotProps as BodyCell<T>;
}

function asEvaluatedBodyCell(slotProps: unknown): BodyCell<EvaluatedRow> {
  return asBodyCell<EvaluatedRow>(slotProps);
}

function asNotApplicableBodyCell(
  slotProps: unknown,
): BodyCell<NotApplicableRow> {
  return asBodyCell<NotApplicableRow>(slotProps);
}

const evaluatedRows = computed<EvaluatedRow[]>(() =>
  (parsed.value?.evaluated ?? []).map((outcome) => ({
    ...outcome,
    key: `${outcome.class}-${outcome.gate}`,
  })),
);

const notApplicableRows = computed<NotApplicableRow[]>(() =>
  (parsed.value?.notApplicable ?? []).map((outcome) => ({
    ...outcome,
    key: outcome.gate,
  })),
);

const evaluatedColumns = computed(() => [
  { dataIndex: 'gate', key: 'gate' },
  {
    align: 'right' as const,
    dataIndex: 'metrics',
    key: 'metrics',
  },
]);

const notApplicableColumns = computed(() => [
  { dataIndex: 'gate', key: 'gate' },
  {
    align: 'right' as const,
    dataIndex: 'detail',
    key: 'detail',
  },
]);

function gateLabel(gate: string): string {
  const key = `enum.qualityGate.${gate}`;
  const label = $t(key);
  return label === key ? gate : label;
}

function classLabel(gateClass: string): string {
  return $t(`enum.gateClass.${gateClass}`);
}

function statusLabel(status: string): string {
  return $t(`enum.gateStatus.${status}`);
}

/** Detail is only meaningful (and truthful) for a failing / warning row. */
function showDetail(outcome: GateOutcome): boolean {
  return (
    (outcome.status === 'fail' || outcome.status === 'warn') &&
    outcome.detail.length > 0
  );
}
</script>

<template>
  <Skeleton v-if="loading && !parsed" active :paragraph="{ rows: 3 }" />
  <Empty
    v-else-if="!parsed"
    :description="$t('page.research.qualityGate.empty')"
    :image="Empty.PRESENTED_IMAGE_SIMPLE"
  />
  <div v-else class="flex flex-col gap-3">
    <Alert
      v-if="verdict"
      :message="verdict.message"
      :type="verdict.type"
      show-icon
    >
      <template #description>
        <span class="text-xs">
          {{ $t('page.research.qualityGate.intentLabel') }}: {{ intentLabel }}
          <span v-if="report?.evaluated_at" class="text-muted-foreground">
            · {{ formatDateTimeLocal(report.evaluated_at) }}
          </span>
        </span>
      </template>
    </Alert>

    <DataList
      :columns="evaluatedColumns"
      :data-source="evaluatedRows"
      row-key="key"
    >
      <template #bodyCell="slotProps">
        <template v-if="asEvaluatedBodyCell(slotProps).column.key === 'gate'">
          <div class="flex min-w-0 items-center gap-2 text-xs">
            <span class="truncate font-medium">{{
              gateLabel(asEvaluatedBodyCell(slotProps).record.gate)
            }}</span>
            <Tag
              :color="
                asEvaluatedBodyCell(slotProps).record.class === 'hard'
                  ? 'default'
                  : 'blue'
              "
              :bordered="false"
            >
              {{ classLabel(asEvaluatedBodyCell(slotProps).record.class) }}
            </Tag>
          </div>
        </template>
        <template
          v-else-if="asEvaluatedBodyCell(slotProps).column.key === 'metrics'"
        >
          <div
            class="flex flex-shrink-0 items-center justify-end gap-2 text-xs"
          >
            <span class="text-muted-foreground font-mono">
              {{ asEvaluatedBodyCell(slotProps).record.observed }}
              <span class="opacity-60">
                / {{ asEvaluatedBodyCell(slotProps).record.threshold }}
              </span>
            </span>
            <Tooltip
              v-if="showDetail(asEvaluatedBodyCell(slotProps).record)"
              :title="asEvaluatedBodyCell(slotProps).record.detail"
            >
              <IconifyIcon
                class="text-muted-foreground size-3.5 cursor-help"
                icon="lucide:info"
              />
            </Tooltip>
            <Tag
              :color="
                gateStatusColor(asEvaluatedBodyCell(slotProps).record.status)
              "
            >
              {{ statusLabel(asEvaluatedBodyCell(slotProps).record.status) }}
            </Tag>
          </div>
        </template>
      </template>
    </DataList>

    <Collapse v-if="notApplicableRows.length > 0" ghost>
      <CollapsePanel
        key="na"
        :header="
          $t('page.research.qualityGate.notApplicable', {
            count: notApplicableRows.length,
          })
        "
      >
        <DataList
          :columns="notApplicableColumns"
          :data-source="notApplicableRows"
          row-key="key"
        >
          <template #bodyCell="slotProps">
            <template
              v-if="asNotApplicableBodyCell(slotProps).column.key === 'gate'"
            >
              <span class="truncate text-xs font-medium">{{
                gateLabel(asNotApplicableBodyCell(slotProps).record.gate)
              }}</span>
            </template>
            <template
              v-else-if="
                asNotApplicableBodyCell(slotProps).column.key === 'detail'
              "
            >
              <span class="text-muted-foreground truncate text-xs">{{
                asNotApplicableBodyCell(slotProps).record.detail
              }}</span>
            </template>
          </template>
        </DataList>
      </CollapsePanel>
    </Collapse>
  </div>
</template>
