<script lang="ts" setup>
import type { FeatureParityRunView } from '@vben/types';

import { computed } from 'vue';

import {
  Alert,
  Card,
  Descriptions,
  DescriptionsItem,
  Select,
  Spin,
  Tag,
} from 'antdv-next';

import { $t } from '#/locales';
import EntityRouteLink from '#/shared/components/entity-route-link.vue';
import { formatDateTimeLocal } from '#/shared/components/format';

import { recoveryRunScope } from './recovery-eligibility';

defineOptions({ name: 'FeatureParityRecoveryRunSelector' });

const props = defineProps<{
  bootstrap: boolean;
  candidates: FeatureParityRunView[];
  error: boolean;
  loading: boolean;
  modelValue?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined];
}>();

const selectedId = computed({
  get: () => props.modelValue,
  set: (value: string | undefined) => emit('update:modelValue', value),
});

const selectedRun = computed(() =>
  props.candidates.find((run) => run.parity_run_id === selectedId.value),
);

function scopeLabel(run: FeatureParityRunView): string {
  const scope = recoveryRunScope(run);
  return scope
    ? $t(`page.research.featureIntegrity.recovery.scope.${scope}`)
    : $t('page.research.featureIntegrity.recovery.scope.invalid');
}

function subjectLabel(run: FeatureParityRunView): string {
  if (run.model_version_id && run.training_dataset_id) {
    return `${run.model_version_id} / ${run.training_dataset_id}`;
  }
  return run.parity_run_id;
}

const options = computed(() =>
  props.candidates.map((run) => ({
    label: `${scopeLabel(run)} · ${formatDateTimeLocal(run.finished_at)} · ${subjectLabel(run)}`,
    value: run.parity_run_id,
  })),
);
</script>

<template>
  <Card
    size="small"
    :title="$t('page.research.featureIntegrity.recovery.title')"
  >
    <div class="flex flex-col gap-3">
      <Alert
        :message="
          bootstrap
            ? $t('page.research.featureIntegrity.recovery.bootstrapHint')
            : $t('page.research.featureIntegrity.recovery.incidentHint')
        "
        show-icon
        type="info"
      />
      <Alert
        v-if="error"
        :message="$t('page.research.featureIntegrity.recovery.loadError')"
        show-icon
        type="warning"
      />

      <Spin :spinning="loading">
        <div class="flex flex-col gap-2">
          <span class="text-sm font-medium">
            {{ $t('page.research.featureIntegrity.recovery.selectLabel') }}
          </span>
          <Select
            v-model:value="selectedId"
            allow-clear
            class="w-full"
            :disabled="loading || candidates.length === 0"
            :options="options"
            :placeholder="
              $t('page.research.featureIntegrity.recovery.selectPlaceholder')
            "
            show-search
            option-filter-prop="label"
          />
          <span class="text-muted-foreground text-xs">
            {{
              $t('page.research.featureIntegrity.recovery.candidateCount', {
                count: candidates.length,
              })
            }}
          </span>
        </div>
      </Spin>

      <Alert
        v-if="!loading && candidates.length === 0"
        :message="$t('page.research.featureIntegrity.recovery.empty')"
        show-icon
        type="warning"
      />

      <Descriptions v-if="selectedRun" :column="2" bordered size="small">
        <DescriptionsItem
          :label="$t('page.research.featureIntegrity.columns.runId')"
          :span="2"
        >
          <EntityRouteLink
            mono
            :label="selectedRun.parity_run_id"
            :to="`/research/feature-integrity?run_id=${selectedRun.parity_run_id}`"
          />
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.featureIntegrity.recovery.scopeLabel')"
        >
          <Tag
            :color="
              recoveryRunScope(selectedRun) === 'frozen_model_dataset'
                ? 'purple'
                : 'blue'
            "
          >
            {{ scopeLabel(selectedRun) }}
          </Tag>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.featureIntegrity.columns.finishedAt')"
        >
          {{ formatDateTimeLocal(selectedRun.finished_at) }}
        </DescriptionsItem>
        <DescriptionsItem
          v-if="selectedRun.model_version_id"
          :label="$t('page.research.featureIntegrity.event.model')"
          :span="2"
        >
          <EntityRouteLink
            mono
            :label="selectedRun.model_version_id"
            :to="`/research/models?open=${selectedRun.model_version_id}`"
          />
        </DescriptionsItem>
        <DescriptionsItem
          v-if="selectedRun.training_dataset_id"
          :label="$t('page.research.featureIntegrity.event.dataset')"
          :span="2"
        >
          <EntityRouteLink
            mono
            :label="selectedRun.training_dataset_id"
            :to="`/research/datasets?open=${selectedRun.training_dataset_id}`"
          />
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.featureIntegrity.columns.windowStart')"
        >
          {{ formatDateTimeLocal(selectedRun.window_start) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.featureIntegrity.columns.windowEnd')"
        >
          {{ formatDateTimeLocal(selectedRun.window_end) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.featureIntegrity.recovery.matchedRows')"
        >
          {{ selectedRun.matched_count }} / {{ selectedRun.total_count }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.featureIntegrity.run.transformHash')"
        >
          <span class="font-mono text-xs break-all">
            {{ selectedRun.transform_hash }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.featureIntegrity.run.contractHash')"
          :span="2"
        >
          <span class="font-mono text-xs break-all">
            {{ selectedRun.feature_contract_hash }}
          </span>
        </DescriptionsItem>
      </Descriptions>
    </div>
  </Card>
</template>
