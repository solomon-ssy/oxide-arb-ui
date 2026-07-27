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
  useFactorFamilyTagOptions,
  useFactorScopeTagOptions,
} from '#/shared/components/format/tag-options';

defineOptions({ name: 'FactorDetailDrawer' });

interface FactorDrawerData {
  factor: FactorDefinitionView;
}

const { handleRequest } = useRequestHandler();
const familyTagOptions = useFactorFamilyTagOptions();
const scopeTagOptions = useFactorScopeTagOptions();

const factor = ref<FactorDefinitionView | null>(null);
const loading = ref(false);
const openId = ref<null | string>(null);

const familyTag = computed(() =>
  findTagOption(familyTagOptions, factor.value?.factor_family),
);
const scopeTag = computed(() =>
  findTagOption(scopeTagOptions, factor.value?.scope),
);
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
              {{ formatDateTimeLocal(factor.created_at) }}
            </DescriptionsItem>
          </Descriptions>
        </Card>
      </div>
    </Spin>
  </Drawer>
</template>
