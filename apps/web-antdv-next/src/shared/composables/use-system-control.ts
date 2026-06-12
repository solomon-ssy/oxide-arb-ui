import type { Component } from 'vue';

import type { ExecutionMode } from '@vben/types';

import { useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/hooks';
import { EXECUTION_MODES } from '@vben/types';

import { message } from 'antdv-next';

import { haltSystem, resumeSystem, switchExecutionMode } from '#/api/system';
import { $t } from '#/locales';
import HaltReasonModal from '#/shared/components/halt-reason-modal.vue';
import ResumeAckModal from '#/shared/components/resume-ack-modal.vue';
import { useGovernedAction } from '#/shared/composables/use-governed-action';

type SystemControlApi = {
  /** Open the halt-reason modal; on confirm `POST /system/halt`. */
  halt: () => void;
  /** Modal hosts — mounted once in the basic layout. */
  HaltModalHost: Component;
  /** Open the resume-acknowledgement modal; on confirm `POST /system/resume`. */
  resume: () => void;
  ResumeModalHost: Component;
  /** Governed mode switch; entering `live` requires the confirm word. */
  switchMode: (target: ExecutionMode) => Promise<void>;
};

let systemControlApi: null | SystemControlApi = null;

/**
 * System control actions shared by the header indicator and the dashboard
 * status card. None of them updates local state optimistically — the UI
 * converges on the authoritative WS `system.status` echo.
 */
function createSystemControlApi(): SystemControlApi {
  const { handleRequest } = useRequestHandler();
  const { governed } = useGovernedAction();

  const [HaltModalHost, haltModalApi] = useVbenModal({
    connectedComponent: HaltReasonModal,
    destroyOnClose: true,
  });

  const [ResumeModalHost, resumeModalApi] = useVbenModal({
    connectedComponent: ResumeAckModal,
    destroyOnClose: true,
  });

  function halt() {
    haltModalApi.setData({
      onSubmit: async (reason: string) => {
        await handleRequest(
          () => haltSystem({ reason }),
          () => message.success($t('page.system.halt.submitted')),
        );
      },
    });
    haltModalApi.open();
  }

  function resume() {
    resumeModalApi.setData({
      onSubmit: async (operatorAck: string) => {
        await handleRequest(
          () => resumeSystem({ operator_ack: operatorAck }),
          () => message.success($t('page.system.resume.submitted')),
        );
      },
    });
    resumeModalApi.open();
  }

  async function switchMode(target: ExecutionMode) {
    const isLive = target === EXECUTION_MODES.live;
    const report = await governed(
      (ctx) => switchExecutionMode({ mode: target, reason: ctx.reason }, ctx),
      {
        confirmWord: isLive ? 'live' : undefined,
        danger: isLive,
        summary: $t('page.system.mode.summary', {
          target: $t(`enum.executionMode.${target}`),
        }),
        title: $t('page.system.mode.title'),
      },
    );
    if (report) {
      message.success(
        $t('page.system.mode.switched', {
          from: $t(`enum.executionMode.${report.from}`),
          to: $t(`enum.executionMode.${report.to}`),
        }),
      );
    }
  }

  return {
    halt,
    HaltModalHost,
    resume,
    ResumeModalHost,
    switchMode,
  };
}

/** Singleton system-control actions + modal hosts (mounted in BasicLayout). */
export function useSystemControl(): SystemControlApi {
  systemControlApi ??= createSystemControlApi();
  return systemControlApi;
}
