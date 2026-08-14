<script lang="ts" setup>
import type {
  DeployConfigFieldProjection,
  DeploymentConfigView,
} from '@vben/types/config-api';

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { useRequestHandler } from '@vben/request/qp';

import { Alert, Button, Input, Select, Skeleton, Tag } from 'antdv-next';

import { getDeploymentConfigSnapshot } from '#/api/config';
import { $t } from '#/locales';

defineOptions({ name: 'ConfigDeploymentPage' });

const router = useRouter();
const { handleRequest } = useRequestHandler();
const loading = ref(true);
const deployment = ref<DeploymentConfigView | null>(null);
const query = ref('');
const sensitivity = ref<
  'all' | DeployConfigFieldProjection['descriptor']['sensitivity']
>('all');

const sensitivityOptions = computed(() => [
  { label: $t('page.config.deployment.allSensitivity'), value: 'all' },
  ...(
    ['public', 'secret', 'sensitive_endpoint', 'sensitive_identifier'] as const
  ).map((value) => ({
    label: $t(`page.config.deployment.sensitivity.${value}`),
    value,
  })),
]);

const filteredFields = computed(() => {
  const normalized = query.value.trim().toLocaleLowerCase();
  return (deployment.value?.fields ?? []).filter(({ descriptor }) => {
    if (
      sensitivity.value !== 'all' &&
      descriptor.sensitivity !== sensitivity.value
    ) {
      return false;
    }
    return (
      normalized === '' ||
      [
        descriptor.title,
        descriptor.toml_path,
        descriptor.consumer,
        descriptor.purpose,
      ].some((value) => value.toLocaleLowerCase().includes(normalized))
    );
  });
});

const groups = computed(() => {
  const grouped = new Map<string, DeployConfigFieldProjection[]>();
  for (const field of filteredFields.value) {
    const section = field.descriptor.toml_path.split('.')[0] ?? 'root';
    const fields = grouped.get(section) ?? [];
    fields.push(field);
    grouped.set(section, fields);
  }
  return [...grouped.entries()]
    .map(([name, fields]) => ({
      fields: fields.toSorted((left, right) =>
        left.descriptor.toml_path.localeCompare(right.descriptor.toml_path),
      ),
      name,
    }))
    .toSorted((left, right) => left.name.localeCompare(right.name));
});

const protectedCount = computed(
  () =>
    deployment.value?.fields.filter(
      (field) => field.projection.visibility === 'protected',
    ).length ?? 0,
);
const missingProtectedCount = computed(
  () =>
    deployment.value?.fields.filter(
      (field) =>
        field.projection.visibility === 'protected' &&
        field.projection.status === 'missing',
    ).length ?? 0,
);

function projectedValue(field: DeployConfigFieldProjection) {
  if (field.projection.visibility === 'protected') {
    return $t(
      `page.config.deployment.protectedStatus.${field.projection.status}`,
    );
  }
  const value = field.projection.value;
  if (value === null || value === undefined || value === '') return '—';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function projectionColor(field: DeployConfigFieldProjection) {
  if (field.projection.visibility === 'public') return 'default';
  return field.projection.status === 'configured' ? 'success' : 'error';
}

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
            <p class="config-eyebrow text-xs font-semibold tracking-wide">
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
          <div
            class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
          >
            <div>
              <h2 class="text-base font-semibold">
                {{ $t('page.config.deployment.safeProjection') }}
              </h2>
              <p class="text-muted-foreground mt-1 text-sm">
                {{ $t('page.config.deployment.safeProjectionDescription') }}
              </p>
            </div>
            <Tag color="warning">{{ $t('page.config.status.required') }}</Tag>
          </div>
          <dl class="summary-grid mt-4">
            <div>
              <dt>{{ $t('page.config.status.environment') }}</dt>
              <dd>{{ deployment.environment }}</dd>
            </div>
            <div>
              <dt>{{ $t('page.config.deployment.totalFields') }}</dt>
              <dd>{{ deployment.fields.length }}</dd>
            </div>
            <div>
              <dt>{{ $t('page.config.deployment.protectedFields') }}</dt>
              <dd>{{ protectedCount }}</dd>
            </div>
            <div>
              <dt>{{ $t('page.config.deployment.missingProtected') }}</dt>
              <dd :class="missingProtectedCount > 0 ? 'font-bold' : ''">
                {{ missingProtectedCount }}
              </dd>
            </div>
          </dl>
        </section>

        <section class="bg-card rounded-xl border p-4">
          <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_16rem]">
            <Input
              v-model:value="query"
              :aria-label="$t('page.config.deployment.search')"
              allow-clear
              :placeholder="$t('page.config.deployment.search')"
            >
              <template #prefix><IconifyIcon icon="lucide:search" /></template>
            </Input>
            <div>
              <label class="sr-only" for="config-deployment-sensitivity">
                {{ $t('page.config.deployment.sensitivityFilter') }}
              </label>
              <Select
                id="config-deployment-sensitivity"
                v-model:value="sensitivity"
                :aria-label="$t('page.config.deployment.sensitivityFilter')"
                class="w-full"
                :options="sensitivityOptions"
              />
            </div>
          </div>
        </section>

        <section
          v-for="group in groups"
          :key="group.name"
          class="bg-card rounded-xl border p-5"
          :data-deploy-section="group.name"
        >
          <header class="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 class="font-mono text-base font-semibold">
                [{{ group.name }}]
              </h2>
              <p class="text-muted-foreground mt-1 text-xs">
                {{
                  $t('page.config.deployment.fieldCount', {
                    count: group.fields.length,
                  })
                }}
              </p>
            </div>
          </header>

          <div
            :aria-label="`${group.name}: ${$t('page.config.deployment.fieldCount', { count: group.fields.length })}`"
            class="deployment-table-wrap"
            role="region"
            tabindex="0"
          >
            <table class="deployment-table">
              <thead>
                <tr>
                  <th>{{ $t('page.config.deployment.field') }}</th>
                  <th>{{ $t('page.config.deployment.safeValue') }}</th>
                  <th>{{ $t('page.config.deployment.contract') }}</th>
                  <th>{{ $t('page.config.deployment.impact') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="field in group.fields"
                  :key="field.descriptor.toml_path"
                  :data-deploy-config-path="field.descriptor.toml_path"
                >
                  <td>
                    <strong class="text-xs">{{
                      field.descriptor.title
                    }}</strong>
                    <code>{{ field.descriptor.toml_path }}</code>
                    <p>{{ field.descriptor.purpose }}</p>
                  </td>
                  <td>
                    <Tag :color="projectionColor(field)">
                      {{ projectedValue(field) }}
                    </Tag>
                  </td>
                  <td>
                    <div class="flex flex-wrap gap-1">
                      <Tag>{{ field.descriptor.value_kind }}</Tag>
                      <Tag v-if="field.descriptor.unit">
                        {{ field.descriptor.unit }}
                      </Tag>
                      <Tag
                        :color="
                          field.descriptor.required ? 'processing' : 'default'
                        "
                      >
                        {{
                          $t(
                            field.descriptor.required
                              ? 'page.config.deployment.required'
                              : 'page.config.deployment.optional',
                          )
                        }}
                      </Tag>
                      <Tag>
                        {{
                          $t(
                            `page.config.deployment.sensitivity.${field.descriptor.sensitivity}`,
                          )
                        }}
                      </Tag>
                    </div>
                  </td>
                  <td>
                    <strong>{{ field.descriptor.consumer }}</strong>
                    <p>{{ field.descriptor.operational_impact }}</p>
                    <Tag color="warning">
                      {{ $t('page.config.deployment.restartRequired') }}
                    </Tag>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </div>
  </Page>
</template>

<style scoped>
.config-eyebrow {
  color: hsl(var(--foreground));
}

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

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  background: hsl(var(--border));
  border: 1px solid hsl(var(--border));
  border-radius: 0.6rem;
}

.summary-grid > div {
  min-width: 0;
  padding: 0.8rem;
  background: hsl(var(--card));
}

.summary-grid dt {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
}

.summary-grid dd {
  margin-top: 0.25rem;
  font-weight: 600;
}

.deployment-table-wrap {
  overflow-x: auto;
}

.deployment-table {
  width: 100%;
  min-width: 64rem;
  font-size: 0.75rem;
  border-collapse: collapse;
}

.deployment-table th {
  color: hsl(var(--muted-foreground));
  text-align: left;
}

.deployment-table th,
.deployment-table td {
  padding: 0.75rem;
  vertical-align: top;
  border-bottom: 1px solid hsl(var(--border));
}

.deployment-table td:first-child {
  width: 34%;
}

.deployment-table code,
.deployment-table p {
  display: block;
  margin-top: 0.35rem;
  overflow-wrap: anywhere;
}

.deployment-table code {
  font-size: 0.6875rem;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.deployment-table p {
  color: hsl(var(--muted-foreground));
}

@media (max-width: 768px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
