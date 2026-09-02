<script lang="ts" setup>
import type { PreflightReport } from '@vben/types';

import { Alert, Tag } from 'antdv-next';

import { $t } from '#/locales';

defineOptions({ name: 'PreflightReportBlock' });

defineProps<{
  /** Preflight evidence returned by the last governed entry-authorization transition. */
  report: PreflightReport;
}>();
</script>

<template>
  <div class="flex flex-col gap-2">
    <Alert
      :message="
        report.passed
          ? $t('page.systemAdmin.mode.preflightPassed')
          : $t('page.systemAdmin.mode.preflightFailed')
      "
      :type="report.passed ? 'success' : 'error'"
      show-icon
    />
    <div
      v-for="check in report.checks"
      :key="check.name"
      class="flex items-center justify-between gap-2 border-b pb-1.5 text-xs last:border-b-0"
    >
      <div class="flex min-w-0 items-center gap-2">
        <span class="font-medium">{{ check.name }}</span>
        <Tag v-if="check.hard" color="default">
          {{ $t('page.systemAdmin.mode.hardCheck') }}
        </Tag>
      </div>
      <div class="flex items-center gap-2">
        <span
          :title="check.detail"
          class="text-muted-foreground max-w-64 truncate"
        >
          {{ check.detail }}
        </span>
        <Tag :color="check.passed ? 'success' : 'error'">
          {{
            check.passed
              ? $t('page.systemAdmin.mode.checkPassed')
              : $t('page.systemAdmin.mode.checkFailed')
          }}
        </Tag>
      </div>
    </div>
  </div>
</template>
