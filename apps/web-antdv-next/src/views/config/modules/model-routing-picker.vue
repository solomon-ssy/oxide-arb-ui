<script lang="ts" setup>
import type { ModelRouteCandidateView } from '@vben/types';
import type {
  BuyRouteBinding,
  ModelBinding,
  ModelRouting,
} from '@vben/types/config-api';

import { computed, onMounted, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { useRequestHandler } from '@vben/request/qp';

import { Alert, Button, Tag } from 'antdv-next';

import { listModelRouteCandidates } from '#/api/research';
import { $t } from '#/locales';

defineOptions({ name: 'ModelRoutingPicker' });

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    modelValue: ModelRouting;
  }>(),
  { disabled: true },
);

type BuyRoute = 'crypto' | 'pooled' | 'weather';

interface RouteDefinition {
  key: BuyRoute;
  labelKey: string;
}

const { handleRequest } = useRequestHandler();
const loading = ref(true);
const loadError = ref(false);
const candidates = ref<ModelRouteCandidateView[]>([]);

const routeDefinitions: RouteDefinition[] = [
  { key: 'pooled', labelKey: 'page.config.modelRouting.route.pooled' },
  { key: 'crypto', labelKey: 'page.config.modelRouting.route.crypto' },
  { key: 'weather', labelKey: 'page.config.modelRouting.route.weather' },
];

const model = computed(() => props.modelValue.model);

function routeBinding(route: BuyRoute): BuyRouteBinding | undefined {
  return model.value?.buy_routes?.[route];
}

function candidate(id: null | string | undefined) {
  return candidates.value.find((item) => item.model_version_id === id);
}

function sourceLabel(binding: ModelBinding) {
  return $t(`page.config.modelRouting.source.${binding.source.source_kind}`);
}

function sourceCycle(binding: ModelBinding) {
  return binding.source.source_kind === 'feedback'
    ? binding.source.feedback_cycle_id
    : null;
}

function shortId(value: string) {
  return value.length > 16 ? `${value.slice(0, 16)}…` : value;
}

function shortHash(value: string) {
  const normalized = value.startsWith('blake3:') ? value.slice(7) : value;
  return `blake3:${normalized.slice(0, 12)}…`;
}

function formatTimestamp(value: string) {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime())
    ? value
    : timestamp.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'medium',
      });
}

async function loadCatalog() {
  loading.value = true;
  loadError.value = false;
  const result = await handleRequest(
    () => listModelRouteCandidates({ side: 'buy' }),
    { onError: () => (loadError.value = true), silent: true },
  );
  if (result) {
    candidates.value = result;
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
      <span class="routing-icon" aria-hidden="true">
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
    >
      <template #action>
        <Button :loading="loading" size="small" @click="loadCatalog">
          {{ $t('page.config.modelRouting.retry') }}
        </Button>
      </template>
    </Alert>

    <div class="route-grid mt-5">
      <article
        v-for="route in routeDefinitions"
        :key="route.key"
        class="route-card"
        :data-testid="`model-route-${route.key}`"
      >
        <div class="mb-3 flex items-center justify-between gap-2">
          <h3 class="text-sm font-semibold">{{ $t(route.labelKey) }}</h3>
          <Tag color="processing">
            {{ $t('page.config.modelRouting.side.buy') }}
          </Tag>
        </div>

        <p
          v-if="!routeBinding(route.key)"
          class="text-muted-foreground rounded-md border border-dashed p-3 text-sm"
        >
          {{ $t('page.config.modelRouting.unbound') }}
        </p>

        <dl v-else class="binding-stack">
          <div class="binding-panel">
            <dt>
              <Tag color="success">
                {{ $t('page.config.modelRouting.champion') }}
              </Tag>
            </dt>
            <dd>
              <strong
                class="font-mono text-xs"
                :title="routeBinding(route.key)?.champion.model_version_id"
              >
                {{
                  shortId(
                    routeBinding(route.key)?.champion.model_version_id ?? '',
                  )
                }}
              </strong>
              <span>
                {{
                  $t('page.config.modelRouting.generation', {
                    generation:
                      routeBinding(route.key)?.champion.generation ?? 0,
                  })
                }}
              </span>
              <span>
                {{
                  formatTimestamp(
                    routeBinding(route.key)?.champion.bound_at ?? '',
                  )
                }}
              </span>
              <span>
                {{ sourceLabel(routeBinding(route.key)!.champion) }}
                <template v-if="sourceCycle(routeBinding(route.key)!.champion)">
                  ·
                  <span
                    :title="
                      sourceCycle(routeBinding(route.key)!.champion) ??
                      undefined
                    "
                  >
                    {{
                      shortId(
                        sourceCycle(routeBinding(route.key)!.champion) ?? '',
                      )
                    }}
                  </span>
                </template>
              </span>
              <span
                v-if="
                  candidate(routeBinding(route.key)?.champion.model_version_id)
                "
                :title="
                  candidate(routeBinding(route.key)?.champion.model_version_id)
                    ?.artifact_hash
                "
              >
                {{
                  shortHash(
                    candidate(
                      routeBinding(route.key)?.champion.model_version_id,
                    )?.artifact_hash ?? '',
                  )
                }}
              </span>
            </dd>
          </div>

          <div class="binding-panel">
            <dt>
              <Tag
                :color="routeBinding(route.key)?.shadow ? 'warning' : 'default'"
              >
                {{ $t('page.config.modelRouting.shadow') }}
              </Tag>
            </dt>
            <dd v-if="routeBinding(route.key)?.shadow">
              <strong
                class="font-mono text-xs"
                :title="routeBinding(route.key)?.shadow?.model_version_id"
              >
                {{
                  shortId(
                    routeBinding(route.key)?.shadow?.model_version_id ?? '',
                  )
                }}
              </strong>
              <span>
                {{
                  $t('page.config.modelRouting.generation', {
                    generation:
                      routeBinding(route.key)?.shadow?.generation ?? 0,
                  })
                }}
              </span>
              <span>
                {{
                  formatTimestamp(
                    routeBinding(route.key)?.shadow?.bound_at ?? '',
                  )
                }}
              </span>
              <span>
                {{ sourceLabel(routeBinding(route.key)!.shadow!) }}
                <template v-if="sourceCycle(routeBinding(route.key)!.shadow!)">
                  ·
                  <span
                    :title="
                      sourceCycle(routeBinding(route.key)!.shadow!) ?? undefined
                    "
                  >
                    {{
                      shortId(
                        sourceCycle(routeBinding(route.key)!.shadow!) ?? '',
                      )
                    }}
                  </span>
                </template>
              </span>
            </dd>
            <dd v-else class="text-muted-foreground">
              {{ $t('page.config.modelRouting.shadowAvailable') }}
            </dd>
          </div>
        </dl>
      </article>

      <article class="route-card" data-testid="model-route-exit">
        <div class="mb-3 flex items-center justify-between gap-2">
          <h3 class="text-sm font-semibold">
            {{ $t('page.config.modelRouting.activeExit') }}
          </h3>
          <Tag color="warning">
            {{ $t('page.config.modelRouting.side.sell') }}
          </Tag>
        </div>
        <p
          v-if="!model?.active_exit_model_version_id"
          class="text-muted-foreground rounded-md border border-dashed p-3 text-sm"
        >
          {{ $t('page.config.modelRouting.unbound') }}
        </p>
        <p
          v-else
          class="font-mono text-xs"
          :title="model.active_exit_model_version_id"
        >
          {{ shortId(model.active_exit_model_version_id) }}
        </p>
      </article>
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

.route-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(18rem, 100%), 1fr));
  gap: 0.75rem;
}

.route-card {
  min-width: 0;
  padding: 0.875rem;
  background: hsl(var(--muted) / 28%);
  border: 1px solid hsl(var(--border));
  border-radius: 0.625rem;
}

.binding-stack {
  display: grid;
  gap: 0.75rem;
}

.binding-panel {
  display: grid;
  grid-template-columns: 5.25rem minmax(0, 1fr);
  gap: 0.75rem;
  align-items: start;
  padding-top: 0.75rem;
  border-top: 1px solid hsl(var(--border));
}

.binding-panel dd {
  display: grid;
  gap: 0.2rem;
  min-width: 0;
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  overflow-wrap: anywhere;
}

.binding-panel dd strong {
  color: hsl(var(--foreground));
}

@media (max-width: 420px) {
  .model-routing-picker {
    padding: 1rem;
  }

  .binding-panel {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .model-routing-picker * {
    scroll-behavior: auto !important;
  }
}
</style>
