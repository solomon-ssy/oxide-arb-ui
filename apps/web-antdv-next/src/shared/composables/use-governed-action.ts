import { prompt } from '@vben/common-ui';
import { useRequestHandler } from '@vben/hooks';
import { useUserStore } from '@vben/stores';

import { message } from 'antdv-next';

import { $t } from '#/locales';
import GovernedActionModal from '#/shared/components/governed-action-modal.vue';

/**
 * Context handed to the governed request function once the operator confirms.
 * `actingRole` goes into the `X-Acting-Role` header, `reason` into the body.
 */
export interface GovernedContext {
  actingRole: string;
  reason: string;
}

/** Options describing a single governed action confirmation. */
export interface GovernedOptions {
  /**
   * When set, the operator must type this exact word (e.g. target mode `live`)
   * before the action can be confirmed. Use for destructive / high-impact
   * actions such as live mode switch or emergency publish.
   */
  confirmWord?: string;
  /** Render the confirmation with destructive styling. */
  danger?: boolean;
  /**
   * Required permission code (`resource:operation`) of the governed route.
   * Reserved for Phase 7.1: acting-role options will be filtered to roles
   * actually holding this permission.
   */
  permissionCode?: string;
  /** Optional summary text describing what the action will do. */
  summary?: string;
  /** Modal title. */
  title: string;
}

/** Form value collected by the governance confirmation modal. */
export interface GovernedFormValue {
  actingRole: string;
  confirmInput: string;
  reason: string;
}

/** Backend contract: governed `reason` must be at least 4 characters. */
const MIN_REASON_LENGTH = 4;

/**
 * Roles the current user may act as for governed mutations.
 *
 * Phase 7.0 stub: reads the role codes from the vben user store. Phase 7.1
 * replaces this with `MeResponse.roles` filtered by `status === enabled` and
 * by the permission code of the governed route.
 */
export function useActingRoles(): string[] {
  const userStore = useUserStore();
  return userStore.userInfo?.roles ?? [];
}

/**
 * Unified interaction for all governed backend routes (`X-Acting-Role`
 * header + `reason` body field).
 *
 * Opens a confirmation modal collecting the reason and acting role (plus a
 * confirmation word for dangerous actions), then runs the request through
 * `useRequestHandler`. Resolves to the request result, or `null` when the
 * operator cancels or the request fails (the error toast has already been
 * shown by the request layer).
 */
export function useGovernedAction() {
  const { handleRequest } = useRequestHandler();

  async function governed<T>(
    fn: (ctx: GovernedContext) => Promise<T>,
    options: GovernedOptions,
  ): Promise<null | T> {
    const roles = useActingRoles();

    // Fail closed: an account without any acting role must never reach a
    // governed endpoint.
    if (roles.length === 0) {
      message.error($t('governance.error.noActingRole'));
      return null;
    }

    function validate(value: GovernedFormValue | undefined): boolean {
      if (!value?.actingRole) {
        message.warning($t('governance.error.actingRoleRequired'));
        return false;
      }
      if (value.reason.trim().length < MIN_REASON_LENGTH) {
        message.warning(
          $t('governance.error.reasonTooShort', { min: MIN_REASON_LENGTH }),
        );
        return false;
      }
      if (options.confirmWord && value.confirmInput !== options.confirmWord) {
        message.warning(
          $t('governance.error.confirmWordMismatch', {
            word: options.confirmWord,
          }),
        );
        return false;
      }
      return true;
    }

    let formValue: GovernedFormValue | undefined;
    try {
      formValue = await prompt<GovernedFormValue>({
        beforeClose: ({ isConfirm, value }) => {
          if (!isConfirm) {
            return true;
          }
          return validate(value);
        },
        component: GovernedActionModal,
        componentProps: {
          confirmWord: options.confirmWord,
          minReasonLength: MIN_REASON_LENGTH,
          roles,
        },
        content: options.summary ?? '',
        defaultValue: {
          actingRole: roles.length === 1 ? (roles[0] as string) : '',
          confirmInput: '',
          reason: '',
        },
        icon: options.danger ? 'error' : 'question',
        title: options.title,
      });
    } catch {
      // Operator cancelled the dialog.
      return null;
    }

    if (!formValue) {
      return null;
    }
    const ctx: GovernedContext = {
      actingRole: formValue.actingRole,
      reason: formValue.reason.trim(),
    };
    return await handleRequest(() => fn(ctx));
  }

  return { governed };
}
