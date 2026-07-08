<script lang="ts" setup>
import type { ReliabilityBinView } from '@vben/types';

import { computed } from 'vue';

import { $t } from '#/locales';

defineOptions({ name: 'ReliabilityDiagram' });

const props = defineProps<{ bins: ReliabilityBinView[] }>();

const points = computed(() =>
  props.bins.map((bin) => ({
    key: `${bin.score_lo}-${bin.score_hi}`,
    n: bin.sample_count,
    x: Number(bin.mean_predicted),
    y: Number(bin.empirical_frequency),
  })),
);

const size = 280;
const pad = 28;

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
    <svg
      :height="size"
      :width="size"
      class="rounded border border-border bg-muted/20"
      role="img"
    >
      <line
        :x1="pad"
        :x2="size - pad"
        :y1="size - pad"
        :y2="pad"
        class="stroke-muted-foreground/40"
        stroke-dasharray="4 4"
        stroke-width="1"
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
      <text class="fill-muted-foreground text-[10px]" x="4" y="14">1.0</text>
      <text
        class="fill-muted-foreground text-[10px]"
        :x="size - 18"
        :y="size - 6"
      >
        1.0
      </text>
    </svg>
    <p class="text-muted-foreground text-xs">
      {{ $t('page.research.calibrationArtifacts.detail.reliabilityHint') }}
    </p>
  </div>
</template>
