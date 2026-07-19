<script lang="ts" setup>
import type {
  LifecycleCheckDetail,
  LifecycleView,
} from '@vben/types/config-api';

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { useRequestHandler } from '@vben/request/qp';

import { Alert, Button, message, Skeleton, Tag } from 'antdv-next';

import { getProjectLifecycle, sealProductionBaseline } from '#/api/config';
import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';

defineOptions({ name: 'ConfigLifecyclePage' });

const router = useRouter();
const { governed } = useGovernedAction();
const { handleRequest } = useRequestHandler();
const { hasAccessByCodes } = useQpAccess();
const loading = ref(true);
const lifecycle = ref<LifecycleView | null>(null);
const canSeal = hasAccessByCodes(['config_lifecycle:seal']);

const checksPassed = computed(
  () =>
    lifecycle.value?.checks.every(
      (check) =>
        check.outcome === 'passed' || check.outcome === 'not_applicable',
    ) ?? false,
);

function lifecycleCheckDetail(detail: LifecycleCheckDetail) {
  switch (detail.detail_kind) {
    case 'contract_matched': {
      return $t('page.config.lifecycle.detail.contractMatched');
    }
    case 'external_evidence': {
      return (
        detail.evidence_hash ??
        $t('page.config.lifecycle.detail.evidenceMissing')
      );
    }
    case 'migration_ledgers_verified': {
      return $t('page.config.lifecycle.detail.migrationsVerified');
    }
    case 'policy_bundle': {
      return detail.policy_bundle_hash;
    }
    case 'schema_fingerprint': {
      return detail.fingerprint;
    }
  }
}

function lifecycleCheckDetailIsHash(detail: LifecycleCheckDetail) {
  switch (detail.detail_kind) {
    case 'contract_matched': {
      return false;
    }
    case 'external_evidence': {
      return (
        detail.evidence_hash !== null && detail.evidence_hash !== undefined
      );
    }
    case 'migration_ledgers_verified': {
      return false;
    }
    case 'policy_bundle': {
      return true;
    }
    case 'schema_fingerprint': {
      return true;
    }
  }
}

async function loadLifecycle() {
  loading.value = true;
  const result = await handleRequest(() => getProjectLifecycle());
  if (result) lifecycle.value = result;
  loading.value = false;
}

async function sealProduction() {
  const current = lifecycle.value;
  const phrase = current?.required_confirmation_phrase;
  if (!current || !phrase) return;

  const result = await governed(
    (ctx) =>
      sealProductionBaseline(
        {
          confirmation_phrase: phrase,
          environment: current.environment,
          reason: ctx.reason,
        },
        ctx,
      ),
    {
      confirmWord: phrase,
      danger: true,
      details: [
        {
          label: $t('page.config.status.environment'),
          value: current.environment,
        },
        {
          label: $t('page.config.lifecycle.baseline'),
          value: current.baseline,
        },
      ],
      summary: $t('page.config.lifecycle.sealSummary'),
      title: $t('page.config.lifecycle.sealTitle'),
    },
  );
  if (result) {
    message.success($t('page.config.lifecycle.sealed'));
    await loadLifecycle();
  }
}

onMounted(() => void loadLifecycle());
</script>

<template>
  <Page auto-content-height data-testid="config-lifecycle">
    <div class="mx-auto flex max-w-[1080px] flex-col gap-4 pb-8">
      <header class="bg-card rounded-xl border p-5">
        <div class="flex items-start gap-3">
          <Button
            :aria-label="$t('page.config.nav.back')"
            shape="circle"
            type="text"
            @click="router.push('/system/config')"
          >
            <IconifyIcon icon="lucide:arrow-left" />
          </Button>
          <span class="section-icon">
            <IconifyIcon icon="lucide:shield-check" />
          </span>
          <div>
            <p class="text-primary text-xs font-semibold tracking-wide">
              {{ $t('page.config.eyebrow') }}
            </p>
            <h1 class="text-xl font-semibold">
              {{ $t('page.config.lifecycle.title') }}
            </h1>
            <p class="text-muted-foreground mt-1 text-sm">
              {{ $t('page.config.lifecycle.description') }}
            </p>
          </div>
        </div>
      </header>

      <Skeleton v-if="loading" :paragraph="{ rows: 12 }" active />
      <template v-else-if="lifecycle">
        <Alert
          :message="
            $t(
              lifecycle.state === 'production_frozen'
                ? 'page.config.lifecycle.frozenNotice'
                : 'page.config.lifecycle.preProductionNotice',
            )
          "
          show-icon
          :type="
            lifecycle.state === 'production_frozen' ? 'success' : 'warning'
          "
        />

        <section
          class="lifecycle-hero bg-card rounded-xl border p-5"
          :class="{ frozen: lifecycle.state === 'production_frozen' }"
        >
          <div
            class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div>
              <p class="text-muted-foreground text-xs">
                {{ $t('page.config.lifecycle.currentState') }}
              </p>
              <h2 class="mt-1 text-lg font-semibold">
                {{ $t(`page.config.lifecycle.state.${lifecycle.state}`) }}
              </h2>
              <p class="text-muted-foreground mt-2 text-sm">
                {{ lifecycle.environment }} · {{ lifecycle.baseline }}
              </p>
            </div>
            <Tag
              :color="
                lifecycle.state === 'production_frozen' ? 'success' : 'warning'
              "
            >
              {{ $t(`page.config.lifecycle.state.${lifecycle.state}`) }}
            </Tag>
          </div>
        </section>

        <section class="bg-card rounded-xl border p-5">
          <div class="mb-4">
            <h2 class="text-base font-semibold">
              {{ $t('page.config.lifecycle.checksTitle') }}
            </h2>
            <p class="text-muted-foreground mt-1 text-sm">
              {{ $t('page.config.lifecycle.checksDescription') }}
            </p>
          </div>
          <div class="grid gap-2">
            <article
              v-for="check in lifecycle.checks"
              :key="check.kind"
              class="check-row"
            >
              <IconifyIcon
                :icon="
                  check.outcome === 'passed'
                    ? 'lucide:check-circle-2'
                    : check.outcome === 'failed'
                      ? 'lucide:x-circle'
                      : 'lucide:minus-circle'
                "
                :class="
                  check.outcome === 'not_applicable'
                    ? 'not-applicable'
                    : check.outcome
                "
              />
              <div class="min-w-0">
                <h3 class="text-sm font-medium">
                  {{ $t(`page.config.lifecycle.check.${check.kind}`) }}
                </h3>
                <p
                  class="check-detail text-muted-foreground mt-1 text-xs"
                  :class="{
                    'font-mono': lifecycleCheckDetailIsHash(check.detail),
                  }"
                >
                  {{ lifecycleCheckDetail(check.detail) }}
                </p>
              </div>
              <Tag
                :color="
                  check.outcome === 'passed'
                    ? 'success'
                    : check.outcome === 'failed'
                      ? 'error'
                      : 'default'
                "
              >
                {{ $t(`page.config.lifecycle.outcome.${check.outcome}`) }}
              </Tag>
            </article>
          </div>
        </section>

        <section
          v-if="lifecycle.production_baseline"
          class="bg-card rounded-xl border p-5"
        >
          <h2 class="text-base font-semibold">
            {{ $t('page.config.lifecycle.baselineEvidence') }}
          </h2>
          <dl class="evidence-grid mt-4">
            <div>
              <dt>{{ $t('page.config.lifecycle.sealedAt') }}</dt>
              <dd>
                {{
                  formatDateTimeLocal(lifecycle.production_baseline.sealed_at)
                }}
              </dd>
            </div>
            <div>
              <dt>{{ $t('page.config.lifecycle.sealedBy') }}</dt>
              <dd>{{ lifecycle.production_baseline.sealed_by.label }}</dd>
            </div>
            <div>
              <dt>{{ $t('page.config.lifecycle.buildCommit') }}</dt>
              <dd class="font-mono">
                {{ lifecycle.production_baseline.build_commit }}
              </dd>
            </div>
            <div>
              <dt>{{ $t('page.config.status.policyBundle') }}</dt>
              <dd class="font-mono">
                {{ lifecycle.production_baseline.policy_bundle_hash }}
              </dd>
            </div>
          </dl>
        </section>

        <section v-else class="seal-panel rounded-xl border p-5">
          <div
            class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
          >
            <div class="max-w-2xl">
              <div class="text-destructive flex items-center gap-2">
                <IconifyIcon icon="lucide:shield-alert" class="size-5" />
                <h2 class="text-base font-semibold">
                  {{ $t('page.config.lifecycle.sealTitle') }}
                </h2>
              </div>
              <p class="text-muted-foreground mt-2 text-sm leading-6">
                {{ $t('page.config.lifecycle.sealDescription') }}
              </p>
            </div>
            <Button
              danger
              :disabled="!canSeal || !checksPassed"
              type="primary"
              @click="sealProduction"
            >
              {{ $t('page.config.lifecycle.sealAction') }}
            </Button>
          </div>
        </section>
      </template>
    </div>
  </Page>
</template>

<style scoped>
.section-icon {
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  font-size: 1.15rem;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border-radius: 0.65rem;
}

.lifecycle-hero {
  background-image: radial-gradient(
    circle at 95% 0%,
    rgb(217 119 6 / 12%),
    transparent 35%
  );
}

.lifecycle-hero.frozen {
  background-image: radial-gradient(
    circle at 95% 0%,
    rgb(5 150 105 / 12%),
    transparent 35%
  );
}

.check-row {
  display: grid;
  grid-template-columns: 1.1rem minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem;
  background: hsl(var(--muted) / 45%);
  border-radius: 0.55rem;
}

.check-row .passed {
  color: #059669;
}

.check-row .failed {
  color: #dc2626;
}

.check-row .not-applicable {
  color: hsl(var(--muted-foreground));
}

.check-detail {
  overflow-wrap: anywhere;
}

.evidence-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  background: hsl(var(--border));
  border: 1px solid hsl(var(--border));
  border-radius: 0.6rem;
}

.evidence-grid > div {
  min-width: 0;
  padding: 0.8rem;
  background: hsl(var(--card));
}

.evidence-grid dt {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
}

.evidence-grid dd {
  margin-top: 0.35rem;
  font-size: 0.75rem;
  overflow-wrap: anywhere;
}

.seal-panel {
  background: rgb(220 38 38 / 4%);
  border-color: rgb(220 38 38 / 35%);
}

@media (max-width: 640px) {
  .evidence-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
