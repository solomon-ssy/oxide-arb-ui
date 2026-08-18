<script lang="ts" setup>
import type { FeatureParityEventView } from '@vben/types';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  Alert,
  Card,
  Collapse,
  CollapsePanel,
  Descriptions,
  DescriptionsItem,
} from 'antdv-next';

import { $t } from '#/locales';
import EntityRouteLink from '#/shared/components/entity-route-link.vue';
import EnumTag from '#/shared/components/enum-tag.vue';
import {
  EMPTY_PLACEHOLDER,
  formatDateTimeLocal,
} from '#/shared/components/format';
import WorkspaceInspectorSurface from '#/shared/components/workspace/workspace-inspector-surface.vue';

defineOptions({ name: 'FeatureParityEventDrawer' });

interface DrawerData {
  event: FeatureParityEventView;
}

const event = ref<FeatureParityEventView | null>(null);
const isPreInferenceReport = computed(
  () => !!event.value?.report_id && !event.value.model_run_id,
);

const detailEntries = computed(() => {
  const detail = event.value?.detail;
  if (!detail || typeof detail !== 'object' || Array.isArray(detail)) {
    return [];
  }
  return Object.entries(detail as Record<string, unknown>);
});
const detailJson = computed(() =>
  JSON.stringify(event.value?.detail ?? null, null, 2),
);

function display(value: null | string | undefined): string {
  return value === null || value === undefined || value === '' ? '—' : value;
}

function displayDetail(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  return typeof value === 'string' ? value : JSON.stringify(value);
}

const [, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    event.value = isOpen ? drawerApi.getData<DrawerData>().event : null;
  },
});
</script>

<template>
  <WorkspaceInspectorSurface
    :drawer-api="drawerApi"
    :title="$t('page.research.featureIntegrity.event.title')"
    width="720"
  >
    <div v-if="event" class="flex flex-col gap-4">
      <div class="flex flex-wrap gap-2">
        <EnumTag
          context="parity-event-drawer"
          name="FeatureParityEventStatus"
          :value="event.status"
        />
        <EnumTag
          context="parity-event-drawer"
          name="FeatureParityStage"
          :value="event.stage"
        />
      </div>

      <Alert
        v-if="event.reason"
        :message="event.reason"
        show-icon
        :type="event.status === 'mismatched' ? 'error' : 'warning'"
      />
      <Alert
        v-if="isPreInferenceReport"
        :message="$t('page.research.featureIntegrity.event.preInference')"
        show-icon
        type="info"
      />

      <Card
        size="small"
        :title="$t('page.research.featureIntegrity.event.context')"
      >
        <Descriptions :column="1" bordered size="small">
          <DescriptionsItem
            :label="$t('page.research.featureIntegrity.columns.eventId')"
            :span="2"
          >
            <span class="font-mono text-xs break-all">{{
              event.parity_event_id
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.featureIntegrity.columns.runId')"
            :span="2"
          >
            <EntityRouteLink
              mono
              :label="event.parity_run_id"
              :to="`/research/data-reliability?module=feature-integrity&entity=parity-run&id=${event.parity_run_id}`"
            />
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.featureIntegrity.columns.decisionAt')"
          >
            {{ formatDateTimeLocal(event.decision_at) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.featureIntegrity.event.subject')"
          >
            {{
              $t(
                isPreInferenceReport
                  ? 'page.research.featureIntegrity.event.subjects.preInferenceReport'
                  : 'page.research.featureIntegrity.event.subjects.modelRun',
              )
            }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.featureIntegrity.columns.feature')"
          >
            {{ display(event.feature_name) }}
          </DescriptionsItem>
          <DescriptionsItem
            v-if="event.report_id"
            :label="$t('page.research.featureIntegrity.event.report')"
          >
            <EntityRouteLink
              mono
              :label="event.report_id"
              :to="`/trading/recommendations?module=queue&entity=report&id=${event.report_id}`"
            />
          </DescriptionsItem>
          <DescriptionsItem
            v-if="event.model_version_id"
            :label="$t('page.research.featureIntegrity.event.model')"
          >
            <EntityRouteLink
              mono
              :label="event.model_version_id"
              :to="`/research/lab?module=models&entity=model-version&id=${event.model_version_id}`"
            />
          </DescriptionsItem>
          <DescriptionsItem
            v-if="event.model_run_id"
            :label="$t('page.research.featureIntegrity.event.modelRun')"
          >
            <EntityRouteLink
              v-if="event.report_id"
              mono
              :label="event.model_run_id"
              :to="`/trading/recommendations?module=queue&entity=report&id=${event.report_id}`"
            />
            <EntityRouteLink
              v-else-if="event.model_version_id"
              mono
              :label="event.model_run_id"
              :to="`/research/lab?module=models&entity=model-version&id=${event.model_version_id}`"
            />
            <span v-else class="font-mono text-xs break-all">
              {{ event.model_run_id }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.featureIntegrity.event.job')"
          >
            <EntityRouteLink
              :label="$t('page.research.featureIntegrity.event.openJob')"
              to="/runtime/activity?domain=research"
            />
          </DescriptionsItem>
          <DescriptionsItem
            v-if="event.training_dataset_id"
            :label="$t('page.research.featureIntegrity.event.dataset')"
          >
            <EntityRouteLink
              mono
              :label="event.training_dataset_id"
              :to="`/research/lab?module=datasets&entity=training-dataset&id=${event.training_dataset_id}`"
            />
          </DescriptionsItem>
          <DescriptionsItem
            v-if="event.market_id"
            :label="$t('page.research.featureIntegrity.columns.market')"
          >
            <span class="font-mono text-xs break-all">{{
              event.market_id
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.featureIntegrity.event.contractHash')"
            :span="2"
          >
            <span class="font-mono text-xs break-all">
              {{ event.feature_contract_hash }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.featureIntegrity.event.transformHash')"
            :span="2"
          >
            <span class="font-mono text-xs break-all">
              {{ display(event.transform_hash) }}
            </span>
          </DescriptionsItem>
        </Descriptions>
      </Card>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          size="small"
          :title="$t('page.research.featureIntegrity.event.online')"
        >
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem
              :label="$t('page.research.featureIntegrity.event.state')"
            >
              <EnumTag
                v-if="event.online.state"
                context="parity-event-drawer"
                name="FeatureCellState"
                :value="event.online.state"
              />
              <span v-else>{{ EMPTY_PLACEHOLDER }}</span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.featureIntegrity.event.value')"
            >
              <span class="font-mono text-xs break-all">{{
                display(event.online.value)
              }}</span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.featureIntegrity.event.effectiveAt')"
            >
              {{ formatDateTimeLocal(event.online.effective_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.featureIntegrity.event.availableAt')"
            >
              {{ formatDateTimeLocal(event.online.available_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.featureIntegrity.event.cutoff')"
            >
              {{ formatDateTimeLocal(event.online.cutoff) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.featureIntegrity.event.fingerprint')"
            >
              <span class="font-mono text-xs break-all">{{
                event.online.fingerprint
              }}</span>
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card
          size="small"
          :title="$t('page.research.featureIntegrity.event.replay')"
        >
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem
              :label="$t('page.research.featureIntegrity.event.state')"
            >
              <EnumTag
                v-if="event.replay.state"
                context="parity-event-drawer"
                name="FeatureCellState"
                :value="event.replay.state"
              />
              <span v-else>{{ EMPTY_PLACEHOLDER }}</span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.featureIntegrity.event.value')"
            >
              <span class="font-mono text-xs break-all">{{
                display(event.replay.value)
              }}</span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.featureIntegrity.event.effectiveAt')"
            >
              {{ formatDateTimeLocal(event.replay.effective_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.featureIntegrity.event.availableAt')"
            >
              {{ formatDateTimeLocal(event.replay.available_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.featureIntegrity.event.cutoff')"
            >
              {{ formatDateTimeLocal(event.replay.cutoff) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.featureIntegrity.event.fingerprint')"
            >
              <span class="font-mono text-xs break-all">{{
                event.replay.fingerprint
              }}</span>
            </DescriptionsItem>
          </Descriptions>
        </Card>
      </div>

      <Card
        v-if="detailEntries.length > 0"
        size="small"
        :title="$t('page.research.featureIntegrity.event.comparisonDetail')"
      >
        <Descriptions :column="1" bordered size="small">
          <DescriptionsItem
            v-for="[key, value] in detailEntries"
            :key="key"
            :label="key"
          >
            <span class="font-mono text-xs break-all">
              {{ displayDetail(value) }}
            </span>
          </DescriptionsItem>
        </Descriptions>
      </Card>

      <Collapse ghost>
        <CollapsePanel
          key="raw-evidence"
          :header="$t('page.research.featureIntegrity.event.rawEvidence')"
        >
          <pre class="max-h-80 overflow-auto text-xs">{{ detailJson }}</pre>
        </CollapsePanel>
      </Collapse>
    </div>
  </WorkspaceInspectorSurface>
</template>
