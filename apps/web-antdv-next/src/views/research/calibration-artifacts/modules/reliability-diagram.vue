<script lang="ts" setup>
import type { ReliabilityBinView } from '@vben/types';

import { computed } from 'vue';

import { Empty } from 'antdv-next';

import { $t } from '#/locales';

defineOptions({ name: 'ReliabilityDiagram' });

const props = defineProps<{ bins: ReliabilityBinView[] }>();

const points = computed(() =>
  props.bins.map((bin) => ({
    key: `${bin.predicted_lo}-${bin.predicted_hi}`,
    n: bin.sample_count,
    x: Number(bin.mean_predicted),
    y: Number(bin.empirical_frequency),
    ciLo: Number(bin.wilson_ci[0]),
    ciHi: Number(bin.wilson_ci[1]),
  })),
);

const size = 300;
const pad = 40;

function scale(value: number, axis: 'x' | 'y'): number {
  const inner = size - pad * 2;
  const clamped = Math.max(0, Math.min(1, value));
  if (axis === 'x') {
    return pad + clamped * inner;
  }
  return size - pad - clamped * inner;
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <Empty
      v-if="bins.length === 0"
      :description="
        $t('page.research.calibrationArtifacts.detail.reliabilityEmpty')
      "
    />
    <svg
      v-else
      :height="size"
      :width="size"
      class="rounded border border-border bg-muted/20"
      role="img"
      :aria-label="
        $t('page.research.calibrationArtifacts.detail.reliabilityTitle')
      "
    >
      <!-- Perfect-calibration diagonal reference. -->
      <line
        :x1="pad"
        :x2="size - pad"
        :y1="size - pad"
        :y2="pad"
        class="stroke-muted-foreground/40"
        stroke-dasharray="4 4"
        stroke-width="1"
      />
      <!-- Wilson CI error bars (empirical frequency, y-axis). -->
      <line
        v-for="point in points"
        :key="`ci-${point.key}`"
        :x1="scale(point.x, 'x')"
        :x2="scale(point.x, 'x')"
        :y1="scale(point.ciLo, 'y')"
        :y2="scale(point.ciHi, 'y')"
        class="stroke-primary/40"
        stroke-width="2"
      />
      <circle
        v-for="point in points"
        :key="point.key"
        :cx="scale(point.x, 'x')"
        :cy="scale(point.y, 'y')"
        :r="Math.min(8, 3 + Math.sqrt(point.n))"
        class="fill-primary/70 stroke-primary"
        stroke-width="1"
      />
      <!-- Axis ticks (0.0 / 1.0 at each end). -->
      <text
        class="fill-muted-foreground text-[10px]"
        :x="pad - 8"
        :y="size - pad + 14"
      >
        0.0
      </text>
      <text
        class="fill-muted-foreground text-[10px]"
        :x="size - pad - 8"
        :y="size - pad + 14"
      >
        1.0
      </text>
      <text
        class="fill-muted-foreground text-[10px]"
        :x="pad - 24"
        :y="size - pad + 4"
      >
        0.0
      </text>
      <text
        class="fill-muted-foreground text-[10px]"
        :x="pad - 24"
        :y="pad + 4"
      >
        1.0
      </text>
      <!-- Axis titles. -->
      <text
        class="fill-muted-foreground text-[10px]"
        :x="size / 2"
        :y="size - 6"
        text-anchor="middle"
      >
        {{ $t('page.research.calibrationArtifacts.detail.reliabilityXAxis') }}
      </text>
      <text
        class="fill-muted-foreground text-[10px]"
        :x="10"
        :y="size / 2"
        text-anchor="middle"
        :transform="`rotate(-90 10 ${size / 2})`"
      >
        {{ $t('page.research.calibrationArtifacts.detail.reliabilityYAxis') }}
      </text>
    </svg>
    <p class="text-muted-foreground text-xs">
      {{ $t('page.research.calibrationArtifacts.detail.reliabilityHint') }}
    </p>
  </div>
</template>
