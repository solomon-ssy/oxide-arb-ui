<script lang="ts" setup>
import type {
  FeatureContractView,
  ModelInputContract,
  ModelInputRequiredness,
  ModelInputSpec,
} from '@vben/types';

import { computed, onMounted } from 'vue';

import { Alert, Button, Select, Spin } from 'antdv-next';

import { $t } from '#/locales';

import { useFeatureContract } from './feature-contract';
import { featureContractOptions } from './feature-contract-options';

defineOptions({ name: 'InputContractEditor' });

const props = withDefaults(
  defineProps<{
    readOnly?: boolean;
  }>(),
  { readOnly: false },
);

const emit = defineEmits<{
  catalogLoaded: [contract: FeatureContractView];
}>();

const model = defineModel<ModelInputContract>({ required: true });
const { contract, loadError, loading, reload } = useFeatureContract();

const featureOptions = computed(() =>
  contract.value ? featureContractOptions(contract.value) : [],
);

const requirednessOptions = computed(() => [
  {
    label: $t('page.research.modelSpecs.inputContract.required'),
    value: 'required' satisfies ModelInputRequiredness,
  },
  {
    label: $t('page.research.modelSpecs.inputContract.optional'),
    value: 'optional' satisfies ModelInputRequiredness,
  },
]);

const selectedFeatures = computed({
  get: () => model.value.inputs.map((input) => input.feature_name),
  set: (names: string[]) => {
    const current = new Map(
      model.value.inputs.map((input) => [input.feature_name, input]),
    );
    model.value = {
      inputs: names.map(
        (featureName): ModelInputSpec =>
          current.get(featureName) ?? {
            feature_name: featureName,
            requiredness: 'required',
          },
      ),
    };
  },
});

function setRequiredness(index: number, requiredness: ModelInputRequiredness) {
  model.value = {
    inputs: model.value.inputs.map((input, inputIndex) =>
      inputIndex === index ? { ...input, requiredness } : input,
    ),
  };
}

function move(index: number, delta: -1 | 1) {
  const target = index + delta;
  if (target < 0 || target >= model.value.inputs.length) return;
  const inputs = [...model.value.inputs];
  const current = inputs[index];
  const other = inputs[target];
  if (!current || !other) return;
  inputs[index] = other;
  inputs[target] = current;
  model.value = { inputs };
}

async function loadCatalog() {
  const loaded = await reload();
  if (loaded) {
    emit('catalogLoaded', loaded);
  }
}

onMounted(() => {
  if (!props.readOnly) {
    void loadCatalog();
  }
});
</script>

<template>
  <div class="flex flex-col gap-3">
    <Alert
      v-if="!props.readOnly && loadError"
      show-icon
      type="error"
      :message="$t('page.research.modelSpecs.inputContract.catalogLoadError')"
    >
      <template #action>
        <Button size="small" @click="loadCatalog">
          {{ $t('page.research.modelSpecs.inputContract.retry') }}
        </Button>
      </template>
    </Alert>
    <Spin v-if="!props.readOnly" :spinning="loading">
      <Select
        v-model:value="selectedFeatures"
        :aria-label="
          $t('page.research.modelSpecs.inputContract.selectFeatures')
        "
        :disabled="props.readOnly || loading || loadError"
        :options="featureOptions"
        mode="multiple"
        option-filter-prop="label"
        show-search
        :placeholder="$t('page.research.modelSpecs.inputContract.placeholder')"
      />
    </Spin>
    <p class="text-muted-foreground text-xs">
      {{ $t('page.research.modelSpecs.inputContract.help') }}
    </p>
    <p v-if="!props.readOnly && contract" class="text-muted-foreground text-xs">
      {{
        $t('page.research.modelSpecs.inputContract.catalogBinding', {
          hash: contract.feature_schema_hash,
          version: contract.feature_schema_version,
        })
      }}
    </p>

    <div
      v-for="(input, index) in model.inputs"
      :key="input.feature_name"
      class="flex items-center gap-2"
    >
      <code class="min-w-0 flex-1 truncate text-xs">{{
        input.feature_name
      }}</code>
      <span v-if="props.readOnly" class="text-muted-foreground w-36 text-sm">
        {{
          input.requiredness === 'required'
            ? $t('page.research.modelSpecs.inputContract.required')
            : $t('page.research.modelSpecs.inputContract.optional')
        }}
      </span>
      <Select
        v-else
        :aria-label="
          $t('page.research.modelSpecs.inputContract.requirednessFor', {
            feature: input.feature_name,
          })
        "
        :options="requirednessOptions"
        :value="input.requiredness"
        class="w-36"
        @update:value="setRequiredness(index, $event as ModelInputRequiredness)"
      />
      <template v-if="!props.readOnly">
        <Button
          :aria-label="
            $t('page.research.modelSpecs.inputContract.moveUp', {
              feature: input.feature_name,
            })
          "
          :disabled="index === 0"
          size="small"
          @click="move(index, -1)"
        >
          ↑
        </Button>
        <Button
          :aria-label="
            $t('page.research.modelSpecs.inputContract.moveDown', {
              feature: input.feature_name,
            })
          "
          :disabled="index === model.inputs.length - 1"
          size="small"
          @click="move(index, 1)"
        >
          ↓
        </Button>
      </template>
    </div>
  </div>
</template>

<style scoped>
:deep(.ant-select) {
  width: 100%;
}
</style>
