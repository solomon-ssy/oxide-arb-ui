import type {
  RuntimeConfigActivationInfo,
  RuntimeConfigDocument,
  RuntimeConfigVersionView,
} from '@vben/types';

import { describe, expect, it } from 'vitest';

import { resolveRuntimeConfigDiffBaseline } from './resolve-diff-baseline';

function versionFixture(
  id: string,
  config_json: RuntimeConfigDocument,
): RuntimeConfigVersionView {
  return {
    config_hash: `hash-${id}`,
    config_json,
    created_at: '2026-01-01T00:00:00Z',
    created_by: 'admin',
    reason: 'test',
    runtime_config_version_id: id,
    schema_version: 1,
    source: 'operator',
  };
}

const previousVersion = versionFixture('prev-id', {
  execution: { timeout: { max_validation_slippage_bps: 50 } },
});

const activeVersion = versionFixture('active-id', {
  execution: { timeout: { max_validation_slippage_bps: 51 } },
});

const activation: RuntimeConfigActivationInfo = {
  activated_at: '2026-01-01T00:00:00Z',
  activated_by: 'admin',
  activation_kind: 'promote',
  audit_event_id: null,
  created_at: '2026-01-01T00:00:00Z',
  previous_runtime_config_version_id: 'prev-id',
  reason: 'test',
  rollback_target_version_id: null,
  runtime_config_activation_id: 'activation-id',
  runtime_config_version_id: 'active-id',
};

describe('resolveRuntimeConfigDiffBaseline', () => {
  it('uses the replaced version for the currently active row', () => {
    const baseline = resolveRuntimeConfigDiffBaseline(activeVersion, {
      activeActivation: activation,
      activeVersionId: 'active-id',
      currentConfig: activeVersion.config_json,
      versionCatalog: [previousVersion, activeVersion],
    });

    expect(baseline).toEqual(previousVersion.config_json);
  });

  it('uses live config for inactive version rows', () => {
    const baseline = resolveRuntimeConfigDiffBaseline(previousVersion, {
      activeActivation: activation,
      activeVersionId: 'active-id',
      currentConfig: activeVersion.config_json,
      versionCatalog: [previousVersion, activeVersion],
    });

    expect(baseline).toEqual(activeVersion.config_json);
  });
});
