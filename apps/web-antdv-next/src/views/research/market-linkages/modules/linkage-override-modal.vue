<script lang="ts" setup>
import type { CryptoOverrideFormState } from './build-crypto-subject';

import { computed, ref, watch } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Button, Input, message, Select } from 'antdv-next';

import { overrideMarketLinkage } from '#/api/vertical-alpha';
import { $t } from '#/locales';
import { useGovernedAction } from '#/shared/composables/use-governed-action';

import {
  buildCryptoMarketSubject,
  CRYPTO_ASSETS,
  defaultCryptoOverrideForm,
  KLINE_INTERVALS,
  PRICE_COMPARATORS,
  RESOLUTION_ORACLE_KINDS,
  syncDerivedInstrumentFields,
  validateCryptoOverrideForm,
} from './build-crypto-subject';

defineOptions({ name: 'LinkageOverrideModal' });

const emit = defineEmits<{ success: [] }>();

const { governed } = useGovernedAction();

const marketId = ref('');
const form = ref<CryptoOverrideFormState>(defaultCryptoOverrideForm());

const assetOptions = computed(() =>
  CRYPTO_ASSETS.map((value) => ({ label: value, value })),
);
const comparatorOptions = computed(() =>
  PRICE_COMPARATORS.map((value) => ({
    label: $t(`enum.priceComparator.${value}`),
    value,
  })),
);
const oracleOptions = computed(() =>
  RESOLUTION_ORACLE_KINDS.map((value) => ({
    label: $t(`enum.resolutionOracle.${value}`),
    value,
  })),
);
const intervalOptions = computed(() =>
  KLINE_INTERVALS.map((value) => ({ label: value, value })),
);

const showStrike = computed(
  () => form.value.comparator === 'above' || form.value.comparator === 'below',
);
const showBetweenHi = computed(() => form.value.comparator === 'between');
const showReferenceAt = computed(
  () => form.value.comparator === 'up_vs_reference',
);
const showBinanceFields = computed(
  () => form.value.oracleKind === 'binance_kline',
);
const showChainlinkFeed = computed(
  () => form.value.oracleKind === 'chainlink_data_streams',
);

watch(
  () => [form.value.asset, form.value.oracleKind, form.value.binanceInterval],
  () => {
    form.value = syncDerivedInstrumentFields(form.value);
  },
);

const [Drawer, drawerApi] = useVbenDrawer({
  onOpenChange(isOpen) {
    if (isOpen) {
      marketId.value = drawerApi.getData<{ marketId: string }>().marketId;
      form.value = defaultCryptoOverrideForm();
    }
  },
});

function validationMessage(code: string): string {
  return $t(`page.research.marketLinkages.override.validation.${code}`);
}

async function submit() {
  const errorCode = validateCryptoOverrideForm(form.value);
  if (errorCode) {
    message.error(validationMessage(errorCode));
    return;
  }

  const subject = buildCryptoMarketSubject(form.value);
  const detail = await governed(
    (ctx) =>
      overrideMarketLinkage(
        marketId.value,
        {
          instrument_key: form.value.instrumentKey.trim(),
          reason: ctx.reason,
          subject,
        },
        ctx,
      ),
    {
      summary: $t('page.research.marketLinkages.override.summary', {
        marketId: marketId.value,
      }),
      title: $t('page.research.marketLinkages.override.title'),
    },
  );
  if (detail) {
    message.success($t('page.research.marketLinkages.override.feedback'));
    drawerApi.close();
    emit('success');
  }
}
</script>

<template>
  <Drawer
    class="w-full max-w-2xl"
    :title="$t('page.research.marketLinkages.override.drawerTitle')"
  >
    <div class="flex flex-col gap-4">
      <div>
        <div class="mb-1 text-sm font-medium">
          {{ $t('page.research.marketLinkages.override.fields.marketId') }}
        </div>
        <Input :value="marketId" disabled />
      </div>

      <div class="rounded-md border p-3">
        <div class="mb-3 text-sm font-medium">
          {{
            $t('page.research.marketLinkages.override.sections.cryptoSubject')
          }}
        </div>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <div class="mb-1 text-xs text-muted-foreground">
              {{ $t('page.research.marketLinkages.override.fields.asset') }}
            </div>
            <Select
              v-model:value="form.asset"
              class="w-full"
              :options="assetOptions"
            />
          </div>
          <div>
            <div class="mb-1 text-xs text-muted-foreground">
              {{ $t('page.research.marketLinkages.override.fields.quote') }}
            </div>
            <Input v-model:value="form.quote" />
          </div>
          <div class="md:col-span-2">
            <div class="mb-1 text-xs text-muted-foreground">
              {{
                $t('page.research.marketLinkages.override.fields.comparator')
              }}
            </div>
            <Select
              v-model:value="form.comparator"
              class="w-full"
              :options="comparatorOptions"
            />
          </div>
          <div v-if="showStrike">
            <div class="mb-1 text-xs text-muted-foreground">
              {{ $t('page.research.marketLinkages.override.fields.strike') }}
            </div>
            <Input v-model:value="form.strike" placeholder="50000.00" />
          </div>
          <div v-if="showBetweenHi">
            <div class="mb-1 text-xs text-muted-foreground">
              {{ $t('page.research.marketLinkages.override.fields.betweenHi') }}
            </div>
            <Input v-model:value="form.betweenHi" placeholder="55000.00" />
          </div>
          <div v-if="showReferenceAt">
            <div class="mb-1 text-xs text-muted-foreground">
              {{
                $t('page.research.marketLinkages.override.fields.referenceAt')
              }}
            </div>
            <Input v-model:value="form.referenceAt" />
          </div>
          <div>
            <div class="mb-1 text-xs text-muted-foreground">
              {{
                $t('page.research.marketLinkages.override.fields.observationAt')
              }}
            </div>
            <Input v-model:value="form.observationAt" />
          </div>
        </div>
      </div>

      <div class="rounded-md border p-3">
        <div class="mb-3 text-sm font-medium">
          {{
            $t(
              'page.research.marketLinkages.override.sections.resolutionOracle',
            )
          }}
        </div>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div class="md:col-span-2">
            <div class="mb-1 text-xs text-muted-foreground">
              {{
                $t('page.research.marketLinkages.override.fields.oracleKind')
              }}
            </div>
            <Select
              v-model:value="form.oracleKind"
              class="w-full"
              :options="oracleOptions"
            />
          </div>
          <div v-if="showChainlinkFeed">
            <div class="mb-1 text-xs text-muted-foreground">
              {{
                $t('page.research.marketLinkages.override.fields.chainlinkFeed')
              }}
            </div>
            <Input v-model:value="form.chainlinkFeed" />
          </div>
          <template v-if="showBinanceFields">
            <div>
              <div class="mb-1 text-xs text-muted-foreground">
                {{
                  $t(
                    'page.research.marketLinkages.override.fields.binanceSymbol',
                  )
                }}
              </div>
              <Input v-model:value="form.binanceSymbol" />
            </div>
            <div>
              <div class="mb-1 text-xs text-muted-foreground">
                {{
                  $t(
                    'page.research.marketLinkages.override.fields.binanceInterval',
                  )
                }}
              </div>
              <Select
                v-model:value="form.binanceInterval"
                class="w-full"
                :options="intervalOptions"
              />
            </div>
          </template>
        </div>
      </div>

      <div>
        <div class="mb-1 text-sm font-medium">
          {{ $t('page.research.marketLinkages.override.fields.instrumentKey') }}
        </div>
        <Input v-model:value="form.instrumentKey" />
        <div class="mt-1 text-xs text-muted-foreground">
          {{ $t('page.research.marketLinkages.override.instrumentKeyHint') }}
        </div>
      </div>

      <Button type="primary" @click="submit">
        {{ $t('page.research.marketLinkages.override.submit') }}
      </Button>
    </div>
  </Drawer>
</template>
