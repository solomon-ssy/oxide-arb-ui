<script lang="ts" setup>
import type {
  FactorDefinitionDetailView,
  FactorDefinitionView,
} from '@vben/types';

import { computed, ref, watch } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import {
  Card,
  Descriptions,
  DescriptionsItem,
  Empty,
  Pagination,
  Spin,
  Tag,
} from 'antdv-next';

import { getFactor } from '#/api/research';
import { $t } from '#/locales';
import EntityRouteLink from '#/shared/components/entity-route-link.vue';
import EnumTag from '#/shared/components/enum-tag.vue';
import { formatDateTimeLocal } from '#/shared/components/format';
import WorkspaceObjectStage from '#/shared/components/workspace/workspace-object-stage.vue';
import CopyableHash from '#/views/research/components/copyable-hash.vue';

defineOptions({ name: 'FactorDetailDrawer' });

interface FactorDrawerData {
  factor: FactorDefinitionView;
}

const { handleRequest } = useRequestHandler();

const factor = ref<FactorDefinitionView | null>(null);
const detail = ref<FactorDefinitionDetailView | null>(null);
const loading = ref(false);
const openId = ref<null | string>(null);
const usagePage = ref(1);
const USAGE_PAGE_SIZE = 20;

const outputLabel = computed(() => {
  const output = factor.value?.output;
  if (!output) return '—';
  if (output.output_kind === 'diagnostic') {
    return $t('enum.factorOutput.diagnostic');
  }
  if (output.output_kind === 'outcome_alpha') {
    return $t(`enum.factorOutput.${output.orientation}`);
  }
  return $t(`enum.factorOutput.${output.effect}`);
});

async function refresh(id: string) {
  loading.value = true;
  try {
    const fresh = await handleRequest(
      () => getFactor(id, { page: usagePage.value, size: USAGE_PAGE_SIZE }),
      { silent: true },
    );
    if (openId.value === id) {
      detail.value = fresh ?? null;
      factor.value = fresh?.definition ?? null;
    }
  } finally {
    loading.value = false;
  }
}

const [, drawerApi] = useVbenDrawer({
  closeOnPressEscape: true,
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<FactorDrawerData>();
      openId.value = data.factor.factor_definition_id;
      factor.value = data.factor;
      detail.value = null;
      usagePage.value = 1;
      void refresh(data.factor.factor_definition_id);
    } else {
      openId.value = null;
      factor.value = null;
      detail.value = null;
    }
  },
});

watch(usagePage, () => {
  if (openId.value) {
    void refresh(openId.value);
  }
});
</script>

<template>
  <WorkspaceObjectStage
    :drawer-api="drawerApi"
    :eyebrow="
      factor?.name ? $t('page.research.factors.detail.title') : undefined
    "
    :title="factor?.name ?? $t('page.research.factors.detail.title')"
  >
    <Spin :spinning="loading">
      <div v-if="factor" class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <EnumTag
            context="factor-detail"
            name="FactorFamily"
            :value="factor.factor_family"
          />
          <EnumTag
            context="factor-detail"
            name="FactorDefinitionScope"
            :value="factor.scope"
          />
        </div>
        <Card size="small" :title="$t('page.research.factors.detail.summary')">
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem
              :label="$t('page.research.factors.columns.factorId')"
            >
              <span class="font-mono text-xs break-all">
                {{ factor.factor_definition_id }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.factors.detail.definitionHash')"
            >
              <CopyableHash
                :label="$t('page.research.factors.detail.definitionHash')"
                :value="factor.definition_hash"
              />
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.factors.detail.featureContractHash')"
            >
              <CopyableHash
                :label="$t('page.research.factors.detail.featureContractHash')"
                :value="factor.feature_contract_hash"
              />
            </DescriptionsItem>
            <DescriptionsItem :label="$t('page.research.factors.columns.name')">
              {{ factor.name }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.factors.detail.normalization')"
            >
              <Tag color="geekblue">
                {{ $t(`enum.factorNormalization.${factor.normalization}`) }}
              </Tag>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.factors.detail.outputSemantics')"
            >
              <Tag color="geekblue">{{ outputLabel }}</Tag>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.factors.detail.required')"
            >
              <Tag :color="factor.required ? 'warning' : 'default'">
                {{
                  factor.required
                    ? $t('page.research.factors.detail.requiredYes')
                    : $t('page.research.factors.detail.requiredNo')
                }}
              </Tag>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.factors.detail.inputFeatures')"
            >
              <div class="flex flex-wrap gap-1">
                <Tag
                  v-for="feature in factor.input_features"
                  :key="feature"
                  class="font-mono text-xs"
                >
                  {{ feature }}
                </Tag>
                <span v-if="factor.input_features.length === 0">—</span>
              </div>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.factors.detail.inputSchemaVersion')"
            >
              {{ factor.input_schema_version }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.factors.detail.outputSchemaVersion')"
            >
              {{ factor.output_schema_version }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.factors.detail.createdAt')"
            >
              <span class="block w-full" data-screenshot-volatile="true">
                {{ formatDateTimeLocal(factor.created_at) }}
              </span>
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card
          size="small"
          :title="$t('page.research.factors.detail.servingUsage')"
        >
          <Empty
            v-if="detail?.serving_usage.items.length === 0"
            :description="$t('page.research.factors.detail.servingUsageEmpty')"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
          <div v-else class="space-y-3">
            <Descriptions
              v-for="usage in detail?.serving_usage.items ?? []"
              :key="usage.model_version_id"
              :column="1"
              bordered
              data-screenshot-volatile="true"
              size="small"
            >
              <DescriptionsItem
                :label="$t('page.research.factors.detail.modelVersion')"
              >
                <EntityRouteLink
                  mono
                  :label="usage.model_version_id"
                  :to="`/research/lab?module=models&entity=model-version&id=${usage.model_version_id}`"
                />
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.research.factors.detail.modelSpec')"
              >
                {{ usage.model_spec_name }} · {{ usage.model_family }}
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.research.factors.detail.profile')"
              >
                <span class="break-all font-mono text-xs">
                  {{ usage.profile_ref.id }}@{{ usage.profile_ref.version }} ·
                  {{ usage.profile_ref.content_hash }}
                </span>
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.research.factors.detail.servingContractHash')"
              >
                <CopyableHash
                  :label="
                    $t('page.research.factors.detail.servingContractHash')
                  "
                  :value="usage.serving_contract_hash"
                />
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.research.factors.detail.artifactHash')"
              >
                <CopyableHash
                  :label="$t('page.research.factors.detail.artifactHash')"
                  :value="usage.artifact_hash"
                />
              </DescriptionsItem>
            </Descriptions>
          </div>
          <Pagination
            v-if="
              detail && detail.serving_usage.total > detail.serving_usage.size
            "
            v-model:current="usagePage"
            class="mt-4"
            :page-size="USAGE_PAGE_SIZE"
            :show-size-changer="false"
            :total="detail.serving_usage.total"
          />
        </Card>
      </div>
    </Spin>
  </WorkspaceObjectStage>
</template>
