<script lang="ts" setup>
import type { BacktestReportView, TrainedModelView } from '@vben/types';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import {
  Card,
  Descriptions,
  DescriptionsItem,
  Empty,
  Spin,
  Tag,
} from 'antdv-next';
import { Mode } from 'vanilla-jsoneditor';

import { getModel, listBacktestReports } from '#/api/research';
import { $t } from '#/locales';
import EntityRouteLink from '#/shared/components/entity-route-link.vue';
import { formatDateTimeLocal } from '#/shared/components/format';
import {
  findTagOption,
  usePublicationStatusTagOptions,
} from '#/shared/components/format/tag-options';
import JsonEditorShell from '#/shared/components/json-editor/json-editor-shell.vue';

defineOptions({ name: 'ModelDetailDrawer' });

interface ModelDrawerData {
  model: TrainedModelView;
}

const { handleRequest } = useRequestHandler();
const statusTagOptions = usePublicationStatusTagOptions();

const model = ref<null | TrainedModelView>(null);
const backtests = ref<BacktestReportView[]>([]);
const loading = ref(false);
const openId = ref<null | string>(null);

const metrics = computed(() => model.value?.metrics ?? {});
const statusTag = computed(() =>
  findTagOption(statusTagOptions, model.value?.publication_status),
);

async function refresh(id: string) {
  loading.value = true;
  try {
    const [fresh, reports] = await Promise.all([
      handleRequest(() => getModel(id), { silent: true }),
      handleRequest(
        () => listBacktestReports({ model_version_id: id, size: 50 }),
        { silent: true },
      ),
    ]);
    if (openId.value === id) {
      model.value = fresh ?? null;
      backtests.value = reports?.items ?? [];
    }
  } finally {
    loading.value = false;
  }
}

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<ModelDrawerData>();
      openId.value = data.model.model_version_id;
      model.value = data.model;
      void refresh(data.model.model_version_id);
    } else {
      openId.value = null;
      model.value = null;
      backtests.value = [];
    }
  },
});
</script>

<template>
  <Drawer
    :title="$t('page.research.models.detail.title')"
    class="w-full max-w-3xl"
  >
    <Spin :spinning="loading">
      <div v-if="model" class="flex flex-col gap-4">
        <Tag :color="statusTag?.color">{{ statusTag?.label }}</Tag>

        <Card size="small" :title="$t('page.research.models.detail.summary')">
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem
              :label="$t('page.research.models.columns.modelVersionId')"
            >
              <span class="font-mono text-xs break-all">
                {{ model.model_version_id }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.models.columns.modelSpec')"
            >
              {{ model.model_spec_id }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.models.columns.version')"
            >
              {{ model.version }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.models.columns.artifactHash')"
            >
              <span class="font-mono text-xs break-all">
                {{ model.artifact_hash }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              v-if="model.training_dataset_id"
              :label="$t('page.research.models.columns.dataset')"
            >
              <EntityRouteLink
                mono
                :label="model.training_dataset_id"
                :to="`/research/datasets?open=${model.training_dataset_id}`"
              />
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.models.columns.createdAt')"
            >
              {{ formatDateTimeLocal(model.created_at) }}
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card size="small" :title="$t('page.research.models.detail.metrics')">
          <JsonEditorShell :model-value="metrics" :mode="Mode.tree" read-only />
        </Card>

        <Card size="small" :title="$t('page.research.models.detail.backtests')">
          <div v-if="backtests.length > 0" class="flex flex-col gap-2">
            <div
              v-for="report in backtests"
              :key="report.backtest_report_id"
              class="flex items-center justify-between gap-2 text-sm"
            >
              <EntityRouteLink
                mono
                :label="report.backtest_report_id"
                :to="`/research/backtests?open=${report.backtest_report_id}`"
              />
              <span class="text-muted-foreground text-xs">
                {{ formatDateTimeLocal(report.created_at) }}
              </span>
            </div>
          </div>
          <Empty
            v-else
            :description="$t('page.research.models.detail.noBacktests')"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
        </Card>
      </div>
    </Spin>
  </Drawer>
</template>
