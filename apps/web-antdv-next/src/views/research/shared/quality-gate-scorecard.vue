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

    <div class="flex flex-col">
      <div
        v-for="outcome in parsed.evaluated"
        :key="`${outcome.class}-${outcome.gate}`"
        class="flex items-center justify-between gap-2 border-b py-1.5 text-xs last:border-b-0"
      >
        <div class="flex min-w-0 items-center gap-2">
          <span class="truncate font-medium">{{
            gateLabel(outcome.gate)
          }}</span>
          <Tag
            :color="outcome.class === 'hard' ? 'default' : 'blue'"
            :bordered="false"
          >
            {{ classLabel(outcome.class) }}
          </Tag>
        </div>
        <div class="flex flex-shrink-0 items-center gap-2">
          <span class="text-muted-foreground font-mono">
            {{ outcome.observed }}
            <span class="opacity-60">/ {{ outcome.threshold }}</span>
          </span>
          <Tooltip v-if="showDetail(outcome)" :title="outcome.detail">
            <IconifyIcon
              class="text-muted-foreground size-3.5 cursor-help"
              icon="lucide:info"
            />
          </Tooltip>
          <Tag :color="gateStatusColor(outcome.status)">
            {{ statusLabel(outcome.status) }}
          </Tag>
        </div>
      </div>
    </div>

    <Collapse v-if="parsed.notApplicable.length > 0" ghost>
      <CollapsePanel
        key="na"
        :header="
          $t('page.research.qualityGate.notApplicable', {
            count: parsed.notApplicable.length,
          })
        "
      >
        <div class="flex flex-col">
          <div
            v-for="outcome in parsed.notApplicable"
            :key="outcome.gate"
            class="flex items-center justify-between gap-2 border-b py-1.5 text-xs last:border-b-0"
          >
            <span class="truncate font-medium">{{
              gateLabel(outcome.gate)
            }}</span>
            <span class="text-muted-foreground truncate">{{
              outcome.detail
            }}</span>
          </div>
        </div>
      </CollapsePanel>
    </Collapse>
  </div>
</template>
