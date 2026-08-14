<script lang="ts" setup>
import type {
  CalibrationArtifactDetailView,
  MarketPriceBiasPayload,
  ModelScoreCalibrationPayload,
  TtrBucketCurveView,
  WeatherStationLeadBiasPayload,
} from '@vben/types';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  Card,
  Descriptions,
  DescriptionsItem,
  Empty,
  Statistic,
  Table,
  Tag,
} from 'antdv-next';

import { $t } from '#/locales';
import { formatDateTimeLocal, formatPercent } from '#/shared/components/format';
import ReliabilityChart from '#/shared/components/reliability-chart.vue';

defineOptions({ name: 'CalibrationArtifactDetailDrawer' });

interface DrawerData {
  detail: CalibrationArtifactDetailView;
}

const detail = ref<CalibrationArtifactDetailView | null>(null);

const isMarketPriceBias = computed(
  () => detail.value?.kind === 'market_price_bias',
);

const biasPayload = computed<MarketPriceBiasPayload | null>(() =>
  detail.value?.payload.kind === 'market_price_bias'
    ? detail.value.payload.payload
    : null,
);

const modelPayload = computed<ModelScoreCalibrationPayload | null>(() =>
  detail.value?.payload.kind === 'model_score'
    ? detail.value.payload.payload
    : null,
);

const weatherPayload = computed<null | WeatherStationLeadBiasPayload>(() =>
  detail.value?.payload.kind === 'weather_station_lead_bias'
    ? detail.value.payload.payload
    : null,
);

const categoryCurves = computed<
  { category: string; curve: TtrBucketCurveView; key: string }[]
>(() =>
  biasPayload.value
    ? Object.entries(biasPayload.value.by_category).flatMap(
        ([category, categoryCurve]) =>
          categoryCurve.by_ttr.map((curve) => ({
            category,
            curve,
            key: `${category}:${curve.ttr_lo_secs}:${curve.ttr_hi_secs ?? 'unbounded'}`,
          })),
      )
    : [],
);

function ttrRange(curve: TtrBucketCurveView) {
  return curve.ttr_hi_secs === null
    ? `${curve.ttr_lo_secs}s+`
    : `${curve.ttr_lo_secs}s–${curve.ttr_hi_secs}s`;
}

const binColumns = computed(() => [
  {
    dataIndex: 'price_lo',
    title: $t('page.research.calibrationArtifacts.detail.binColumns.priceLo'),
  },
  {
    dataIndex: 'price_hi',
    title: $t('page.research.calibrationArtifacts.detail.binColumns.priceHi'),
  },
  {
    dataIndex: 'implied_mid',
    title: $t('page.research.calibrationArtifacts.detail.binColumns.implied'),
  },
  {
    dataIndex: 'realized_frequency',
    title: $t('page.research.calibrationArtifacts.detail.binColumns.realized'),
  },
  {
    dataIndex: 'bias',
    title: $t('page.research.calibrationArtifacts.detail.binColumns.bias'),
  },
  {
    dataIndex: 'sample_count',
    title: $t('page.research.calibrationArtifacts.detail.binColumns.samples'),
  },
]);

const reliabilityBinColumns = computed(() => [
  {
    dataIndex: 'predicted_lo',
    title: $t(
      'page.research.calibrationArtifacts.detail.reliabilityColumns.predictedLo',
    ),
  },
  {
    dataIndex: 'predicted_hi',
    title: $t(
      'page.research.calibrationArtifacts.detail.reliabilityColumns.predictedHi',
    ),
  },
  {
    dataIndex: 'mean_predicted',
    title: $t(
      'page.research.calibrationArtifacts.detail.reliabilityColumns.predicted',
    ),
  },
  {
    dataIndex: 'empirical_frequency',
    title: $t(
      'page.research.calibrationArtifacts.detail.reliabilityColumns.empirical',
    ),
  },
  {
    key: 'wilson_ci',
    title: $t(
      'page.research.calibrationArtifacts.detail.reliabilityColumns.wilsonCi',
    ),
  },
  {
    dataIndex: 'mean_adverse_excursion_bps',
    title: $t(
      'page.research.calibrationArtifacts.detail.reliabilityColumns.mae',
    ),
  },
  {
    dataIndex: 'sample_count',
    title: $t(
      'page.research.calibrationArtifacts.detail.reliabilityColumns.samples',
    ),
  },
]);

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    detail.value = isOpen ? drawerApi.getData<DrawerData>().detail : null;
  },
});
</script>

<template>
  <Drawer
    class="w-full max-w-4xl"
    :title="$t('page.research.calibrationArtifacts.detail.title')"
  >
    <div v-if="detail" class="flex flex-col gap-4">
      <Card
        size="small"
        :title="$t('page.research.calibrationArtifacts.detail.provenance')"
      >
        <Descriptions :column="1" bordered size="small">
          <DescriptionsItem
            :label="$t('page.research.calibrationArtifacts.detail.fields.kind')"
          >
            <Tag>{{ $t(`enum.calibrationKind.${detail.kind}`) }}</Tag>
          </DescriptionsItem>
          <DescriptionsItem
            :label="
              $t('page.research.calibrationArtifacts.detail.fields.contentHash')
            "
          >
            <span class="break-all font-mono text-xs">
              {{ detail.content_hash }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="
              $t('page.research.calibrationArtifacts.detail.fields.fitWindow')
            "
          >
            {{ formatDateTimeLocal(detail.fit_window_start) }}
            {{ $t('page.research.calibrationArtifacts.fitWindowSeparator') }}
            {{ formatDateTimeLocal(detail.fit_window_end) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="
              $t(
                'page.research.calibrationArtifacts.detail.fields.calibrationSplitHash',
              )
            "
          >
            <span class="break-all font-mono text-xs">
              {{ detail.calibration_split_hash }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="
              $t('page.research.calibrationArtifacts.detail.fields.sampleCount')
            "
          >
            {{ detail.sample_count }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="
              $t('page.research.calibrationArtifacts.detail.fields.active')
            "
          >
            {{
              detail.active
                ? $t('page.research.calibrationArtifacts.active.yes')
                : $t('page.research.calibrationArtifacts.active.no')
            }}
          </DescriptionsItem>
        </Descriptions>
      </Card>

      <template v-if="isMarketPriceBias">
        <Card v-for="item in categoryCurves" :key="item.key" size="small">
          <template #title>
            <div class="flex items-center gap-2">
              <span>{{ item.category }}</span>
              <Tag>{{ ttrRange(item.curve) }}</Tag>
              <Tag :color="item.curve.ic_significant ? 'success' : 'default'">
                {{
                  item.curve.ic_significant
                    ? $t(
                        'page.research.calibrationArtifacts.detail.icSignificant',
                        { ic: item.curve.ic },
                      )
                    : $t(
                        'page.research.calibrationArtifacts.detail.icGatedOff',
                        { ic: item.curve.ic },
                      )
                }}
              </Tag>
              <span class="text-muted-foreground text-xs">
                {{
                  $t(
                    'page.research.calibrationArtifacts.detail.categorySamples',
                    { count: item.curve.sample_count },
                  )
                }}
              </span>
            </div>
          </template>
          <Table
            :columns="binColumns"
            :data-source="item.curve.bins"
            :pagination="false"
            row-key="price_lo"
            size="small"
          />
        </Card>
        <Empty
          v-if="categoryCurves.length === 0"
          :description="
            $t('page.research.calibrationArtifacts.detail.emptyCategory')
          "
        />
      </template>

      <template v-else-if="modelPayload">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card size="small">
            <Statistic
              :title="
                $t('page.research.calibrationArtifacts.detail.metrics.brier')
              "
              :value="modelPayload.reliability.brier_score"
            />
          </Card>
          <Card size="small">
            <Statistic
              :title="
                $t('page.research.calibrationArtifacts.detail.metrics.logLoss')
              "
              :value="modelPayload.reliability.log_loss"
            />
          </Card>
          <Card size="small">
            <Statistic
              :title="
                $t('page.research.calibrationArtifacts.detail.metrics.ece')
              "
              :value="modelPayload.reliability.ece"
            />
          </Card>
        </div>

        <Card
          size="small"
          :title="
            $t('page.research.calibrationArtifacts.detail.reliabilityTitle')
          "
        >
          <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ReliabilityChart :bins="modelPayload.reliability.bins" />
            <Descriptions :column="1" bordered size="small">
              <DescriptionsItem
                :label="
                  $t(
                    'page.research.calibrationArtifacts.detail.fields.mappingMethod',
                  )
                "
              >
                {{ modelPayload.mapping.method }}
              </DescriptionsItem>
              <DescriptionsItem
                :label="
                  $t(
                    'page.research.calibrationArtifacts.detail.fields.calibrationSamples',
                  )
                "
              >
                {{ modelPayload.reliability.n_samples }}
              </DescriptionsItem>
              <DescriptionsItem
                :label="
                  $t(
                    'page.research.calibrationArtifacts.detail.fields.modelVersionId',
                  )
                "
              >
                <span class="break-all font-mono text-xs">
                  {{ modelPayload.model_version_id }}
                </span>
              </DescriptionsItem>
              <DescriptionsItem
                :label="
                  $t(
                    'page.research.calibrationArtifacts.detail.fields.calibrationDatasetId',
                  )
                "
              >
                <span class="break-all font-mono text-xs">
                  {{ modelPayload.calibration_dataset_id }}
                </span>
              </DescriptionsItem>
            </Descriptions>
          </div>
          <Table
            class="mt-4"
            :columns="reliabilityBinColumns"
            :data-source="modelPayload.reliability.bins"
            :pagination="false"
            row-key="predicted_lo"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'mean_predicted'">
                {{ formatPercent(record.mean_predicted) }}
              </template>
              <template v-else-if="column.dataIndex === 'empirical_frequency'">
                {{ formatPercent(record.empirical_frequency) }}
              </template>
              <template v-else-if="column.key === 'wilson_ci'">
                {{
                  `${formatPercent(record.wilson_ci[0])} – ${formatPercent(record.wilson_ci[1])}`
                }}
              </template>
            </template>
          </Table>
        </Card>
      </template>

      <template v-else-if="weatherPayload">
        <Card
          size="small"
          :title="$t('page.research.calibrationArtifacts.detail.weatherTitle')"
        >
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem
              :label="
                $t(
                  'page.research.calibrationArtifacts.detail.fields.methodology',
                )
              "
            >
              {{ weatherPayload.methodology }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t(
                  'page.research.calibrationArtifacts.detail.fields.stationCount',
                )
              "
            >
              {{ weatherPayload.stations.length }}
            </DescriptionsItem>
          </Descriptions>
        </Card>
      </template>
    </div>
  </Drawer>
</template>
