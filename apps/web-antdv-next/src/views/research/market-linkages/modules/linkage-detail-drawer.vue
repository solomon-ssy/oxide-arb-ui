<script lang="ts" setup>
import type { MarketLinkageDetailView } from '@vben/types';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Card, Descriptions, DescriptionsItem, Tag } from 'antdv-next';

import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';
import {
  findTagOption,
  useLinkageStatusTagOptions,
  useResolverTierTagOptions,
} from '#/shared/components/format/tag-options';

defineOptions({ name: 'LinkageDetailDrawer' });

interface DrawerData {
  detail: MarketLinkageDetailView;
}

const detail = ref<MarketLinkageDetailView | null>(null);

const statusTag = computed(() =>
  findTagOption(useLinkageStatusTagOptions(), detail.value?.status),
);
const tierTag = computed(() =>
  findTagOption(useResolverTierTagOptions(), detail.value?.resolver_tier),
);

const outcomeJson = computed(() =>
  detail.value ? JSON.stringify(detail.value.outcome, null, 2) : '',
);

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    detail.value = isOpen ? drawerApi.getData<DrawerData>().detail : null;
  },
});
</script>

<template>
  <Drawer
    :title="$t('page.research.marketLinkages.detail.title')"
    class="w-full max-w-4xl"
  >
    <div v-if="detail" class="flex flex-col gap-4">
      <Card
        size="small"
        :title="$t('page.research.marketLinkages.detail.provenance')"
      >
        <Descriptions :column="1" bordered size="small">
          <DescriptionsItem
            :label="$t('page.research.marketLinkages.detail.fields.marketId')"
          >
            <span class="break-all font-mono text-xs">{{
              detail.market_id
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.marketLinkages.detail.fields.status')"
          >
            <Tag :color="statusTag?.color">
              {{ statusTag?.label ?? detail.status }}
            </Tag>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.marketLinkages.detail.fields.tier')"
          >
            <Tag :color="tierTag?.color">
              {{ tierTag?.label ?? detail.resolver_tier }}
              (v{{ detail.resolver_version }})
            </Tag>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.marketLinkages.detail.fields.confidence')"
          >
            {{ detail.confidence }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.marketLinkages.detail.fields.instrument')"
          >
            <span class="break-all font-mono text-xs">
              {{
                detail.instrument_key ??
                $t('page.research.marketLinkages.emptyInstrument')
              }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="
              $t('page.research.marketLinkages.detail.fields.metadataHash')
            "
          >
            <span class="break-all font-mono text-xs">{{
              detail.metadata_hash
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="
              $t('page.research.marketLinkages.detail.fields.contentHash')
            "
          >
            <span class="break-all font-mono text-xs">{{
              detail.content_hash
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.marketLinkages.detail.fields.derivedAt')"
          >
            {{ formatDateTimeLocal(detail.derived_at) }}
          </DescriptionsItem>
        </Descriptions>
      </Card>

      <Card
        size="small"
        :title="$t('page.research.marketLinkages.detail.outcome')"
      >
        <pre class="max-h-96 overflow-auto rounded bg-muted p-3 text-xs">{{
          outcomeJson
        }}</pre>
      </Card>
    </div>
  </Drawer>
</template>
