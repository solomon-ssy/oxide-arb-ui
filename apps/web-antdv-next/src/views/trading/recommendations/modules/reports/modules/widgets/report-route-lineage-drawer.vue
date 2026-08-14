<script lang="ts" setup>
import type { ReportRouteDiagnosticsView } from '@vben/types';

import { ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Alert, Descriptions, DescriptionsItem, Tag } from 'antdv-next';

import { $t } from '#/locales';
import { EMPTY_PLACEHOLDER } from '#/shared/components/format';

defineOptions({ name: 'ReportRouteLineageDrawer' });

interface RouteLineageDrawerData {
  route: ReportRouteDiagnosticsView;
}

const route = ref<null | ReportRouteDiagnosticsView>(null);
const twoColumnLayout = { lg: 2, md: 2, sm: 1, xl: 2, xs: 1, xxl: 2 };

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(open) {
    route.value = open
      ? drawerApi.getData<RouteLineageDrawerData>().route
      : null;
  },
});
</script>

<template>
  <Drawer
    :title="$t('page.quantReports.detail.routes.lineageTitle')"
    class="w-full max-w-4xl"
  >
    <div
      v-if="route"
      class="flex flex-col gap-4"
      data-testid="route-lineage-drawer"
    >
      <Alert
        v-if="!route.lineage"
        :message="$t('page.quantReports.detail.routes.lineageMissing')"
        show-icon
        type="error"
      />
      <Descriptions :column="twoColumnLayout" bordered size="small">
        <DescriptionsItem :label="$t('page.quantReports.detail.routes.route')">
          <Tag>{{ $t(`page.quantReports.routes.${route.route}`) }}</Tag>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.routes.outcome')"
        >
          {{ $t(`page.quantReports.detail.routes.outcomes.${route.outcome}`) }}
        </DescriptionsItem>
        <DescriptionsItem label="ReportRouteRunId">
          <span class="font-mono text-xs break-all">{{
            route.report_route_run_id
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.routes.modelVersion')"
        >
          <span class="font-mono text-xs break-all">{{
            route.lineage?.model_version_id ?? EMPTY_PLACEHOLDER
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.routes.modelRun')"
        >
          <span class="font-mono text-xs break-all">{{
            route.lineage?.model_run_id ?? EMPTY_PLACEHOLDER
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.routes.calibrationArtifact')"
        >
          <span class="font-mono text-xs break-all">{{
            route.lineage?.calibration_artifact_id ?? EMPTY_PLACEHOLDER
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.routes.tradePolicyArtifact')"
        >
          <span class="font-mono text-xs break-all">{{
            route.lineage?.trade_policy_artifact_id ?? EMPTY_PLACEHOLDER
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.routes.researchProfile')"
        >
          {{
            route.lineage
              ? `${route.lineage.research_profile_ref.id}@${route.lineage.research_profile_ref.version}`
              : EMPTY_PLACEHOLDER
          }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.routes.horizon')"
        >
          {{ route.lineage?.prediction_horizon_secs ?? EMPTY_PLACEHOLDER }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.routes.featureContract')"
        >
          <span class="font-mono text-xs break-all">{{
            route.lineage?.feature_contract_digest ?? EMPTY_PLACEHOLDER
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.routes.pitLineage')"
        >
          <span class="font-mono text-xs break-all">{{
            route.lineage?.pit_lineage_digest ?? EMPTY_PLACEHOLDER
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.routes.servingContract')"
        >
          <span class="font-mono text-xs break-all">{{
            route.lineage?.serving_contract_digest ?? EMPTY_PLACEHOLDER
          }}</span>
        </DescriptionsItem>
      </Descriptions>

      <Descriptions
        :column="twoColumnLayout"
        bordered
        size="small"
        :title="$t('page.quantReports.detail.routes.funnel')"
      >
        <DescriptionsItem
          :label="$t('page.quantReports.detail.routes.eligible')"
        >
          {{ route.funnel.eligible_markets }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.routes.featureComplete')"
        >
          {{ route.funnel.feature_complete_markets }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.routes.candidates')"
        >
          {{ route.funnel.calibrated_candidates }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.routes.admittedTiers')"
        >
          {{ route.funnel.admitted_economic_tiers }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.routes.selected')"
        >
          {{ route.funnel.selected_recommendations }}
        </DescriptionsItem>
      </Descriptions>

      <Descriptions
        :column="twoColumnLayout"
        bordered
        size="small"
        :title="$t('page.quantReports.detail.routes.servingEvidence')"
      >
        <DescriptionsItem :label="$t('page.quantReports.detail.routes.stage')">
          {{ $t(`enum.featureParityStage.${route.evidence.stage_ceiling}`) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.routes.evidenceComplete')"
        >
          {{
            route.evidence.evidence_complete
              ? $t('common.yes')
              : $t('common.no')
          }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.servingAudit.selectionCount')"
        >
          {{ route.evidence.selection_count }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantReports.detail.servingAudit.modelInputs')"
        >
          {{ route.evidence.model_input_count ?? EMPTY_PLACEHOLDER }}
        </DescriptionsItem>
      </Descriptions>
    </div>
  </Drawer>
</template>
