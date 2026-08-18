<script lang="ts" setup>
import type {
  ExchangeHistoryQuarantineView,
  FreshBootProfileProgressView,
  FreshBootProgressView,
} from '@vben/types';

import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Alert,
  Badge,
  Button,
  Empty,
  message,
  Progress,
  Tag,
} from 'antdv-next';

import { $t } from '#/locales';
import EnumTag from '#/shared/components/enum-tag.vue';
import { formatDateTimeLocal } from '#/shared/components/format';
import InsightPanel from '#/shared/components/insight-panel.vue';
import StatusChip from '#/shared/components/status-chip.vue';
import WorkspaceInspectorSurface from '#/shared/components/workspace/workspace-inspector-surface.vue';

import {
  activationPercent,
  retentionPercent,
  summarizeFreshBoot,
} from './fresh-boot-presentation';

const props = defineProps<{
  canRetry: (profile: FreshBootProfileProgressView) => boolean;
  canSupersede: (profile: FreshBootProfileProgressView) => boolean;
  freshBoot: FreshBootProgressView | null;
  quarantineError: boolean;
  quarantineLoading: boolean;
  quarantineNextAfter: null | string;
  quarantines: ExchangeHistoryQuarantineView[];
  stale: boolean;
}>();

const emit = defineEmits<{
  loadMoreQuarantines: [];
  openQuarantines: [];
  openReport: [];
  retry: [profile: FreshBootProfileProgressView];
  supersede: [profile: FreshBootProfileProgressView];
  timeline: [profile: FreshBootProfileProgressView];
}>();

const quarantineOpen = ref(false);
const capabilityAnnouncement = ref('');
const capabilityState = computed(() => props.freshBoot?.capability.state);
const pooledReady = computed(
  () =>
    props.freshBoot?.capability.first_report_ready === true &&
    (props.freshBoot.capability.pooled_first_report_id ?? null) !== null,
);
const quarantineCount = computed(
  () => props.freshBoot?.exchange_history.quarantine_count ?? 0,
);
const compact = computed(
  () => pooledReady.value && quarantineCount.value === 0,
);
const summary = computed(() =>
  summarizeFreshBoot(capabilityState.value, pooledReady.value),
);
const activation = computed(() =>
  activationPercent(props.freshBoot?.exchange_history),
);
const retention = computed(() =>
  retentionPercent(props.freshBoot?.exchange_history),
);

watch(capabilityState, (value, previous) => {
  if (previous !== undefined && value !== undefined && value !== previous) {
    capabilityAnnouncement.value = $t(
      `page.dashboard.bootstrap.capability.${value}`,
    );
  }
});

function openQuarantines() {
  quarantineOpen.value = true;
  emit('openQuarantines');
}

async function copyId(value: string) {
  await navigator.clipboard.writeText(value);
  message.success($t('page.dashboard.bootstrap.quarantineCopied'));
}
</script>

<template>
  <InsightPanel
    class="fresh-boot-panel"
    :featured="Boolean(freshBoot) && !compact"
    :title="$t('page.dashboard.bootstrap.title')"
    icon="lucide:rocket"
    tone="violet"
  >
    <div
      v-if="capabilityAnnouncement"
      aria-live="polite"
      class="sr-only"
      role="status"
    >
      {{ capabilityAnnouncement }}
    </div>
    <Alert
      v-if="stale && freshBoot === null"
      :message="$t('page.dashboard.bootstrap.unavailable')"
      show-icon
      type="error"
    />
    <template v-else-if="freshBoot">
      <Alert
        v-if="stale"
        class="mb-4"
        :description="
          $t('page.dashboard.bootstrap.staleDescription', {
            time: formatDateTimeLocal(freshBoot.observed_at),
          })
        "
        :message="$t('page.dashboard.bootstrap.stale')"
        show-icon
        type="warning"
      />

      <div class="fresh-boot-capability">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <StatusChip :tone="summary.tone">
              {{ $t(`page.dashboard.bootstrap.status.${summary.status}`) }}
            </StatusChip>
            <StatusChip :tone="pooledReady ? 'success' : 'running'">
              {{
                pooledReady
                  ? $t('page.dashboard.bootstrap.pooledReady')
                  : $t('page.dashboard.bootstrap.pooledPending')
              }}
            </StatusChip>
            <StatusChip
              :tone="
                freshBoot.capability.all_routes_ready ? 'success' : 'warning'
              "
            >
              {{
                freshBoot.capability.all_routes_ready
                  ? $t('page.dashboard.bootstrap.allRoutesReady')
                  : $t('page.dashboard.bootstrap.routesStillBuilding')
              }}
            </StatusChip>
          </div>
          <p class="text-muted-foreground mt-2 text-sm">
            {{
              pooledReady
                ? $t('page.dashboard.bootstrap.pooledReadyDetail')
                : $t('page.dashboard.bootstrap.positiveExposureSlo')
            }}
          </p>
        </div>
        <div class="fresh-boot-actions">
          <Badge
            :count="quarantineCount"
            :overflow-count="99"
            :show-zero="false"
          >
            <Button
              class="fresh-boot-action"
              size="small"
              :color="quarantineCount > 0 ? 'danger' : 'purple'"
              :variant="quarantineCount > 0 ? 'solid' : 'filled'"
              @click="openQuarantines"
            >
              <template #icon>
                <IconifyIcon
                  :icon="
                    quarantineCount > 0
                      ? 'lucide:shield-alert'
                      : 'lucide:shield'
                  "
                />
              </template>
              {{ $t('page.dashboard.bootstrap.openQuarantines') }}
            </Button>
          </Badge>
          <Button
            v-if="freshBoot.capability.pooled_first_report_id"
            class="fresh-boot-action"
            size="small"
            type="primary"
            @click="emit('openReport')"
          >
            <template #icon>
              <IconifyIcon icon="lucide:file-check" />
            </template>
            {{ $t('page.dashboard.bootstrap.openReport') }}
          </Button>
        </div>
      </div>

      <details v-if="compact" class="fresh-boot-route-details">
        <summary>{{ $t('page.dashboard.bootstrap.expandRoutes') }}</summary>
        <div class="mt-4">
          <ul class="grid gap-3">
            <li
              v-for="profile in freshBoot.profiles"
              :key="profile.run.run_id"
              class="fresh-boot-profile"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex min-w-0 items-center gap-2">
                  <strong>{{
                    $t(`page.dashboard.bootstrap.route.${profile.run.route}`)
                  }}</strong>
                  <EnumTag
                    context="fresh-boot-panel"
                    name="FreshBootStatus"
                    :value="profile.run.status"
                  />
                </div>
                <Button
                  class="fresh-boot-action"
                  color="cyan"
                  size="small"
                  variant="filled"
                  @click="emit('timeline', profile)"
                >
                  <template #icon>
                    <IconifyIcon icon="lucide:history" />
                  </template>
                  {{ $t('page.dashboard.bootstrap.timeline') }}
                </Button>
              </div>
            </li>
          </ul>
        </div>
      </details>

      <div v-else class="fresh-boot-layout">
        <section
          class="fresh-boot-history"
          aria-labelledby="fresh-boot-history-title"
        >
          <div class="flex flex-wrap items-center gap-2">
            <h3 id="fresh-boot-history-title" class="font-semibold">
              {{ $t('page.dashboard.bootstrap.historyTitle') }}
            </h3>
            <Tag>
              {{
                $t(
                  `page.dashboard.bootstrap.historyStage.${freshBoot.exchange_history.stage}`,
                )
              }}
            </Tag>
          </div>

          <div class="fresh-boot-frontier">
            <div class="flex items-center justify-between gap-3 text-sm">
              <strong>{{ $t('page.dashboard.bootstrap.activation') }}</strong>
              <span class="font-mono tabular-nums">{{ activation }}%</span>
            </div>
            <Progress
              :aria-label="
                $t('page.dashboard.bootstrap.activationProgressAria')
              "
              :percent="activation"
              :status="
                freshBoot.exchange_history.stage === 'quarantined'
                  ? 'exception'
                  : 'active'
              "
            />
            <p class="text-muted-foreground text-xs">
              {{
                $t('page.dashboard.bootstrap.activationCoverage', {
                  accepted:
                    freshBoot.exchange_history.accepted_through_block ?? '—',
                  from: freshBoot.exchange_history.activation_from_block ?? '—',
                  target: freshBoot.exchange_history.target_block ?? '—',
                })
              }}
            </p>
          </div>

          <div class="fresh-boot-frontier">
            <div class="flex items-center justify-between gap-3 text-sm">
              <strong>{{ $t('page.dashboard.bootstrap.retention') }}</strong>
              <span class="font-mono tabular-nums">{{ retention }}%</span>
            </div>
            <Progress
              :aria-label="$t('page.dashboard.bootstrap.retentionProgressAria')"
              :percent="retention"
              :status="
                freshBoot.exchange_history.stage === 'quarantined'
                  ? 'exception'
                  : 'active'
              "
            />
            <p class="text-muted-foreground text-xs">
              {{
                freshBoot.exchange_history.retention_accepted_from_block ===
                null
                  ? $t('page.dashboard.bootstrap.retentionPending')
                  : $t('page.dashboard.bootstrap.retentionCoverage', {
                      from: freshBoot.exchange_history
                        .retention_accepted_from_block,
                    })
              }}
            </p>
          </div>

          <dl class="fresh-boot-history-metrics">
            <div>
              <dt>{{ $t('page.dashboard.bootstrap.acceptedLogs') }}</dt>
              <dd>{{ freshBoot.exchange_history.logs_accepted }}</dd>
            </div>
            <div>
              <dt>{{ $t('page.dashboard.bootstrap.quarantineCount') }}</dt>
              <dd>{{ freshBoot.exchange_history.quarantine_count }}</dd>
            </div>
          </dl>
          <p
            v-if="freshBoot.exchange_history.slo_status === 'warming_up'"
            class="text-muted-foreground text-xs"
          >
            {{ $t('page.dashboard.bootstrap.sloWarmingUp') }}
          </p>
          <p
            v-else-if="freshBoot.exchange_history.projected_completion_at"
            class="text-muted-foreground text-xs"
          >
            {{
              $t('page.dashboard.bootstrap.projectedCompletion', {
                time: formatDateTimeLocal(
                  freshBoot.exchange_history.projected_completion_at,
                ),
              })
            }}
          </p>
        </section>

        <section
          class="fresh-boot-routes"
          aria-labelledby="fresh-boot-routes-title"
        >
          <div class="fresh-boot-routes-anchor">
            <h3 id="fresh-boot-routes-title" class="fresh-boot-routes-title">
              {{ $t('page.dashboard.bootstrap.routesTitle') }}
            </h3>
            <div class="fresh-boot-routes-body">
              <ul v-if="freshBoot.profiles.length > 0" class="grid gap-3">
                <li
                  v-for="profile in freshBoot.profiles"
                  :key="profile.run.run_id"
                  class="fresh-boot-profile"
                >
                  <div class="fresh-boot-profile-grid">
                    <div>
                      <span class="fresh-boot-label">{{
                        $t('page.dashboard.bootstrap.routeLabel')
                      }}</span>
                      <strong>{{
                        $t(
                          `page.dashboard.bootstrap.route.${profile.run.route}`,
                        )
                      }}</strong>
                      <EnumTag
                        class="mt-1 w-fit"
                        context="fresh-boot-panel"
                        name="FreshBootStatus"
                        :value="profile.run.status"
                      />
                    </div>
                    <div>
                      <span class="fresh-boot-label">{{
                        $t('page.dashboard.bootstrap.sourceCoverage')
                      }}</span>
                      <strong>
                        {{
                          profile.run.source_coverage_manifest
                            ? $t('page.dashboard.bootstrap.coverageSealed', {
                                count:
                                  profile.run.source_coverage_manifest
                                    .requirements.length,
                              })
                            : $t('page.dashboard.bootstrap.coverageWaiting')
                        }}
                      </strong>
                      <span
                        v-if="profile.run.next_attempt_at"
                        class="text-muted-foreground text-xs"
                      >
                        {{
                          $t('page.dashboard.bootstrap.nextRetry', {
                            time: formatDateTimeLocal(
                              profile.run.next_attempt_at,
                            ),
                          })
                        }}
                      </span>
                    </div>
                    <div>
                      <span class="fresh-boot-label">{{
                        $t('page.dashboard.bootstrap.currentStage')
                      }}</span>
                      <strong>{{
                        $t(
                          `page.dashboard.bootstrap.stage.${profile.run.stage}`,
                        )
                      }}</strong>
                      <span class="text-muted-foreground text-xs">
                        {{ formatDateTimeLocal(profile.run.stage_entered_at) }}
                      </span>
                    </div>
                    <div>
                      <span class="fresh-boot-label">{{
                        $t('page.dashboard.bootstrap.lastEvent')
                      }}</span>
                      <strong>
                        {{
                          profile.last_event
                            ? $t(
                                `page.dashboard.bootstrap.event.${profile.last_event.event}`,
                              )
                            : $t('page.dashboard.bootstrap.notObserved')
                        }}
                      </strong>
                      <span
                        v-if="profile.last_event"
                        class="text-muted-foreground text-xs"
                      >
                        {{
                          formatDateTimeLocal(profile.last_event.occurred_at)
                        }}
                      </span>
                    </div>
                    <div>
                      <span class="fresh-boot-label">{{
                        $t('page.dashboard.bootstrap.job')
                      }}</span>
                      <strong class="fresh-boot-id">
                        {{
                          profile.run.active_job_id ??
                          profile.run.last_job_id ??
                          '—'
                        }}
                      </strong>
                    </div>
                    <div>
                      <span class="fresh-boot-label">{{
                        $t('page.dashboard.bootstrap.firstReport')
                      }}</span>
                      <StatusChip
                        :tone="
                          profile.run.first_report_id
                            ? 'success'
                            : profile.run.first_report_run_id
                              ? 'queued'
                              : 'warning'
                        "
                      >
                        {{
                          profile.run.first_report_id
                            ? $t('page.dashboard.bootstrap.ready')
                            : profile.run.first_report_run_id
                              ? $t('page.dashboard.bootstrap.queued')
                              : $t('page.dashboard.bootstrap.pending')
                        }}
                      </StatusChip>
                      <span
                        v-if="profile.run.first_report_id"
                        class="fresh-boot-id text-xs"
                      >
                        {{ profile.run.first_report_id }}
                      </span>
                    </div>
                  </div>

                  <Alert
                    v-if="profile.run.blocker"
                    class="mt-3"
                    :description="profile.run.blocker.detail"
                    :message="
                      profile.run.blocker.code.kind === 'terminal'
                        ? $t(
                            `page.dashboard.bootstrap.blockedReason.${profile.run.blocker.code.code}`,
                          )
                        : $t(
                            `page.dashboard.bootstrap.retryReason.${profile.run.blocker.code.code}`,
                          )
                    "
                    show-icon
                    :type="profile.run.blocker.retryable ? 'warning' : 'error'"
                  />

                  <div class="fresh-boot-actions mt-3">
                    <Button
                      class="fresh-boot-action"
                      color="cyan"
                      size="small"
                      variant="filled"
                      @click="emit('timeline', profile)"
                    >
                      <template #icon>
                        <IconifyIcon icon="lucide:history" />
                      </template>
                      {{ $t('page.dashboard.bootstrap.timeline') }}
                    </Button>
                    <Button
                      v-if="canRetry(profile)"
                      class="fresh-boot-action"
                      color="orange"
                      size="small"
                      variant="solid"
                      @click="emit('retry', profile)"
                    >
                      <template #icon>
                        <IconifyIcon icon="lucide:refresh-cw" />
                      </template>
                      {{ $t('page.dashboard.bootstrap.retryNow') }}
                    </Button>
                    <Button
                      v-if="canSupersede(profile)"
                      class="fresh-boot-action"
                      color="danger"
                      size="small"
                      variant="outlined"
                      @click="emit('supersede', profile)"
                    >
                      <template #icon>
                        <IconifyIcon icon="lucide:ban" />
                      </template>
                      {{ $t('page.dashboard.bootstrap.supersede') }}
                    </Button>
                    <Button
                      v-if="profile.run.first_report_id"
                      class="fresh-boot-action"
                      size="small"
                      type="primary"
                      @click="emit('openReport')"
                    >
                      <template #icon>
                        <IconifyIcon icon="lucide:file-check" />
                      </template>
                      {{ $t('page.dashboard.bootstrap.openReport') }}
                    </Button>
                  </div>
                </li>
              </ul>
              <Empty
                v-else
                class="fresh-boot-routes-empty"
                :description="$t('page.dashboard.bootstrap.noProfiles')"
                :image="Empty.PRESENTED_IMAGE_SIMPLE"
              />
            </div>
          </div>
        </section>
      </div>
    </template>
    <Empty
      v-else
      :description="$t('page.dashboard.bootstrap.unavailable')"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
    />

    <WorkspaceInspectorSurface
      v-model:open="quarantineOpen"
      :loading="quarantineLoading && quarantines.length === 0"
      :title="$t('page.dashboard.bootstrap.quarantineTitle')"
      width="45rem"
    >
      <Alert
        v-if="quarantineError && quarantines.length === 0"
        :message="$t('page.dashboard.bootstrap.quarantineError')"
        show-icon
        type="error"
      />
      <Empty
        v-else-if="quarantines.length === 0"
        :description="$t('page.dashboard.bootstrap.quarantineEmpty')"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      />
      <ul v-else class="grid gap-3">
        <li
          v-for="item in quarantines"
          :key="item.quarantine_id"
          class="fresh-boot-quarantine"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <Tag :color="item.resolution ? 'success' : 'error'">
                {{
                  item.resolution
                    ? $t('page.dashboard.bootstrap.quarantineResolved')
                    : $t('page.dashboard.bootstrap.quarantineActive')
                }}
              </Tag>
              <strong class="ml-2">{{
                $t(`page.dashboard.bootstrap.quarantineKind.${item.kind}`)
              }}</strong>
            </div>
            <Button
              size="small"
              type="text"
              @click="copyId(item.quarantine_id)"
            >
              {{ $t('page.dashboard.bootstrap.copyId') }}
            </Button>
          </div>
          <dl class="fresh-boot-quarantine-details">
            <div>
              <dt>{{ $t('page.dashboard.bootstrap.quarantineId') }}</dt>
              <dd>{{ item.quarantine_id }}</dd>
            </div>
            <div>
              <dt>{{ $t('page.dashboard.bootstrap.chunkRange') }}</dt>
              <dd>
                {{ item.frontier }} · {{ item.from_block }}–{{ item.to_block }}
              </dd>
            </div>
            <div v-if="item.evidence.kind === 'projection_failure'">
              <dt>{{ $t('page.dashboard.bootstrap.contractTokenTx') }}</dt>
              <dd>
                {{ item.evidence.contract_address ?? '—' }} ·
                {{ item.evidence.token_id ?? '—' }} ·
                {{ item.evidence.transaction_hash ?? '—' }}
              </dd>
            </div>
            <div v-else-if="item.evidence.kind === 'archive_probe_failure'">
              <dt>{{ $t('page.dashboard.bootstrap.providerBlock') }}</dt>
              <dd>
                {{ item.evidence.provider_id }} ·
                {{ item.evidence.block_number }}
              </dd>
            </div>
            <div>
              <dt>{{ $t('page.dashboard.bootstrap.evidenceHash') }}</dt>
              <dd>{{ item.evidence_hash }}</dd>
            </div>
            <div v-if="item.resolution">
              <dt>{{ $t('page.dashboard.bootstrap.replacementChunk') }}</dt>
              <dd>{{ item.resolution.replacement_chunk_id }}</dd>
            </div>
          </dl>
        </li>
      </ul>
      <Alert
        v-if="quarantineError && quarantines.length > 0"
        class="mt-3"
        :message="$t('page.dashboard.bootstrap.quarantineStale')"
        show-icon
        type="warning"
      />
      <Button
        v-if="quarantineNextAfter"
        block
        class="mt-3"
        :loading="quarantineLoading"
        @click="emit('loadMoreQuarantines')"
      >
        {{ $t('page.dashboard.bootstrap.loadMore') }}
      </Button>
    </WorkspaceInspectorSurface>
  </InsightPanel>
</template>

<style scoped>
.fresh-boot-panel {
  min-width: 0;
}

.fresh-boot-capability {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1rem;
  margin-bottom: 1rem;
  background: hsl(var(--qp-surface-inset));
  border: 1px solid hsl(var(--qp-border-subtle));
  border-radius: var(--qp-radius-md);
}

.fresh-boot-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  justify-content: flex-end;
}

.fresh-boot-action {
  font-weight: 600;
}

:deep(.fresh-boot-action.ant-btn-color-purple.ant-btn-variant-filled) {
  color: hsl(var(--qp-text-primary));
}

.fresh-boot-action :deep(.ant-btn-icon) {
  display: inline-flex;
  font-size: 0.875rem;
}

.fresh-boot-route-details {
  padding: 0.75rem 1rem;
  background: hsl(var(--qp-surface-inset));
  border: 1px solid hsl(var(--qp-border-subtle));
  border-radius: var(--qp-radius-md);
}

.fresh-boot-route-details summary {
  font-weight: 600;
  cursor: pointer;
}

.fresh-boot-layout {
  display: grid;
  grid-template-columns: minmax(16rem, 0.8fr) minmax(0, 2.2fr);
  gap: 1.25rem;
  align-items: stretch;
}

.fresh-boot-history,
.fresh-boot-routes,
.fresh-boot-profile,
.fresh-boot-quarantine {
  min-width: 0;
  background: hsl(var(--qp-surface-inset));
  border: 1px solid hsl(var(--qp-border-subtle));
  border-radius: var(--qp-radius-md);
}

.fresh-boot-history,
.fresh-boot-profile,
.fresh-boot-quarantine {
  padding: 1rem;
}

.fresh-boot-routes {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.fresh-boot-routes-anchor {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 1rem;
}

.fresh-boot-routes-title {
  flex: none;
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.fresh-boot-routes-body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.fresh-boot-routes-empty {
  display: grid;
  flex: 1 1 auto;
  place-items: center;
  min-height: 12rem;
}

@media (min-width: 1024px) {
  .fresh-boot-routes {
    position: relative;
    overflow: hidden;
  }

  .fresh-boot-routes-anchor {
    position: absolute;
    inset: 0;
  }
}

.fresh-boot-frontier {
  display: grid;
  gap: 0.35rem;
  margin-top: 1rem;
}

.fresh-boot-history-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-block: 1rem;
}

.fresh-boot-history-metrics > div {
  min-width: 0;
  padding: 0.75rem;
  background: hsl(var(--qp-surface-raised));
  border-radius: var(--qp-radius-sm);
}

.fresh-boot-history-metrics dt,
.fresh-boot-label,
.fresh-boot-quarantine-details dt {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.6875rem;
  color: hsl(var(--qp-text-muted));
}

.fresh-boot-history-metrics dd {
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 1.125rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.fresh-boot-profile-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.875rem;
}

.fresh-boot-profile-grid > div {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow-wrap: anywhere;
}

.fresh-boot-id,
.fresh-boot-quarantine-details dd {
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.fresh-boot-quarantine-details {
  display: grid;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

@media (max-width: 1279px) {
  .fresh-boot-profile-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1023px) {
  .fresh-boot-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .fresh-boot-routes-body {
    max-height: min(28rem, 70vh);
  }
}

@media (max-width: 639px) {
  .fresh-boot-capability {
    flex-direction: column;
  }

  .fresh-boot-profile-grid,
  .fresh-boot-history-metrics {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
