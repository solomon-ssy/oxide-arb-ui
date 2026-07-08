<script lang="ts" setup>
import type { MarketCategory, ModelFeatureRequirements } from '@vben/types';

import { computed, onMounted, ref, watch } from 'vue';

import { MARKET_CATEGORIES } from '@vben/types';

import { Button, Select, Spin } from 'antdv-next';

import { $t } from '#/locales';

import {
  CRYPTO_FEATURE_REQUIREMENTS_TEMPLATE,
  useGovernedFeatureNames,
} from './governed-feature-names';

defineOptions({ name: 'FeatureRequirementsEditor' });

const props = withDefaults(
  defineProps<{
    readOnly?: boolean;
  }>(),
  { readOnly: false },
);

const model = defineModel<ModelFeatureRequirements>({ required: true });

const { featureOptions, loading, reload } = useGovernedFeatureNames();

const categoryOptions = computed(() =>
  Object.values(MARKET_CATEGORIES).map((value) => ({
    label: $t(`enum.marketCategory.${value}`),
    value,
  })),
);

const selectedCategory = ref<MarketCategory>(MARKET_CATEGORIES.crypto);

const categoryFeatures = computed({
  get() {
    const category = selectedCategory.value;
    if (!category) {
      return [];
    }
    return model.value.by_category[category] ?? [];
  },
  set(features: string[]) {
    const category = selectedCategory.value;
    if (!category) {
      return;
    }
    model.value = {
      ...model.value,
      by_category: {
        ...model.value.by_category,
        [category]: features,
      },
    };
  },
});

function applyCryptoTemplate() {
  selectedCategory.value = MARKET_CATEGORIES.crypto;
  model.value = {
    ...model.value,
    by_category: {
      ...model.value.by_category,
      [MARKET_CATEGORIES.crypto]: [...CRYPTO_FEATURE_REQUIREMENTS_TEMPLATE],
    },
  };
}

function clearCategoryRequirements() {
  const category = selectedCategory.value;
  if (!category) {
    return;
  }
  const next = { ...model.value.by_category };
  delete next[category];
  model.value = {
    ...model.value,
    by_category: next,
  };
}

onMounted(() => {
  void reload();
});

watch(
  () => model.value,
  (value) => {
    if (!value.by_category) {
      model.value = { ...value, by_category: {} };
    }
  },
  { immediate: true, deep: true },
);
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-1">
      <span class="text-sm font-medium">
        {{ $t('page.research.modelSpecs.featureRequirements.generic') }}
      </span>
      <Spin :spinning="loading">
        <Select
          v-model:value="model.generic"
          :disabled="props.readOnly"
          :options="featureOptions"
          mode="multiple"
          option-filter-prop="label"
          show-search
          :placeholder="
            $t(
              'page.research.modelSpecs.featureRequirements.genericPlaceholder',
            )
          "
        />
      </Spin>
      <p class="text-muted-foreground text-xs">
        {{ $t('page.research.modelSpecs.featureRequirements.genericHelp') }}
      </p>
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-sm font-medium">
          {{ $t('page.research.modelSpecs.featureRequirements.byCategory') }}
        </span>
        <div v-if="!props.readOnly" class="flex flex-wrap gap-2">
          <Button size="small" type="default" @click="applyCryptoTemplate()">
            {{
              $t('page.research.modelSpecs.featureRequirements.cryptoTemplate')
            }}
          </Button>
          <Button size="small" type="link" @click="clearCategoryRequirements()">
            {{
              $t('page.research.modelSpecs.featureRequirements.clearCategory')
            }}
          </Button>
        </div>
      </div>
      <Select
        v-model:value="selectedCategory"
        :disabled="props.readOnly"
        :options="categoryOptions"
        class="max-w-xs"
      />
      <Spin :spinning="loading">
        <Select
          v-model:value="categoryFeatures"
          :disabled="props.readOnly || !selectedCategory"
          :options="featureOptions"
          mode="multiple"
          option-filter-prop="label"
          show-search
          :placeholder="
            $t(
              'page.research.modelSpecs.featureRequirements.categoryPlaceholder',
            )
          "
        />
      </Spin>
      <p class="text-muted-foreground text-xs">
        {{ $t('page.research.modelSpecs.featureRequirements.categoryHelp') }}
      </p>
    </div>
  </div>
</template>

<style scoped>
:deep(.ant-select) {
  width: 100%;
}
</style>
