<script lang="ts" setup>
import type { ResearchJobView } from '@vben/types';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';
import { isActiveResearchJobStatus } from '@vben/types';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Progress,
  Spin,
  Tag,
} from 'antdv-next';
import { Mode } from 'vanilla-jsoneditor';

import { getResearchJob } from '#/api/research';
import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';
import {
  findTagOption,
  useResearchJobKindTagOptions,
  useResearchJobStatusTagOptions,
} from '#/shared/components/format/tag-options';
import JsonEditorShell from '#/shared/components/json-editor/json-editor-shell.vue';
import { usePolling } from '#/shared/composables/use-polling';

import { jobResultRoute } from './schemas';

defineOptions({ name: 'ResearchJobDetailDrawer' });

interface JobDrawerData {
  job: ResearchJobView;
}

const router = useRouter();
const { handleRequest } = useRequestHandler();
const statusTagOptions = useResearchJobStatusTagOptions();
const kindTagOptions = useResearchJobKindTagOptions();

const job = ref<null | ResearchJobView>(null);
const loading = ref(false);
const openId = ref<null | string>(null);

const statusTag = computed(() =>
  findTagOption(statusTagOptions, job.value?.status),
);
const kindTag = computed(() => findTagOption(kindTagOptions, job.value?.kind));
const pct = computed(() => {
  const raw = job.value?.progress_pct;
  if (typeof raw !== 'number') {
    return null;
  }
  return Math.round(raw * 100);
});
const resultRoute = computed(() =>
  job.value ? jobResultRoute(job.value) : undefined,
);
const polling = computed(
  () =>
    !!openId.value &&
    !!job.value &&
    isActiveResearchJobStatus(job.value.status),
);

async function refresh(id: string) {
  loading.value = true;
  try {
    const fresh = await handleRequest(() => getResearchJob(id), {
      silent: true,
    });
    if (openId.value === id) {
      job.value = fresh ?? null;
    }
  } finally {
    loading.value = false;
  }
}

// Poll while the job is still queued/running (WS is a hint, not the truth).
usePolling(
  () => {
    const id = openId.value;
    if (id) {
      void refresh(id);
    }
  },
  { enabled: polling, intervalMs: 3000 },
);

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<JobDrawerData>();
      openId.value = data.job.job_id;
      job.value = data.job;
      void refresh(data.job.job_id);
    } else {
      openId.value = null;
      job.value = null;
    }
  },
});

function openResult() {
  if (resultRoute.value) {
    void router.push(resultRoute.value);
  }
}
</script>

<template>
  <Drawer
    :title="$t('page.research.jobs.detail.title')"
    class="w-full max-w-3xl"
  >
    <Spin :spinning="loading">
      <div v-if="job" class="flex flex-col gap-4">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <Tag :color="kindTag?.color">{{ kindTag?.label }}</Tag>
            <Tag :color="statusTag?.color">{{ statusTag?.label }}</Tag>
            <Tag v-if="job.recovery_attempt > 0" color="warning">
              {{
                $t('page.research.jobs.recovery.badge', {
                  count: job.recovery_attempt,
                })
              }}
            </Tag>
          </div>
          <Button v-if="resultRoute" type="primary" @click="openResult">
            {{ $t('page.research.jobs.actions.openResult') }}
          </Button>
        </div>

        <Card size="small" :title="$t('page.research.jobs.detail.progress')">
          <Progress
            v-if="pct !== null"
            :percent="pct"
            :status="job.status === 'failed' ? 'exception' : undefined"
          />
          <p class="text-muted-foreground mt-2 text-sm">
            {{ $t('page.research.jobs.detail.progress') }}:
            <span class="font-mono">
              {{ job.progress?.phase ?? '—' }}
              <template v-if="job.progress?.total != null">
                ({{ job.progress.processed }}/{{ job.progress.total }})
              </template>
            </span>
          </p>
        </Card>

        <Alert
          v-if="job.error"
          type="error"
          show-icon
          :message="job.error.code"
          :description="job.error.message"
        />

        <Card size="small" :title="$t('page.research.jobs.detail.title')">
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem :label="$t('page.research.jobs.columns.jobId')">
              <span class="font-mono text-xs break-all">{{ job.job_id }}</span>
            </DescriptionsItem>
            <DescriptionsItem :label="$t('page.research.jobs.detail.acting')">
              {{ job.acting_role }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.jobs.detail.recoveryAttempt')"
            >
              {{ job.recovery_attempt }} / {{ job.max_recovery_attempts }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.jobs.detail.startedAt')"
            >
              {{ job.started_at ? formatDateTimeLocal(job.started_at) : '—' }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.jobs.columns.finishedAt')"
            >
              {{ job.finished_at ? formatDateTimeLocal(job.finished_at) : '—' }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.jobs.detail.heartbeatAt')"
            >
              {{
                job.heartbeat_at ? formatDateTimeLocal(job.heartbeat_at) : '—'
              }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.jobs.detail.leaseExpiresAt')"
            >
              {{
                job.lease_expires_at
                  ? formatDateTimeLocal(job.lease_expires_at)
                  : '—'
              }}
            </DescriptionsItem>
            <DescriptionsItem
              v-if="job.parent_job_id"
              :label="$t('page.research.jobs.detail.lineage')"
            >
              <span class="font-mono text-xs break-all">
                {{ job.parent_job_id }}
              </span>
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card size="small" :title="$t('page.research.jobs.detail.params')">
          <JsonEditorShell
            :model-value="job.params"
            :mode="Mode.tree"
            read-only
          />
        </Card>

        <Card
          v-if="job.coverage_json"
          size="small"
          :title="$t('page.research.jobs.detail.coverage')"
        >
          <JsonEditorShell
            :model-value="job.coverage_json"
            :mode="Mode.tree"
            read-only
          />
        </Card>
      </div>
    </Spin>
  </Drawer>
</template>
