<script lang="ts" setup>
import type { ModelPickerSide, PublishedModelOptionView } from '@vben/types';
import type { MarketCategory, ModelRouting } from '@vben/types/config-api';

import { computed, onMounted, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { useRequestHandler } from '@vben/request/qp';

import { Alert, Select, Tag } from 'antdv-next';

import { listPublishedModelOptions } from '#/api/research';
import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';

defineOptions({ name: 'ModelRoutingPicker' });

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    modelValue: ModelRouting;
  }>(),
  { disabled: false },
);

const emit = defineEmits<{
  'update:modelValue': [value: ModelRouting];
}>();

type ModelConfig = NonNullable<ModelRouting['model']>;
type GlobalPointerKey =
  | 'active_exit_model_version_id'
  | 'active_model_version_id'
  | 'shadow_model_version_id';

interface GlobalRouteDefinition {
  key: GlobalPointerKey;
  labelKey: string;
  side: ModelPickerSide;
}

const { handleRequest } = useRequestHandler();
const loading = ref(true);
const loadError = ref(false);
const buyOptions = ref<PublishedModelOptionView[]>([]);
const sellOptions = ref<PublishedModelOptionView[]>([]);

const categories: MarketCategory[] = [
  'crypto',
  'culture',
  'economics',
  'finance',
  'geopolitics',
  'other',
  'politics',
  'sports',
  'tech',
  'weather',
];

const globalRoutes = computed<GlobalRouteDefinition[]>(() => [
  {
    key: 'active_model_version_id',
    labelKey: 'page.config.modelRouting.activeBuy',
    side: 'buy',
  },
  {
    key: 'shadow_model_version_id',
    labelKey: 'page.config.modelRouting.shadowBuy',
    side: 'buy',
  },
  {
    key: 'active_exit_model_version_id',
    labelKey: 'page.config.modelRouting.activeExit',
    side: 'sell',
  },
]);

const model = computed<ModelConfig>(() => props.modelValue.model ?? {});

function catalog(side: ModelPickerSide) {
  return side === 'buy' ? buyOptions.value : sellOptions.value;
}

function pointerValue(key: GlobalPointerKey) {
  return model.value[key] ?? undefined;
}

function categoryPointerValue(category: MarketCategory) {
  return model.value.category_model_pointers?.[category];
}

function selectableOptions(
  side: ModelPickerSide,
  current: null | string | undefined,
  category?: MarketCategory,
) {
  const eligible = catalog(side).filter((option) =>
    category === undefined
      ? option.category_scope === null
      : option.category_scope === category,
  );
  const options = eligible.map((option) => ({
    disabled: false,
    label: `${option.spec_name} · v${option.version} · ${modelFamilyLabel(option.model_family)}`,
    value: option.model_version_id,
  }));
  if (current && !eligible.some((item) => item.model_version_id === current)) {
    options.unshift({
      disabled: true,
      label: $t('page.config.modelRouting.unavailableReference', {
        id: shortId(current),
      }),
      value: current,
    });
  }
  return options;
}

function selectedOption(id: null | string | undefined) {
  if (!id) {
    return undefined;
  }
  return [...buyOptions.value, ...sellOptions.value].find(
    (option) => option.model_version_id === id,
  );
}

function updateGlobalPointer(key: GlobalPointerKey, value: unknown) {
  const nextValue =
    typeof value === 'string' && value.length > 0 ? value : null;
  emit('update:modelValue', {
    ...props.modelValue,
    model: { ...model.value, [key]: nextValue },
  });
}

function updateCategoryPointer(category: MarketCategory, value: unknown) {
  const pointers = { ...model.value.category_model_pointers };
  if (typeof value === 'string' && value.length > 0) {
    pointers[category] = value;
  } else {
    delete pointers[category];
  }
  emit('update:modelValue', {
    ...props.modelValue,
    model: { ...model.value, category_model_pointers: pointers },
  });
}

function shortId(value: string) {
  return value.length > 16 ? `${value.slice(0, 16)}…` : value;
}

function shortHash(value: string) {
  const normalized = value.startsWith('blake3:') ? value.slice(7) : value;
  return `blake3:${normalized.slice(0, 12)}…`;
}

function modelFamilyLabel(family: PublishedModelOptionView['model_family']) {
  return $t(`page.config.modelRouting.family.${family}`);
}

function filterOption(input: string, option: unknown) {
  if (typeof option !== 'object' || option === null || !('label' in option)) {
    return false;
  }
  return String(option.label).toLowerCase().includes(input.toLowerCase());
}

async function loadCatalog() {
  loading.value = true;
  loadError.value = false;
  const result = await handleRequest(
    () =>
      Promise.all([
        listPublishedModelOptions({ side: 'buy' }),
        listPublishedModelOptions({ side: 'sell' }),
      ]),
    { onError: () => (loadError.value = true), silent: true },
  );
  if (result) {
    [buyOptions.value, sellOptions.value] = result;
  }
  loading.value = false;
}

onMounted(() => void loadCatalog());
</script>

<template>
  <section
    class="model-routing-picker bg-card rounded-xl border p-5"
    data-testid="model-routing-artifact-picker"
  >
    <header class="flex items-start gap-3">
      <span class="routing-icon">
        <IconifyIcon icon="lucide:git-branch" />
      </span>
      <div>
        <h2 class="text-base font-semibold">
          {{ $t('page.config.modelRouting.title') }}
        </h2>
        <p class="text-muted-foreground mt-1 text-sm leading-5">
          {{ $t('page.config.modelRouting.description') }}
        </p>
      </div>
    </header>

    <Alert
      v-if="loadError"
      class="mt-4"
      :message="$t('page.config.modelRouting.loadError')"
      show-icon
      type="error"
    />

    <div class="global-route-grid mt-5">
      <article
        v-for="route in globalRoutes"
        :key="route.key"
        class="route-card"
      >
        <div class="mb-2 flex items-center justify-between gap-2">
          <label class="text-sm font-medium">{{ $t(route.labelKey) }}</label>
          <Tag :color="route.side === 'buy' ? 'processing' : 'warning'">
            {{ $t(`page.config.modelRouting.side.${route.side}`) }}
          </Tag>
        </div>
        <Select
          allow-clear
          :disabled="disabled"
          :filter-option="filterOption"
          :loading="loading"
          :options="selectableOptions(route.side, pointerValue(route.key))"
          :placeholder="$t('page.config.modelRouting.selectArtifact')"
          show-search
          :value="pointerValue(route.key)"
          class="w-full"
          @update:value="updateGlobalPointer(route.key, $event)"
        />
        <dl
          v-if="selectedOption(pointerValue(route.key))"
          class="artifact-facts"
        >
          <div>
            <dt>{{ $t('page.config.modelRouting.artifactHash') }}</dt>
            <dd
              class="font-mono"
              :title="selectedOption(pointerValue(route.key))?.artifact_hash"
            >
              {{
                shortHash(
                  selectedOption(pointerValue(route.key))?.artifact_hash ?? '',
                )
              }}
            </dd>
          </div>
          <div>
            <dt>{{ $t('page.config.modelRouting.evidence') }}</dt>
            <dd>
              {{
                selectedOption(pointerValue(route.key))?.published_at
                  ? formatDateTimeLocal(
                      selectedOption(pointerValue(route.key))?.published_at,
                    )
                  : $t('page.config.modelRouting.published')
              }}
            </dd>
          </div>
        </dl>
      </article>
    </div>

    <div class="category-routing mt-6 border-t pt-5">
      <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 class="text-sm font-semibold">
            {{ $t('page.config.modelRouting.categoryTitle') }}
          </h3>
          <p class="text-muted-foreground mt-1 text-xs leading-5">
            {{ $t('page.config.modelRouting.categoryDescription') }}
          </p>
        </div>
        <Tag>
          {{ $t('page.config.modelRouting.exactScopeOnly') }}
        </Tag>
      </div>
      <div class="category-grid">
        <label
          v-for="category in categories"
          :key="category"
          class="category-row"
        >
          <span>{{ $t(`page.config.policyField.${category}.label`) }}</span>
          <Select
            allow-clear
            :disabled="disabled"
            :filter-option="filterOption"
            :loading="loading"
            :options="
              selectableOptions('buy', categoryPointerValue(category), category)
            "
            :placeholder="$t('page.config.modelRouting.inheritGeneric')"
            show-search
            :value="categoryPointerValue(category)"
            class="w-full"
            @update:value="updateCategoryPointer(category, $event)"
          />
        </label>
      </div>
    </div>
  </section>
</template>

<style scoped>
.routing-icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border-radius: 0.625rem;
}

.route-card {
  min-width: 0;
  padding: 0.875rem;
  background: hsl(var(--muted) / 28%);
  border: 1px solid hsl(var(--border));
  border-radius: 0.625rem;
}

.global-route-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(15rem, 100%), 1fr));
  gap: 0.75rem;
}

.artifact-facts {
  display: grid;
  gap: 0.35rem;
  padding-top: 0.75rem;
  margin-top: 0.75rem;
  font-size: 0.75rem;
  border-top: 1px solid hsl(var(--border));
}

.artifact-facts > div {
  display: flex;
  gap: 0.5rem;
  justify-content: space-between;
}

.artifact-facts dt {
  flex: none;
  color: hsl(var(--muted-foreground));
}

.artifact-facts dd {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  color: hsl(var(--foreground));
  text-align: right;
  white-space: nowrap;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem 1rem;
}

.category-row {
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr);
  gap: 0.75rem;
  align-items: center;
  min-width: 0;
  font-size: 0.8125rem;
  font-weight: 500;
}

@media (max-width: 900px) {
  .category-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .model-routing-picker * {
    scroll-behavior: auto !important;
  }
}
</style>
