<script lang="ts" setup>
import type { DeploymentConfigView } from '@vben/types/config-api';

import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { useRequestHandler } from '@vben/request/qp';

import { Alert, Button, Skeleton, Tag } from 'antdv-next';

import { getDeploymentConfigSnapshot } from '#/api/config';
import { $t } from '#/locales';

defineOptions({ name: 'ConfigDeploymentPage' });

const router = useRouter();
const { handleRequest } = useRequestHandler();
const loading = ref(true);
const deployment = ref<DeploymentConfigView | null>(null);

async function loadDeployment() {
  loading.value = true;
  const result = await handleRequest(() => getDeploymentConfigSnapshot());
  if (result) {
    deployment.value = result;
  }
  loading.value = false;
}

onMounted(() => void loadDeployment());
</script>

<template>
  <Page auto-content-height data-testid="config-deployment">
    <div class="mx-auto flex max-w-[1280px] flex-col gap-4 pb-8">
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
            <IconifyIcon icon="lucide:server-cog" />
          </span>
          <div>
            <p class="text-primary text-xs font-semibold tracking-wide">
              {{ $t('page.config.eyebrow') }}
            </p>
            <h1 class="text-xl font-semibold">
              {{ $t('page.config.deployment.title') }}
            </h1>
            <p class="text-muted-foreground mt-1 text-sm">
              {{ $t('page.config.deployment.description') }}
            </p>
          </div>
        </div>
      </header>

      <Alert
        :message="$t('page.config.deployment.restartNotice')"
        show-icon
        type="warning"
      />
      <Skeleton v-if="loading" :paragraph="{ rows: 14 }" active />

      <template v-else-if="deployment">
        <section class="bg-card rounded-xl border p-5">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold">
                {{ $t('page.config.deployment.identity') }}
              </h2>
              <p class="text-muted-foreground mt-1 text-sm">
                {{ deployment.environment }}
              </p>
            </div>
            <Tag color="warning">{{ $t('page.config.status.required') }}</Tag>
          </div>
          <dl class="fact-grid">
            <div>
              <dt>{{ $t('page.config.deployment.deploymentId') }}</dt>
              <dd>{{ deployment.snapshot.identity.deployment_id }}</dd>
            </div>
            <div>
              <dt>{{ $t('page.config.deployment.instanceId') }}</dt>
              <dd>{{ deployment.snapshot.identity.instance_id }}</dd>
            </div>
          </dl>
        </section>

        <section class="bg-card rounded-xl border p-5">
          <h2 class="text-base font-semibold">
            {{ $t('page.config.deployment.endpoints') }}
          </h2>
          <p class="text-muted-foreground mt-1 text-sm">
            {{ $t('page.config.deployment.endpointsDescription') }}
          </p>
          <dl class="mt-4 divide-y">
            <div
              v-for="endpoint in deployment.snapshot.endpoints"
              :key="endpoint.kind"
              class="endpoint-row"
            >
              <dt>
                {{ $t(`page.config.deployment.endpoint.${endpoint.kind}`) }}
              </dt>
              <dd>{{ endpoint.address }}</dd>
            </div>
          </dl>
        </section>

        <section class="bg-card rounded-xl border p-5">
          <h2 class="text-base font-semibold">
            {{ $t('page.config.deployment.credentials') }}
          </h2>
          <p class="text-muted-foreground mt-1 text-sm">
            {{ $t('page.config.deployment.credentialsDescription') }}
          </p>
          <div class="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <div
              v-for="credential in deployment.credential_health"
              :key="credential.credential"
              class="credential-row"
            >
              <span>{{
                $t(`page.config.deployment.credential.${credential.credential}`)
              }}</span>
              <Tag
                :color="
                  credential.status === 'available'
                    ? 'success'
                    : credential.status === 'missing'
                      ? 'error'
                      : 'default'
                "
              >
                {{
                  $t(
                    `page.config.deployment.credentialStatus.${credential.status}`,
                  )
                }}
              </Tag>
            </div>
          </div>
        </section>

        <section class="bg-card rounded-xl border p-5">
          <h2 class="text-base font-semibold">
            {{ $t('page.config.deployment.budgets') }}
          </h2>
          <p class="text-muted-foreground mt-1 text-sm">
            {{ $t('page.config.deployment.budgetsDescription') }}
          </p>
          <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <article
              v-for="budget in deployment.snapshot.resource_budgets"
              :key="budget.kind"
              class="budget-card"
            >
              <h3 class="text-sm font-semibold">
                {{ $t(`page.config.deployment.budget.${budget.kind}`) }}
              </h3>
              <dl class="mt-3 space-y-2">
                <div
                  v-for="limit in budget.limits"
                  :key="limit.metric"
                  class="flex items-center justify-between gap-3 text-xs"
                >
                  <dt class="text-muted-foreground">
                    {{ $t(`page.config.deployment.metric.${limit.metric}`) }}
                  </dt>
                  <dd class="font-mono">
                    {{ limit.value }}
                    {{ $t(`page.config.deployment.unit.${limit.unit}`) }}
                  </dd>
                </div>
              </dl>
            </article>
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

.fact-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  background: hsl(var(--border));
  border: 1px solid hsl(var(--border));
  border-radius: 0.6rem;
}

.fact-grid > div {
  min-width: 0;
  padding: 0.8rem;
  background: hsl(var(--card));
}

.fact-grid dt,
.endpoint-row dt {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
}

.fact-grid dd,
.endpoint-row dd {
  margin-top: 0.3rem;
  font-family: ui-monospace, monospace;
  font-size: 0.75rem;
  overflow-wrap: anywhere;
}

.endpoint-row {
  display: grid;
  grid-template-columns: minmax(10rem, 0.3fr) minmax(0, 1fr);
  gap: 1rem;
  padding: 0.7rem 0;
}

.credential-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.7rem 0.8rem;
  font-size: 0.8125rem;
  background: hsl(var(--muted) / 45%);
  border-radius: 0.55rem;
}

.budget-card {
  padding: 0.9rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.65rem;
}

@media (max-width: 640px) {
  .fact-grid,
  .endpoint-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
