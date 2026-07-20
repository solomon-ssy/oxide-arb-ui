<script lang="ts" setup>
import type { FactorDefinitionView } from '@vben/types';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Card, Descriptions, DescriptionsItem, Spin, Tag } from 'antdv-next';

import { getFactor } from '#/api/research';
import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';
import {
  findTagOption,
  useFactorDirectionTagOptions,
  useFactorFamilyTagOptions,
  useFactorScopeTagOptions,
  usePublicationStatusTagOptions,
} from '#/shared/components/format/tag-options';

defineOptions({ name: 'FactorDetailDrawer' });

interface FactorDrawerData {
  factor: FactorDefinitionView;
}

const { handleRequest } = useRequestHandler();
const statusTagOptions = usePublicationStatusTagOptions();
const familyTagOptions = useFactorFamilyTagOptions();
const scopeTagOptions = useFactorScopeTagOptions();
const directionTagOptions = useFactorDirectionTagOptions();

const factor = ref<FactorDefinitionView | null>(null);
const loading = ref(false);
const openId = ref<null | string>(null);

const statusTag = computed(() =>
  findTagOption(statusTagOptions, factor.value?.status),
);
const familyTag = computed(() =>
  findTagOption(familyTagOptions, factor.value?.factor_family),
);
const scopeTag = computed(() =>
  findTagOption(scopeTagOptions, factor.value?.scope),
);
const directionTag = computed(() =>
  findTagOption(directionTagOptions, factor.value?.direction ?? undefined),
);

async function refresh(id: string) {
  loading.value = true;
  try {
    const fresh = await handleRequest(() => getFactor(id), { silent: true });
    if (openId.value === id) {
      factor.value = fresh ?? null;
    }
  } finally {
    loading.value = false;
  }
}

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<FactorDrawerData>();
      openId.value = data.factor.factor_definition_id;
      factor.value = data.factor;
      void refresh(data.factor.factor_definition_id);
    } else {
      openId.value = null;
      factor.value = null;
    }
  },
});
</script>

<template>
  <Drawer
    :title="$t('page.research.factors.detail.title')"
    class="w-full max-w-2xl"
  >
    <Spin :spinning="loading">
      <div v-if="factor" class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <Tag :color="statusTag?.color">{{ statusTag?.label }}</Tag>
          <Tag :color="familyTag?.color">{{ familyTag?.label }}</Tag>
          <Tag :color="scopeTag?.color">{{ scopeTag?.label }}</Tag>
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
              :label="$t('page.research.factors.detail.direction')"
            >
              <Tag :color="directionTag?.color">
                {{ directionTag?.label }}
              </Tag>
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
              v-if="factor.quality_gates.length > 0"
              :label="$t('page.research.factors.detail.qualityGates')"
            >
              <div class="flex flex-wrap gap-1">
                <Tag
                  v-for="gate in factor.quality_gates"
                  :key="gate"
                  color="purple"
                >
                  {{ gate }}
                </Tag>
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
              {{ formatDateTimeLocal(factor.created_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.factors.columns.updatedAt')"
            >
              {{ formatDateTimeLocal(factor.updated_at) }}
            </DescriptionsItem>
          </Descriptions>
        </Card>
      </div>
    </Spin>
  </Drawer>
</template>
