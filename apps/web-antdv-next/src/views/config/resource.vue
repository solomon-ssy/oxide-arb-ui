<script lang="ts" setup>
import type { ModelRouteActivationReceiptView } from '@vben/types';
import type {
  ConfigResourceKind,
  ModelRouting,
  PolicyActivationResultView,
  PolicyApprovalView,
  PolicyDocument,
  PolicyResourceSchemaView,
  PolicyRevisionView,
  PolicyValidationView,
  ReportSchedule,
} from '@vben/types/config-api';

import type { PolicyClientValidationIssue } from './modules/policy-schema';

import { computed, nextTick, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { useRequestHandler } from '@vben/request/qp';

import { usePreferredReducedMotion } from '@vueuse/core';
import { Alert, Button, Empty, message, Skeleton, Tag } from 'antdv-next';

import {
  activateConfigDraft,
  approveConfigDraft,
  createConfigDraft,
  getConfigResourceSchema,
  getConfigRevision,
  getConfigRevisions,
  getCurrentConfigResource,
  rollbackConfigRevision,
  validateConfigDraft,
} from '#/api/config';
import { getModelRouteActivation } from '#/api/feedback';
import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';
import RuntimeControlPanel from '#/shared/components/runtime-control-panel.vue';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';

import { linkedRollbackState } from './modules/linked-rollback-state';
import ModelRoutingPicker from './modules/model-routing-picker.vue';
import PolicyField from './modules/policy-field.vue';
import {
  clonePolicyValue,
  collectPolicyDiff,
  formatPolicyValue,
  parsePolicyJsonSchema,
  policyFieldLabel,
  validatePolicyValue,
} from './modules/policy-schema';
import ReportSchedulePreview from './modules/report-schedule-preview.vue';
import {
  CONFIG_RESOURCE_META,
  isConfigResourceKind,
} from './modules/resource-metadata';

defineOptions({ name: 'ConfigResourcePage' });

type PolicyPayload = PolicyDocument['document'];
type WorkflowStage =
  | 'approved'
  | 'edit'
  | 'review'
  | 'success'
  | 'validated'
  | 'view';

const route = useRoute();
const router = useRouter();
const { governed } = useGovernedAction();
const { handleRequest } = useRequestHandler();
const { hasAccessByCodes } = useQpAccess();
const reducedMotion = usePreferredReducedMotion();

const loading = ref(true);
const loadError = ref(false);
const current = ref<Awaited<
  ReturnType<typeof getCurrentConfigResource>
> | null>(null);
const schemaView = ref<null | PolicyResourceSchemaView>(null);
const revisions = ref<PolicyRevisionView[]>([]);
const workingDocument = ref<null | PolicyPayload>(null);
const candidateRevision = ref<null | PolicyRevisionView>(null);
const validation = ref<null | PolicyValidationView>(null);
const approval = ref<null | PolicyApprovalView>(null);
const activationResult = ref<null | PolicyActivationResultView>(null);
const activationConflict = ref<null | string>(null);
const linkedActivationReceipt = ref<ModelRouteActivationReceiptView | null>(
  null,
);
const linkedActivatedRevision = ref<null | PolicyRevisionView>(null);
const linkedRollbackRevision = ref<null | PolicyRevisionView>(null);
const linkedRollbackError = ref<null | string>(null);
const stage = ref<WorkflowStage>('view');
const rollbackMode = ref(false);

const resourceKind = computed<ConfigResourceKind | null>(() => {
  const value = route.params.resource;
  return isConfigResourceKind(value) ? value : null;
});
const linkedActivationId = computed(() => {
  const value = route.query.activation_id;
  return typeof value === 'string' && value !== '' ? value : null;
});
const meta = computed(() =>
  resourceKind.value ? CONFIG_RESOURCE_META[resourceKind.value] : null,
);
const jsonSchema = computed(() =>
  schemaView.value ? parsePolicyJsonSchema(schemaView.value.json_schema) : null,
);
const activeDocument = computed(
  () => current.value?.revision?.document.document ?? null,
);
const activeRevisionId = computed(
  () => current.value?.revision?.policy_revision_id ?? null,
);
const diffs = computed(() =>
  collectPolicyDiff(activeDocument.value, workingDocument.value),
);
const linkedRollbackDiffs = computed(() =>
  collectPolicyDiff(
    linkedActivatedRevision.value?.document.document ?? null,
    linkedRollbackRevision.value?.document.document ?? null,
  ),
);
const linkedRollbackStatus = computed(() =>
  linkedRollbackState(activeRevisionId.value, linkedActivationReceipt.value),
);
const dirty = computed(() => diffs.value.length > 0);
const editorValidationIssues = computed(() =>
  jsonSchema.value && workingDocument.value
    ? validatePolicyValue(
        jsonSchema.value,
        jsonSchema.value,
        workingDocument.value,
      )
    : [],
);
const validationIssues = computed(
  () => validation.value?.validation_evidence.issues ?? [],
);

async function focusInvalidField(path: string[]) {
  await nextTick();
  const fieldPath = path.join('.');
  const inlineError = [
    ...document.querySelectorAll<HTMLElement>('[data-field-path]'),
  ].find((element) => element.dataset.fieldPath === fieldPath);
  const control =
    inlineError?.previousElementSibling?.querySelector<HTMLElement>(
      'input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
  control?.focus({ preventScroll: false });
  control?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
const preflightChecks = computed(
  () => validation.value?.validation_evidence.preflight ?? [],
);
const validatedSubject = computed(
  () => validation.value?.validation_evidence.subject ?? null,
);
const activeModelRouting = computed<ModelRouting | null>(() =>
  resourceKind.value === 'model_routing' && activeDocument.value
    ? (activeDocument.value as ModelRouting)
    : null,
);
const activeReportSchedule = computed<null | ReportSchedule>(() =>
  resourceKind.value === 'report_schedule' && activeDocument.value
    ? (activeDocument.value as ReportSchedule)
    : null,
);
const workingReportSchedule = computed<null | ReportSchedule>(() =>
  resourceKind.value === 'report_schedule' && workingDocument.value
    ? (workingDocument.value as ReportSchedule)
    : null,
);

const MODEL_ROUTING_GOVERNED_FIELDS = [
  'model.active_exit_model_version_id',
  'model.buy_routes',
];

const hasCreateAccess = hasAccessByCodes(['config:create']);
const hasApproveAccess = hasAccessByCodes(['config:approve']);
const hasActivateAccess = hasAccessByCodes(['config:activate']);
const hasRollbackAccess = hasAccessByCodes(['config:rollback']);
const governanceMutationBlocked = computed(() => loadError.value);
const canCreate = computed(
  () =>
    hasCreateAccess &&
    !governanceMutationBlocked.value &&
    resourceKind.value !== 'model_routing',
);
const canApprove = computed(
  () => hasApproveAccess && !governanceMutationBlocked.value,
);
const canActivate = computed(
  () => hasActivateAccess && !governanceMutationBlocked.value,
);
const canRollback = computed(
  () => hasRollbackAccess && !governanceMutationBlocked.value,
);

const workflowSteps = computed(() => [
  {
    active: stage.value === 'edit',
    complete: stage.value !== 'view' && stage.value !== 'edit',
    label: $t('page.config.workflow.edit'),
  },
  {
    active: stage.value === 'review',
    complete: ['approved', 'success', 'validated'].includes(stage.value),
    label: $t('page.config.workflow.review'),
  },
  {
    active: stage.value === 'validated',
    complete: ['approved', 'success'].includes(stage.value),
    label: $t('page.config.workflow.approve'),
  },
  {
    active: stage.value === 'approved',
    complete: stage.value === 'success',
    label: $t('page.config.workflow.activate'),
  },
]);

function policyDocument(
  kind: ConfigResourceKind,
  payload: PolicyPayload,
): PolicyDocument {
  switch (kind) {
    case 'execution_authorization': {
      return { document: payload, resource_kind: kind } as PolicyDocument;
    }
    case 'execution_risk_policy': {
      return { document: payload, resource_kind: kind } as PolicyDocument;
    }
    case 'model_routing': {
      return { document: payload, resource_kind: kind } as PolicyDocument;
    }
    case 'operational_control': {
      return { document: payload, resource_kind: kind } as PolicyDocument;
    }
    case 'recommendation_policy': {
      return { document: payload, resource_kind: kind } as PolicyDocument;
    }
    case 'report_schedule': {
      return { document: payload, resource_kind: kind } as PolicyDocument;
    }
  }
}

function shortId(value?: null | string) {
  return value ? `${value.slice(0, 12)}…` : '—';
}

function editorValidationMessage(issue: PolicyClientValidationIssue) {
  return $t(`page.config.editor.validation.${issue.code}`, {
    expected: issue.expected ?? '',
  });
}

function linkedQueryId(name: string): null | string {
  const value = route.query[name];
  if (value === undefined) {
    return null;
  }
  if (typeof value !== 'string' || value === '') {
    throw new Error(`invalid linked rollback query field: ${name}`);
  }
  return value;
}

function routeBinding(
  revision: PolicyRevisionView,
  receipt: ModelRouteActivationReceiptView,
) {
  if (revision.document.resource_kind !== 'model_routing') {
    throw new Error('linked rollback revision is not model routing');
  }
  const routing = revision.document.document as ModelRouting;
  const binding = routing.model?.buy_routes?.[receipt.route];
  if (binding === undefined) {
    throw new Error('linked rollback route binding is missing');
  }
  return binding;
}

function verifyLinkedRollback(
  receipt: ModelRouteActivationReceiptView,
  activated: PolicyRevisionView,
  rollback: PolicyRevisionView,
) {
  const activatedQuery = linkedQueryId('activated_revision_id');
  const rollbackQuery = linkedQueryId('rollback_target_revision_id');
  if (
    (activatedQuery !== null &&
      activatedQuery !== receipt.activated_model_routing_revision_id) ||
    (rollbackQuery !== null &&
      rollbackQuery !== receipt.rollback_target.rollback_target_revision_id) ||
    activated.policy_revision_id !==
      receipt.activated_model_routing_revision_id ||
    rollback.policy_revision_id !==
      receipt.rollback_target.rollback_target_revision_id ||
    rollback.revision_hash !==
      receipt.rollback_target.rollback_target_revision_hash ||
    receipt.rollback_target.route !== receipt.route ||
    !receipt.rollback_target.shadow_cleared
  ) {
    throw new Error('linked rollback receipt or revision identity mismatch');
  }

  const activatedBinding = routeBinding(activated, receipt);
  const rollbackBinding = routeBinding(rollback, receipt);
  if (
    activatedBinding.champion.model_version_id !==
      receipt.rollback_target.activated_model_version_id ||
    activatedBinding.shadow !== null ||
    activatedBinding.champion.source.source_kind !== 'feedback' ||
    activatedBinding.champion.source.feedback_cycle_id !==
      receipt.feedback_cycle_id ||
    rollbackBinding.champion.model_version_id !==
      receipt.rollback_target.restored_model_version_id ||
    rollbackBinding.shadow !== null
  ) {
    throw new Error('linked rollback model-route delta is not sanitized');
  }
}

async function loadLinkedRollback(activationId: string) {
  linkedRollbackError.value = null;
  const evidence = await handleRequest(
    async () => {
      const receipt = await getModelRouteActivation(activationId);
      if (receipt.policy_activation_id !== activationId) {
        throw new Error('linked activation identity mismatch');
      }
      const [activated, rollback] = await Promise.all([
        getConfigRevision(
          'model_routing',
          receipt.activated_model_routing_revision_id,
        ),
        getConfigRevision(
          'model_routing',
          receipt.rollback_target.rollback_target_revision_id,
        ),
      ]);
      verifyLinkedRollback(receipt, activated, rollback);
      return { activated, receipt, rollback };
    },
    {
      onError: () => {
        linkedRollbackError.value = $t(
          'page.config.workflow.linkedRollback.loadError',
        );
      },
      silent: true,
    },
  );
  if (evidence === null) {
    return;
  }

  linkedActivationReceipt.value = evidence.receipt;
  linkedActivatedRevision.value = evidence.activated;
  linkedRollbackRevision.value = evidence.rollback;
  revisions.value = [
    evidence.activated,
    evidence.rollback,
    ...revisions.value.filter(
      (revision) =>
        revision.policy_revision_id !== evidence.activated.policy_revision_id &&
        revision.policy_revision_id !== evidence.rollback.policy_revision_id,
    ),
  ];
  if (canRollback.value && linkedRollbackStatus.value === 'actionable') {
    reviewRollback(evidence.rollback);
  }
}

function resetWorkflow() {
  stage.value = 'view';
  rollbackMode.value = false;
  candidateRevision.value = null;
  validation.value = null;
  approval.value = null;
  activationResult.value = null;
  activationConflict.value = null;
  workingDocument.value = activeDocument.value
    ? clonePolicyValue(activeDocument.value)
    : null;
}

async function loadResource() {
  const kind = resourceKind.value;
  if (!kind) {
    void router.replace('/system/config');
    return;
  }
  loading.value = true;
  loadError.value = false;
  linkedActivationReceipt.value = null;
  linkedActivatedRevision.value = null;
  linkedRollbackRevision.value = null;
  linkedRollbackError.value = null;
  const result = await handleRequest(
    () =>
      Promise.all([
        getCurrentConfigResource(kind),
        getConfigResourceSchema(kind),
        getConfigRevisions(kind, 40),
      ]),
    { onError: () => (loadError.value = true), silent: true },
  );
  if (result) {
    [current.value, schemaView.value, revisions.value] = result;
    resetWorkflow();
    const activationId = linkedActivationId.value;
    if (activationId !== null) {
      if (kind === 'model_routing') {
        await loadLinkedRollback(activationId);
      } else {
        linkedRollbackError.value = $t(
          'page.config.workflow.linkedRollback.wrongResource',
        );
      }
    }
  }
  loading.value = false;
}

function startEdit() {
  if (!activeDocument.value || !canCreate.value) {
    return;
  }
  resetWorkflow();
  workingDocument.value = clonePolicyValue(activeDocument.value);
  stage.value = 'edit';
}

function updateWorkingDocument(value: unknown) {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    workingDocument.value = value as PolicyPayload;
  }
}

async function saveDraft() {
  const kind = resourceKind.value;
  const document = workingDocument.value;
  if (
    !kind ||
    !document ||
    !dirty.value ||
    editorValidationIssues.value.length > 0 ||
    !canCreate.value
  ) {
    return;
  }
  const revision = await governed(
    (ctx) =>
      createConfigDraft(
        kind,
        { document: policyDocument(kind, document), reason: ctx.reason },
        ctx,
      ),
    {
      details: [
        {
          label: $t('page.config.resource.changedFields'),
          value: String(diffs.value.length),
        },
      ],
      summary: $t('page.config.workflow.saveDraftSummary'),
      title: $t('page.config.workflow.saveDraft'),
    },
  );
  if (revision) {
    candidateRevision.value = revision;
    stage.value = 'review';
    revisions.value = [
      revision,
      ...revisions.value.filter(
        (item) => item.policy_revision_id !== revision.policy_revision_id,
      ),
    ];
    message.success($t('page.config.feedback.draftSaved'));
  }
}

async function validateRevision() {
  const kind = resourceKind.value;
  const revision = candidateRevision.value;
  if (!kind || !revision || governanceMutationBlocked.value) {
    return;
  }
  const result = await governed(
    (ctx) =>
      validateConfigDraft(
        kind,
        revision.policy_revision_id,
        {
          reason: ctx.reason,
        },
        ctx,
      ),
    {
      details: [
        {
          label: $t('page.config.resource.revision'),
          mono: true,
          value: revision.policy_revision_id,
        },
      ],
      summary: $t('page.config.workflow.validateSummary'),
      title: $t('page.config.workflow.validate'),
    },
  );
  if (result) {
    validation.value = result;
    if (
      result.valid &&
      result.preflight_token &&
      result.validation_evidence.subject
    ) {
      stage.value = 'validated';
      message.success($t('page.config.feedback.validationPassed'));
    } else {
      message.warning($t('page.config.feedback.validationFailed'));
    }
  }
}

async function approveRevision() {
  const kind = resourceKind.value;
  const revision = candidateRevision.value;
  if (!kind || !revision || !validation.value?.valid || !canApprove.value) {
    return;
  }
  const result = await governed(
    (ctx) =>
      approveConfigDraft(
        kind,
        revision.policy_revision_id,
        { decision: 'approved', expires_at: null, reason: ctx.reason },
        ctx,
      ),
    {
      details: [
        {
          label: $t('page.config.resource.hash'),
          mono: true,
          value: revision.revision_hash,
        },
      ],
      summary: $t('page.config.workflow.approveSummary'),
      title: $t('page.config.workflow.approve'),
    },
  );
  if (result) {
    approval.value = result;
    stage.value = 'approved';
    message.success($t('page.config.feedback.approved'));
  }
}

async function activateRevision() {
  const kind = resourceKind.value;
  const revision = candidateRevision.value;
  const validationResult = validation.value;
  const subject = validatedSubject.value;
  const approvalResult = approval.value;
  if (
    !kind ||
    !revision ||
    !validationResult?.preflight_token ||
    !subject ||
    !approvalResult ||
    (rollbackMode.value ? !canRollback.value : !canActivate.value)
  ) {
    return;
  }
  activationConflict.value = null;
  const result = await governed(
    (ctx) => {
      const body = {
        approval_id: approvalResult.policy_approval_id,
        candidate_bundle_hash: subject.candidate_bundle_hash,
        expected_active_revision_id: subject.base_revision_vector[kind] ?? null,
        expected_bundle_generation: subject.base_generation,
        idempotency_key: crypto.randomUUID(),
        preflight_token: validationResult.preflight_token as string,
        reason: ctx.reason,
      };
      return rollbackMode.value
        ? rollbackConfigRevision(kind, revision.policy_revision_id, body, ctx)
        : activateConfigDraft(kind, revision.policy_revision_id, body, ctx);
    },
    {
      confirmWord: rollbackMode.value
        ? $t('page.config.workflow.rollbackConfirmWord')
        : undefined,
      danger: rollbackMode.value || kind === 'execution_authorization',
      details: [
        {
          label: $t('page.config.resource.expectedGeneration'),
          mono: true,
          value: String(subject.base_generation),
        },
        {
          label: $t('page.config.resource.expectedActive'),
          mono: true,
          value:
            subject.base_revision_vector[kind] ??
            $t('page.config.resource.none'),
        },
        {
          label: $t('page.config.resource.targetRevision'),
          mono: true,
          value: revision.policy_revision_id,
        },
      ],
      onError: (error) => {
        if (error.httpStatus !== 409 && error.code !== 409) {
          return 'keep_open';
        }
        activationConflict.value = error.message;
        validation.value = null;
        approval.value = null;
        stage.value = 'review';
        return 'close';
      },
      summary: $t(
        rollbackMode.value
          ? 'page.config.workflow.rollbackSummary'
          : 'page.config.workflow.activateSummary',
      ),
      title: $t(
        rollbackMode.value
          ? 'page.config.workflow.rollback'
          : 'page.config.workflow.activate',
      ),
    },
  );
  if (result) {
    activationResult.value = result;
    stage.value = 'success';
    message.success(
      $t(
        rollbackMode.value
          ? 'page.config.feedback.rolledBack'
          : 'page.config.feedback.activated',
      ),
    );
  }
}

function reviewRollback(revision: PolicyRevisionView) {
  if (!canRollback.value) return;
  rollbackMode.value = true;
  candidateRevision.value = revision;
  workingDocument.value = clonePolicyValue(revision.document.document);
  validation.value = null;
  approval.value = null;
  activationResult.value = null;
  stage.value = 'review';
  window.scrollTo({
    behavior: reducedMotion.value === 'reduce' ? 'auto' : 'smooth',
    top: 0,
  });
}

function backToEdit() {
  candidateRevision.value = null;
  validation.value = null;
  approval.value = null;
  rollbackMode.value = false;
  stage.value = 'edit';
}

function finishWorkflow() {
  void loadResource();
}

watch(
  [resourceKind, linkedActivationId],
  () => {
    void loadResource();
  },
  { immediate: true },
);
</script>

<template>
  <Page auto-content-height data-testid="config-resource-workspace">
    <div class="mx-auto flex max-w-[1280px] flex-col gap-4 pb-8">
      <header class="bg-card rounded-xl border px-5 py-4">
        <div
          class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
        >
          <div class="flex min-w-0 items-start gap-3">
            <Button
              :aria-label="$t('page.config.nav.back')"
              shape="circle"
              type="text"
              @click="router.push('/system/config')"
            >
              <IconifyIcon icon="lucide:arrow-left" />
            </Button>
            <span v-if="meta" class="resource-icon">
              <IconifyIcon :icon="meta.icon" />
            </span>
            <div class="min-w-0">
              <p class="config-eyebrow text-xs font-semibold tracking-wide">
                {{ $t('page.config.eyebrow') }}
              </p>
              <h1 class="truncate text-xl font-semibold">
                {{
                  meta ? $t(meta.labelKey) : $t('page.config.resource.title')
                }}
              </h1>
              <p v-if="meta" class="text-muted-foreground mt-1 text-sm">
                {{ $t(meta.descriptionKey) }}
              </p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <Tag
              v-if="current?.revision"
              class="config-active-tag"
              color="processing"
              data-screenshot-volatile="true"
            >
              {{ $t('page.config.resource.active') }} ·
              {{ shortId(current.revision.policy_revision_id) }}
            </Tag>
            <Button
              v-if="stage === 'view' && canCreate"
              data-testid="edit-config-draft"
              type="primary"
              @click="startEdit"
            >
              <IconifyIcon icon="lucide:file-pen-line" />
              {{ $t('page.config.workflow.editDraft') }}
            </Button>
          </div>
        </div>

        <ol
          v-if="stage !== 'view'"
          class="workflow-steps mt-5"
          :aria-label="$t('page.config.workflow.label')"
        >
          <li
            v-for="(step, index) in workflowSteps"
            :key="step.label"
            :class="{ active: step.active, complete: step.complete }"
          >
            <span class="workflow-index">
              <IconifyIcon v-if="step.complete" icon="lucide:check" />
              <span v-else>{{ index + 1 }}</span>
            </span>
            <span>{{ step.label }}</span>
          </li>
        </ol>
      </header>

      <Alert
        v-if="!hasCreateAccess"
        :message="$t('page.config.readOnly')"
        show-icon
        type="info"
      />
      <Alert
        v-if="resourceKind === 'model_routing' && stage === 'view'"
        :message="$t('page.config.modelRouting.governanceNotice')"
        show-icon
        type="info"
      >
        <template #action>
          <div class="flex flex-wrap justify-end gap-2">
            <Button size="small" @click="router.push('/research/models')">
              {{ $t('page.config.modelRouting.openModels') }}
            </Button>
            <Button size="small" @click="router.push('/research/feedback')">
              {{ $t('page.config.modelRouting.openFeedback') }}
            </Button>
          </div>
        </template>
      </Alert>
      <Alert
        v-if="rollbackMode"
        :message="$t('page.config.workflow.rollbackNotice')"
        show-icon
        type="warning"
      />
      <Alert
        v-if="linkedRollbackError"
        :message="linkedRollbackError"
        role="alert"
        show-icon
        type="error"
      >
        <template #action>
          <Button size="small" @click="loadResource">
            {{ $t('page.shared.asyncState.retry') }}
          </Button>
        </template>
      </Alert>
      <section
        v-if="
          linkedActivationReceipt &&
          linkedActivatedRevision &&
          linkedRollbackRevision
        "
        class="bg-card rounded-xl border p-5"
        data-testid="linked-model-route-rollback"
      >
        <h2 class="text-base font-semibold">
          {{ $t('page.config.workflow.linkedRollback.title') }}
        </h2>
        <p class="text-muted-foreground mt-1 text-sm">
          {{ $t('page.config.workflow.linkedRollback.description') }}
        </p>
        <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt class="text-muted-foreground">
              {{ $t('page.config.workflow.linkedRollback.activation') }}
            </dt>
            <dd class="break-all font-mono text-xs">
              {{ linkedActivationReceipt.policy_activation_id }}
            </dd>
          </div>
          <div>
            <dt class="text-muted-foreground">
              {{ $t('page.config.workflow.linkedRollback.route') }}
            </dt>
            <dd>{{ linkedActivationReceipt.route }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground">
              {{ $t('page.config.workflow.linkedRollback.activatedRevision') }}
            </dt>
            <dd class="break-all font-mono text-xs">
              {{ linkedActivatedRevision.policy_revision_id }}
            </dd>
          </div>
          <div>
            <dt class="text-muted-foreground">
              {{ $t('page.config.workflow.linkedRollback.targetRevision') }}
            </dt>
            <dd class="break-all font-mono text-xs">
              {{ linkedRollbackRevision.policy_revision_id }}
            </dd>
          </div>
        </dl>
        <Alert
          v-if="linkedRollbackStatus === 'restored'"
          class="mt-4"
          :message="$t('page.config.workflow.linkedRollback.restored')"
          show-icon
          type="success"
        />
        <Alert
          v-else-if="linkedRollbackStatus === 'superseded'"
          class="mt-4"
          :message="$t('page.config.workflow.linkedRollback.superseded')"
          show-icon
          type="warning"
        />
        <div class="mt-4">
          <h3 class="text-sm font-semibold">
            {{
              $t('page.config.workflow.linkedRollback.immutableDiff', {
                count: linkedRollbackDiffs.length,
              })
            }}
          </h3>
          <div
            v-if="linkedRollbackDiffs.length > 0"
            class="mt-2 divide-y rounded-lg border"
          >
            <article
              v-for="diff in linkedRollbackDiffs"
              :key="diff.path.join('.')"
              class="diff-row"
            >
              <h4 class="font-mono text-xs font-semibold">
                {{ diff.path.join('.') }}
              </h4>
              <dl class="mt-2 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt>{{ $t('page.config.review.before') }}</dt>
                  <dd>{{ formatPolicyValue(diff.before) }}</dd>
                </div>
                <div>
                  <dt>{{ $t('page.config.review.after') }}</dt>
                  <dd>{{ formatPolicyValue(diff.after) }}</dd>
                </div>
              </dl>
            </article>
          </div>
          <Empty
            v-else
            :description="$t('page.config.workflow.linkedRollback.emptyDiff')"
          />
        </div>
      </section>
      <Alert
        v-if="loadError"
        :message="$t('page.config.error.load')"
        show-icon
        type="error"
      >
        <template #action>
          <Button size="small" @click="loadResource">
            {{ $t('page.shared.asyncState.retry') }}
          </Button>
        </template>
      </Alert>
      <Alert
        v-if="activationConflict"
        :message="$t('page.config.error.activationConflict')"
        closable
        data-testid="config-activation-conflict"
        show-icon
        type="error"
        @close="activationConflict = null"
      >
        <template #description>
          <span data-screenshot-volatile="true">{{ activationConflict }}</span>
        </template>
      </Alert>

      <Skeleton v-if="loading" :paragraph="{ rows: 14 }" active />

      <template v-else-if="current && schemaView && jsonSchema">
        <section
          v-if="stage === 'success' && activationResult"
          class="activation-success bg-card rounded-xl border p-8 text-center"
          data-testid="config-activation-success"
          role="status"
        >
          <span class="activation-success-icon">
            <IconifyIcon icon="lucide:circle-check-big" />
          </span>
          <h2 class="mt-4 text-lg font-semibold">
            {{
              $t(
                rollbackMode
                  ? 'page.config.success.rollbackTitle'
                  : 'page.config.success.activationTitle',
              )
            }}
          </h2>
          <p class="text-muted-foreground mx-auto mt-2 max-w-xl text-sm">
            {{ $t('page.config.success.description') }}
          </p>
          <dl
            class="mx-auto mt-6 grid max-w-2xl gap-px overflow-hidden rounded-lg border bg-border text-left sm:grid-cols-2"
          >
            <div class="success-fact">
              <dt>{{ $t('page.config.resource.targetRevision') }}</dt>
              <dd class="font-mono" data-screenshot-volatile="true">
                {{ activationResult.applied_revision.policy_revision_id }}
              </dd>
            </div>
            <div class="success-fact">
              <dt>{{ $t('page.config.resource.effectiveBoundary') }}</dt>
              <dd>
                {{
                  $t(`page.config.boundary.${schemaView.effective_boundary}`)
                }}
              </dd>
            </div>
          </dl>
          <Button
            class="mt-6"
            data-testid="finish-config-workflow"
            type="primary"
            @click="finishWorkflow"
          >
            {{ $t('page.config.success.done') }}
          </Button>
        </section>

        <div v-else class="workspace-grid">
          <main class="min-w-0 space-y-4">
            <ModelRoutingPicker
              v-if="stage === 'view' && activeModelRouting"
              disabled
              :model-value="activeModelRouting"
            />
            <RuntimeControlPanel
              v-if="stage === 'view' && resourceKind === 'operational_control'"
            />
            <ReportSchedulePreview
              v-if="stage === 'view' && activeReportSchedule"
              :model-value="activeReportSchedule"
            />
            <section
              v-if="stage === 'view'"
              class="bg-card rounded-xl border p-5"
              data-testid="config-current-document"
            >
              <div class="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 class="text-base font-semibold">
                    {{ $t('page.config.resource.activePolicy') }}
                  </h2>
                  <p class="text-muted-foreground mt-1 text-sm">
                    {{ $t('page.config.resource.activePolicyDescription') }}
                  </p>
                </div>
              </div>
              <PolicyField
                v-if="activeDocument"
                disabled
                :model-value="activeDocument"
                :root-schema="jsonSchema"
                :schema="jsonSchema"
                :hidden-fields="MODEL_ROUTING_GOVERNED_FIELDS"
              />
              <Empty
                v-else
                :description="$t('page.config.resource.noActive')"
              />
            </section>

            <section v-if="stage === 'edit'" class="min-w-0">
              <Alert
                v-if="editorValidationIssues.length > 0"
                class="mb-4"
                data-testid="config-editor-error-summary"
                :message="$t('page.config.validation.errorSummary')"
                show-icon
                type="error"
              >
                <template #description>
                  <ul class="mt-2 space-y-2">
                    <li
                      v-for="issue in editorValidationIssues"
                      :key="`${issue.path.join('.')}:${issue.code}`"
                    >
                      <button
                        class="focus-visible:ring-primary rounded-sm text-left focus-visible:ring-2 focus-visible:outline-none"
                        type="button"
                        @click="focusInvalidField(issue.path)"
                      >
                        <strong class="font-mono text-xs">
                          {{ issue.path.join('.') || 'document' }}
                        </strong>
                        <span class="ml-2">{{
                          editorValidationMessage(issue)
                        }}</span>
                      </button>
                    </li>
                  </ul>
                </template>
              </Alert>
              <ReportSchedulePreview
                v-if="workingReportSchedule"
                class="mb-4"
                :model-value="workingReportSchedule"
              />
              <PolicyField
                v-if="workingDocument"
                :hidden-fields="MODEL_ROUTING_GOVERNED_FIELDS"
                :issues="editorValidationIssues"
                :model-value="workingDocument"
                :root-schema="jsonSchema"
                :schema="jsonSchema"
                @update:model-value="updateWorkingDocument"
              />
            </section>

            <section
              v-if="['review', 'validated', 'approved'].includes(stage)"
              class="bg-card rounded-xl border p-5"
              data-testid="config-review"
            >
              <div
                class="mb-4 flex flex-wrap items-start justify-between gap-3"
              >
                <div>
                  <h2 class="text-base font-semibold">
                    {{ $t('page.config.review.title') }}
                  </h2>
                  <p class="text-muted-foreground mt-1 text-sm">
                    {{ $t('page.config.review.description') }}
                  </p>
                </div>
                <Tag color="warning">
                  {{
                    $t('page.config.review.changeCount', {
                      count: diffs.length,
                    })
                  }}
                </Tag>
              </div>
              <div v-if="diffs.length > 0" class="divide-y rounded-lg border">
                <article
                  v-for="diff in diffs"
                  :key="diff.path.join('.')"
                  class="diff-row"
                >
                  <h3 class="font-mono text-xs font-semibold">
                    {{
                      diff.path
                        .map((part) => policyFieldLabel(part, {}))
                        .join(' / ')
                    }}
                  </h3>
                  <dl class="mt-2 grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt>{{ $t('page.config.review.before') }}</dt>
                      <dd data-screenshot-volatile="true">
                        {{ formatPolicyValue(diff.before) }}
                      </dd>
                    </div>
                    <div>
                      <dt>{{ $t('page.config.review.after') }}</dt>
                      <dd data-screenshot-volatile="true">
                        {{ formatPolicyValue(diff.after) }}
                      </dd>
                    </div>
                  </dl>
                </article>
              </div>
              <Empty v-else :description="$t('page.config.review.noChanges')" />
            </section>

            <section
              v-if="validation"
              class="bg-card rounded-xl border p-5"
              data-testid="config-validation-result"
              aria-live="polite"
            >
              <div class="flex items-center justify-between gap-3">
                <h2 class="text-base font-semibold">
                  {{ $t('page.config.validation.title') }}
                </h2>
                <Tag :color="validation.valid ? 'success' : 'error'">
                  {{
                    $t(
                      validation.valid
                        ? 'page.config.validation.passed'
                        : 'page.config.validation.failed',
                    )
                  }}
                </Tag>
              </div>
              <Alert
                v-if="validationIssues.length > 0"
                class="mt-4"
                :message="$t('page.config.validation.errorSummary')"
                show-icon
                :type="validation.valid ? 'warning' : 'error'"
              >
                <template #description>
                  <ul class="mt-2 space-y-2">
                    <li
                      v-for="issue in validationIssues"
                      :key="`${issue.path}:${issue.code}`"
                    >
                      <strong class="font-mono text-xs">{{
                        issue.path
                      }}</strong>
                      <span class="ml-2">{{ issue.message }}</span>
                    </li>
                  </ul>
                </template>
              </Alert>
              <div class="mt-4 grid gap-2">
                <div
                  v-for="check in preflightChecks"
                  :key="check.check"
                  class="preflight-row"
                >
                  <IconifyIcon
                    :icon="
                      check.outcome === 'passed'
                        ? 'lucide:check-circle-2'
                        : check.outcome === 'failed'
                          ? 'lucide:x-circle'
                          : 'lucide:minus-circle'
                    "
                    :class="
                      check.outcome === 'not_applicable'
                        ? 'not-applicable'
                        : check.outcome
                    "
                  />
                  <span class="font-medium">{{
                    $t(`page.config.preflight.${check.check}`)
                  }}</span>
                  <span class="text-muted-foreground min-w-0 text-xs">{{
                    check.failure_detail ??
                    $t(`page.config.preflightDetail.${check.detail_code}`)
                  }}</span>
                </div>
              </div>
            </section>
          </main>

          <aside class="impact-panel bg-card rounded-xl border p-4">
            <h2 class="text-sm font-semibold">
              {{ $t('page.config.impact.title') }}
            </h2>
            <dl class="mt-4 space-y-4 text-sm">
              <div>
                <dt>{{ $t('page.config.resource.effectiveBoundary') }}</dt>
                <dd>
                  {{
                    $t(`page.config.boundary.${schemaView.effective_boundary}`)
                  }}
                </dd>
              </div>
              <div>
                <dt>{{ $t('page.config.impact.consumers') }}</dt>
                <dd class="mt-2 flex flex-wrap gap-1">
                  <Tag v-for="consumer in schemaView.consumers" :key="consumer">
                    {{ $t(`page.config.consumer.${consumer}`) }}
                  </Tag>
                </dd>
              </div>
              <div>
                <dt>{{ $t('page.config.impact.restart') }}</dt>
                <dd>
                  <Tag color="success">
                    {{ $t('page.config.status.notRequired') }}
                  </Tag>
                </dd>
              </div>
              <div v-if="candidateRevision">
                <dt>{{ $t('page.config.resource.revision') }}</dt>
                <dd
                  class="font-mono"
                  data-screenshot-volatile="true"
                  :title="candidateRevision.policy_revision_id"
                >
                  {{ shortId(candidateRevision.policy_revision_id) }}
                </dd>
              </div>
            </dl>
          </aside>
        </div>

        <div
          v-if="stage !== 'view' && stage !== 'success'"
          class="sticky-actions bg-card/95"
          role="status"
        >
          <div class="min-w-0">
            <p class="text-sm font-medium">
              {{
                stage === 'edit'
                  ? $t('page.config.editor.changed', { count: diffs.length })
                  : $t(`page.config.workflow.stage.${stage}`)
              }}
            </p>
            <p class="text-muted-foreground truncate text-xs">
              {{ $t('page.config.workflow.noAutomaticActivation') }}
            </p>
          </div>
          <div class="flex flex-wrap justify-end gap-2">
            <Button v-if="stage === 'edit'" @click="resetWorkflow">
              {{ $t('common.cancel') }}
            </Button>
            <Button
              v-if="stage === 'edit'"
              :disabled="!dirty || editorValidationIssues.length > 0"
              data-testid="save-config-draft"
              type="primary"
              @click="saveDraft"
            >
              {{ $t('page.config.workflow.saveDraft') }}
            </Button>
            <Button
              v-if="stage === 'review' && !rollbackMode"
              @click="backToEdit"
            >
              {{ $t('page.config.workflow.backToEdit') }}
            </Button>
            <Button
              v-if="stage === 'review'"
              data-testid="validate-config-draft"
              type="primary"
              @click="validateRevision"
            >
              {{ $t('page.config.workflow.validate') }}
            </Button>
            <Button
              v-if="stage === 'validated'"
              :disabled="!canApprove"
              data-testid="approve-config-draft"
              type="primary"
              @click="approveRevision"
            >
              {{ $t('page.config.workflow.approve') }}
            </Button>
            <Button
              v-if="stage === 'approved'"
              :danger="rollbackMode"
              :disabled="rollbackMode ? !canRollback : !canActivate"
              data-testid="activate-config-draft"
              type="primary"
              @click="activateRevision"
            >
              {{
                $t(
                  rollbackMode
                    ? 'page.config.workflow.rollback'
                    : 'page.config.workflow.activate',
                )
              }}
            </Button>
          </div>
        </div>

        <section v-if="stage === 'view'" class="bg-card rounded-xl border p-5">
          <div class="mb-4">
            <h2 class="text-base font-semibold">
              {{ $t('page.config.revisions.title') }}
            </h2>
            <p class="text-muted-foreground mt-1 text-sm">
              {{ $t('page.config.revisions.description') }}
            </p>
          </div>
          <div v-if="revisions.length > 0" class="overflow-x-auto">
            <table class="revision-table">
              <thead>
                <tr>
                  <th>{{ $t('page.config.resource.revision') }}</th>
                  <th>{{ $t('page.config.resource.status') }}</th>
                  <th>{{ $t('page.config.resource.createdBy') }}</th>
                  <th>{{ $t('page.config.resource.createdAt') }}</th>
                  <th>
                    <span class="sr-only">{{
                      $t('page.config.revisions.operation')
                    }}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="revision in revisions"
                  :key="revision.policy_revision_id"
                >
                  <td class="font-mono" data-screenshot-volatile="true">
                    {{ shortId(revision.policy_revision_id) }}
                  </td>
                  <td>
                    <Tag>
                      {{ $t(`page.config.revisionStatus.${revision.status}`) }}
                    </Tag>
                  </td>
                  <td>{{ revision.created_by.label }}</td>
                  <td data-screenshot-volatile="true">
                    {{ formatDateTimeLocal(revision.created_at) }}
                  </td>
                  <td class="text-right">
                    <Button
                      v-if="revision.policy_revision_id !== activeRevisionId"
                      :disabled="!canRollback"
                      data-testid="review-config-rollback"
                      size="small"
                      type="text"
                      @click="reviewRollback(revision)"
                    >
                      {{ $t('page.config.workflow.rollback') }}
                    </Button>
                    <Tag v-else color="success">
                      {{ $t('page.config.resource.active') }}
                    </Tag>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <Empty v-else :description="$t('page.config.revisions.empty')" />
        </section>
      </template>
    </div>
  </Page>
</template>

<style scoped>
.config-eyebrow,
.config-active-tag {
  color: hsl(var(--foreground)) !important;
}

.config-active-tag {
  background: hsl(var(--card)) !important;
  border-color: hsl(var(--primary)) !important;
}

.resource-icon {
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  font-size: 1.15rem;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border-radius: 0.65rem;
}

.workflow-steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;
}

.workflow-steps li {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  min-width: 0;
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
}

.workflow-steps li::after {
  flex: 1;
  height: 1px;
  content: '';
  background: hsl(var(--border));
}

.workflow-steps li:last-child::after {
  display: none;
}

.workflow-index {
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  font-size: 0.6875rem;
  border: 1px solid hsl(var(--border));
  border-radius: 999px;
}

.workflow-steps li.active {
  font-weight: 600;
  color: hsl(var(--foreground));
}

.workflow-steps li.active .workflow-index,
.workflow-steps li.complete .workflow-index {
  color: white;
  background: hsl(var(--primary));
  border-color: hsl(var(--primary));
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(16rem, 19rem);
  gap: 1rem;
  align-items: start;
}

.impact-panel {
  position: sticky;
  top: 1rem;
}

.impact-panel dt,
.success-fact dt,
.diff-row dt {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
}

.impact-panel dd,
.success-fact dd,
.diff-row dd {
  margin-top: 0.35rem;
  overflow-wrap: anywhere;
}

.diff-row {
  padding: 0.875rem;
}

.diff-row dd {
  padding: 0.6rem;
  font-size: 0.75rem;
  background: hsl(var(--muted) / 65%);
  border-radius: 0.4rem;
}

.preflight-row {
  display: grid;
  grid-template-columns: 1rem minmax(10rem, 0.4fr) minmax(0, 1fr);
  gap: 0.6rem;
  align-items: center;
  padding: 0.65rem 0.75rem;
  background: hsl(var(--muted) / 45%);
  border-radius: 0.5rem;
}

.preflight-row .passed {
  color: hsl(var(--success));
}

.preflight-row .failed {
  color: hsl(var(--destructive));
}

.preflight-row .not-applicable {
  color: hsl(var(--muted-foreground));
}

.sticky-actions {
  position: sticky;
  bottom: 0.75rem;
  z-index: 20;
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  box-shadow: 0 16px 40px -24px hsl(var(--foreground) / 45%);
  backdrop-filter: blur(12px);
}

.activation-success {
  background-image: radial-gradient(
    circle at 50% 0%,
    hsl(var(--success) / 12%),
    transparent 40%
  );
}

.activation-success-icon {
  display: inline-grid;
  place-items: center;
  width: 3.5rem;
  height: 3.5rem;
  font-size: 1.75rem;
  color: hsl(var(--success));
  background: hsl(var(--success) / 12%);
  border-radius: 999px;
  animation: success-enter 280ms ease-out both;
}

.success-fact {
  min-width: 0;
  padding: 0.85rem;
  background: hsl(var(--card));
}

.revision-table {
  width: 100%;
  min-width: 46rem;
  font-size: 0.8125rem;
  border-collapse: collapse;
}

.revision-table th {
  font-size: 0.75rem;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  text-align: left;
}

.revision-table th,
.revision-table td {
  padding: 0.7rem 0.5rem;
  border-bottom: 1px solid hsl(var(--border));
}

@keyframes success-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

@media (max-width: 900px) {
  .workspace-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .impact-panel {
    position: static;
  }
}

@media (max-width: 640px) {
  .workflow-steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .workflow-steps li::after {
    display: none;
  }

  .sticky-actions {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (prefers-reduced-motion: reduce) {
  .activation-success-icon {
    animation: none;
  }
}
</style>
