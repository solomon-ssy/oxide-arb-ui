<script lang="ts" setup>
import type { FeatureParityRunView } from '@vben/types';

import { ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Alert, Card, Descriptions, DescriptionsItem, Tag } from 'antdv-next';

import { $t } from '#/locales';
import EntityRouteLink from '#/shared/components/entity-route-link.vue';
import { formatDateTimeLocal } from '#/shared/components/format';
import { enumOption, enumOptions } from '#/shared/presentation/enum-options';

defineOptions({ name: 'FeatureParityRunDrawer' });

interface DrawerData {
  run: FeatureParityRunView;
}

const run = ref<FeatureParityRunView | null>(null);
const kindOptions = enumOptions('FeatureParityRunKind');
const statusOptions = enumOptions('FeatureParityRunStatus');

function display(value: null | string | undefined): string {
  return value === null || value === undefined || value === '' ? '—' : value;
}

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    run.value = isOpen ? drawerApi.getData<DrawerData>().run : null;
  },
});
</script>

<template>
  <Drawer
    :title="$t('page.research.featureIntegrity.run.title')"
    class="w-full max-w-4xl"
  >
    <div v-if="run" class="flex flex-col gap-4">
      <div class="flex flex-wrap gap-2">
        <Tag :color="enumOption(kindOptions, run.kind)?.color">
          {{ enumOption(kindOptions, run.kind)?.label }}
        </Tag>
        <Tag :color="enumOption(statusOptions, run.status)?.color">
          {{ enumOption(statusOptions, run.status)?.label }}
        </Tag>
      </div>

      <Alert
        v-if="run.failure_code || run.failure_detail"
        :description="run.failure_detail || undefined"
        :message="
          run.failure_code || $t('page.research.featureIntegrity.run.failure')
        "
        show-icon
        type="error"
      />

      <Card
        size="small"
        :title="$t('page.research.featureIntegrity.run.context')"
      >
        <Descriptions :column="2" bordered size="small">
          <DescriptionsItem
            :label="$t('page.research.featureIntegrity.columns.runId')"
            :span="2"
          >
            <EntityRouteLink
              mono
              :label="run.parity_run_id"
              :to="`/research/data-reliability?module=feature-integrity&entity=parity-run&id=${run.parity_run_id}`"
            />
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.featureIntegrity.run.job')"
          >
            <EntityRouteLink
              :label="$t('page.research.featureIntegrity.event.openJob')"
              to="/runtime/activity?domain=research"
            />
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.featureIntegrity.columns.reason')"
          >
            {{ run.reason }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.featureIntegrity.run.triggeredBy')"
          >
            {{ run.triggered_by }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.featureIntegrity.run.requestedBy')"
          >
            {{ display(run.requested_by) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.featureIntegrity.run.actingRole')"
          >
            {{ run.acting_role }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.featureIntegrity.columns.windowStart')"
          >
            {{ formatDateTimeLocal(run.window_start) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.featureIntegrity.columns.windowEnd')"
          >
            {{ formatDateTimeLocal(run.window_end) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.featureIntegrity.run.startedAt')"
          >
            {{ formatDateTimeLocal(run.started_at) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.featureIntegrity.run.pendingSince')"
          >
            {{ formatDateTimeLocal(run.pending_since) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="
              $t('page.research.featureIntegrity.run.containmentCompletedAt')
            "
          >
            {{ formatDateTimeLocal(run.containment_completed_at) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.featureIntegrity.columns.finishedAt')"
          >
            {{ formatDateTimeLocal(run.finished_at) }}
          </DescriptionsItem>
        </Descriptions>
      </Card>

      <Card
        size="small"
        :title="$t('page.research.featureIntegrity.run.subjects')"
      >
        <Descriptions :column="1" bordered size="small">
          <DescriptionsItem
            v-if="run.report_id"
            :label="$t('page.research.featureIntegrity.event.report')"
          >
            <EntityRouteLink
              mono
              :label="run.report_id"
              :to="`/trading/recommendations?module=queue&entity=report&id=${run.report_id}`"
            />
          </DescriptionsItem>
          <DescriptionsItem
            v-if="run.model_version_id"
            :label="$t('page.research.featureIntegrity.event.model')"
          >
            <EntityRouteLink
              mono
              :label="run.model_version_id"
              :to="`/research/lab?module=models&entity=model-version&id=${run.model_version_id}`"
            />
          </DescriptionsItem>
          <DescriptionsItem
            v-if="run.training_dataset_id"
            :label="$t('page.research.featureIntegrity.event.dataset')"
          >
            <EntityRouteLink
              mono
              :label="run.training_dataset_id"
              :to="`/research/lab?module=datasets&entity=training-dataset&id=${run.training_dataset_id}`"
            />
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.featureIntegrity.run.contractHash')"
          >
            <span class="font-mono text-xs break-all">{{
              run.feature_contract_hash
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.featureIntegrity.run.transformHash')"
          >
            <span class="font-mono text-xs break-all">{{
              display(run.transform_hash)
            }}</span>
          </DescriptionsItem>
        </Descriptions>
      </Card>

      <Card
        size="small"
        :title="$t('page.research.featureIntegrity.run.counts')"
      >
        <Descriptions :column="2" bordered size="small">
          <DescriptionsItem
            :label="$t('page.research.featureIntegrity.run.total')"
          >
            {{ run.total_count }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.featureIntegrity.columns.compared')"
          >
            {{ run.compared_count }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.featureIntegrity.run.matched')"
          >
            {{ run.matched_count }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.featureIntegrity.columns.mismatched')"
          >
            {{ run.mismatched_count }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.featureIntegrity.columns.pending')"
          >
            {{ run.pending_materialization_count }}
          </DescriptionsItem>
        </Descriptions>
      </Card>
    </div>
  </Drawer>
</template>
