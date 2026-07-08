<script lang="ts" setup>
import type { CryptoOverrideFormState } from './build-crypto-subject';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Alert, Card, Input, message } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { overrideMarketLinkage } from '#/api/vertical-alpha';
import { $t } from '#/locales';
import { useGovernedAction } from '#/shared/composables/use-governed-action';

import {
  buildCryptoMarketSubject,
  buildManualEvidence,
  CRYPTO_ASSETS,
  defaultCryptoOverrideForm,
  GROUNDING_FIELD_SOURCES,
  KLINE_INTERVALS,
  PRICE_COMPARATORS,
  RESOLUTION_ORACLE_KINDS,
  syncDerivedInstrumentFields,
  validateCryptoOverrideForm,
} from './build-crypto-subject';

defineOptions({ name: 'LinkageOverrideDrawer' });

const emit = defineEmits<{ success: [] }>();

const { governed } = useGovernedAction();

const marketId = ref('');
const alreadyResolved = ref(false);

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
const evidenceSourceOptions = computed(() =>
  GROUNDING_FIELD_SOURCES.map((value) => ({
    label: $t(`page.research.marketLinkages.override.evidenceSources.${value}`),
    value,
  })),
);

function validationMessage(code: string): string {
  return $t(`page.research.marketLinkages.override.validation.${code}`);
}

function valuesToFormState(
  values: Record<string, unknown>,
): CryptoOverrideFormState {
  return values as unknown as CryptoOverrideFormState;
}

async function onSubmit(values: Record<string, unknown>) {
  const form = valuesToFormState(values);
  const errorCode = validateCryptoOverrideForm(form);
  if (errorCode) {
    message.error(validationMessage(errorCode));
    return;
  }

  const subject = buildCryptoMarketSubject(form);
  const evidence = buildManualEvidence(form);
  const detail = await governed(
    (ctx) =>
      overrideMarketLinkage(
        marketId.value,
        {
          evidence,
          instrument_key: form.instrumentKey.trim(),
          reason: ctx.reason,
          subject,
        },
        ctx,
      ),
    {
      summary: $t('page.research.marketLinkages.override.summary', {
        marketId: marketId.value,
      }),
      title: alreadyResolved.value
        ? $t('page.research.marketLinkages.override.supersedeTitle')
        : $t('page.research.marketLinkages.override.title'),
    },
  );
  if (detail) {
    message.success($t('page.research.marketLinkages.override.feedback'));
    drawerApi.close();
    emit('success');
  }
}

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  handleSubmit: onSubmit,
  schema: [
    {
      component: 'Divider',
      fieldName: '_section_crypto',
      formItemClass: 'col-span-2 pb-0',
      hideLabel: true,
      renderComponentContent: () => ({
        default: () =>
          $t('page.research.marketLinkages.override.sections.cryptoSubject'),
      }),
    },
    {
      component: 'Select',
      componentProps: { options: assetOptions.value },
      fieldName: 'asset',
      formItemClass: 'col-span-1',
      label: $t('page.research.marketLinkages.override.fields.asset'),
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      fieldName: 'quote',
      formItemClass: 'col-span-1',
      label: $t('page.research.marketLinkages.override.fields.quote'),
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: { options: comparatorOptions.value },
      fieldName: 'comparator',
      formItemClass: 'col-span-2',
      label: $t('page.research.marketLinkages.override.fields.comparator'),
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      componentProps: { placeholder: '50000.00' },
      dependencies: {
        show(values) {
          return values.comparator === 'above' || values.comparator === 'below';
        },
        triggerFields: ['comparator'],
      },
      fieldName: 'strike',
      formItemClass: 'col-span-1',
      label: $t('page.research.marketLinkages.override.fields.strike'),
    },
    {
      component: 'Input',
      componentProps: { placeholder: '55000.00' },
      dependencies: {
        show(values) {
          return values.comparator === 'between';
        },
        triggerFields: ['comparator'],
      },
      fieldName: 'betweenHi',
      formItemClass: 'col-span-1',
      label: $t('page.research.marketLinkages.override.fields.betweenHi'),
    },
    {
      component: 'Input',
      dependencies: {
        show(values) {
          return values.comparator === 'up_vs_reference';
        },
        triggerFields: ['comparator'],
      },
      fieldName: 'referenceAt',
      formItemClass: 'col-span-1',
      label: $t('page.research.marketLinkages.override.fields.referenceAt'),
    },
    {
      component: 'Input',
      fieldName: 'observationAt',
      formItemClass: 'col-span-1',
      label: $t('page.research.marketLinkages.override.fields.observationAt'),
      rules: 'required',
    },
    {
      component: 'Divider',
      fieldName: '_section_oracle',
      formItemClass: 'col-span-2 pb-0',
      hideLabel: true,
      renderComponentContent: () => ({
        default: () =>
          $t('page.research.marketLinkages.override.sections.resolutionOracle'),
      }),
    },
    {
      component: 'Select',
      componentProps: { options: oracleOptions.value },
      dependencies: {
        trigger(values, form) {
          const synced = syncDerivedInstrumentFields(valuesToFormState(values));
          form.setValues(synced);
        },
        triggerFields: ['asset', 'oracleKind', 'binanceInterval'],
      },
      fieldName: 'oracleKind',
      formItemClass: 'col-span-2',
      label: $t('page.research.marketLinkages.override.fields.oracleKind'),
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      dependencies: {
        show(values) {
          return values.oracleKind === 'chainlink_data_streams';
        },
        triggerFields: ['oracleKind'],
      },
      fieldName: 'chainlinkFeed',
      formItemClass: 'col-span-1',
      label: $t('page.research.marketLinkages.override.fields.chainlinkFeed'),
    },
    {
      component: 'Input',
      dependencies: {
        show(values) {
          return values.oracleKind === 'binance_kline';
        },
        triggerFields: ['oracleKind'],
      },
      fieldName: 'binanceSymbol',
      formItemClass: 'col-span-1',
      label: $t('page.research.marketLinkages.override.fields.binanceSymbol'),
    },
    {
      component: 'Select',
      componentProps: { options: intervalOptions.value },
      dependencies: {
        show(values) {
          return values.oracleKind === 'binance_kline';
        },
        triggerFields: ['oracleKind'],
      },
      fieldName: 'binanceInterval',
      formItemClass: 'col-span-1',
      label: $t('page.research.marketLinkages.override.fields.binanceInterval'),
    },
    {
      component: 'Input',
      componentProps: { disabled: true },
      fieldName: 'instrumentKey',
      formItemClass: 'col-span-2',
      help: $t('page.research.marketLinkages.override.instrumentKeyHint'),
      label: $t('page.research.marketLinkages.override.fields.instrumentKey'),
    },
    {
      component: 'Divider',
      fieldName: '_section_evidence',
      formItemClass: 'col-span-2 pb-0',
      hideLabel: true,
      renderComponentContent: () => ({
        default: () =>
          $t('page.research.marketLinkages.override.sections.evidence'),
      }),
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-40 shrink-0',
        options: evidenceSourceOptions.value,
      },
      fieldName: 'assetEvidenceSource',
      formItemClass: 'col-span-1',
      label: $t('page.research.marketLinkages.override.fields.assetEvidence'),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t(
          'page.research.marketLinkages.override.evidenceTextPlaceholder',
        ),
      },
      fieldName: 'assetEvidenceText',
      formItemClass: 'col-span-1',
      label: ' ',
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-40 shrink-0',
        options: evidenceSourceOptions.value,
      },
      fieldName: 'oracleEvidenceSource',
      formItemClass: 'col-span-1',
      label: $t('page.research.marketLinkages.override.fields.oracleEvidence'),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t(
          'page.research.marketLinkages.override.evidenceTextPlaceholder',
        ),
      },
      fieldName: 'oracleEvidenceText',
      formItemClass: 'col-span-1',
      label: ' ',
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-40 shrink-0',
        options: evidenceSourceOptions.value,
      },
      dependencies: {
        show(values) {
          return values.comparator === 'above' || values.comparator === 'below';
        },
        triggerFields: ['comparator'],
      },
      fieldName: 'strikeEvidenceSource',
      formItemClass: 'col-span-1',
      label: $t('page.research.marketLinkages.override.fields.strikeEvidence'),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t(
          'page.research.marketLinkages.override.evidenceTextPlaceholder',
        ),
      },
      dependencies: {
        show(values) {
          return values.comparator === 'above' || values.comparator === 'below';
        },
        triggerFields: ['comparator'],
      },
      fieldName: 'strikeEvidenceText',
      formItemClass: 'col-span-1',
      label: ' ',
    },
  ],
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2',
});

const [Drawer, drawerApi] = useVbenDrawer({
  onConfirm: () => formApi.validateAndSubmitForm(),
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<{
        alreadyResolved?: boolean;
        marketId: string;
      }>();
      marketId.value = data.marketId;
      alreadyResolved.value = data.alreadyResolved ?? false;
      formApi.resetForm();
      formApi.setValues(defaultCryptoOverrideForm());
    }
  },
});
</script>

<template>
  <Drawer
    class="w-full max-w-2xl"
    :title="
      alreadyResolved
        ? $t('page.research.marketLinkages.override.supersedeDrawerTitle')
        : $t('page.research.marketLinkages.override.drawerTitle')
    "
  >
    <div class="flex flex-col gap-4">
      <Alert
        v-if="alreadyResolved"
        :message="$t('page.research.marketLinkages.override.supersedeWarning')"
        show-icon
        type="warning"
      />

      <Card size="small">
        <template #title>
          {{ $t('page.research.marketLinkages.override.fields.marketId') }}
        </template>
        <Input :value="marketId" disabled />
      </Card>

      <Card size="small">
        <template #title>
          {{
            $t('page.research.marketLinkages.override.fields.overrideDetails')
          }}
        </template>
        <p class="text-muted-foreground mb-4 text-xs">
          {{ $t('page.research.marketLinkages.override.evidenceHint') }}
        </p>
        <Form />
      </Card>
    </div>
  </Drawer>
</template>
