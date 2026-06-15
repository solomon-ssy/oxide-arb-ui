import type {
  RuntimeConfigActivationInfo,
  RuntimeConfigDocument,
  RuntimeConfigVersionView,
} from '@vben/types';

export interface RuntimeConfigDiffContext {
  activeActivation: null | RuntimeConfigActivationInfo;
  activeVersionId: null | string;
  currentConfig: RuntimeConfigDocument;
  versionCatalog: RuntimeConfigVersionView[];
}

/**
 * Resolve the JSON document to diff against when viewing a version.
 *
 * - Active version: compare to the version it replaced (activation lineage).
 * - Inactive version: compare to the live applied config (promotion preview).
 */
export function resolveRuntimeConfigDiffBaseline(
  version: RuntimeConfigVersionView,
  context: RuntimeConfigDiffContext,
): RuntimeConfigDocument {
  const isActive =
    version.runtime_config_version_id === context.activeVersionId;

  if (isActive) {
    const previousId =
      context.activeActivation?.previous_runtime_config_version_id;
    if (previousId) {
      const previousVersion = context.versionCatalog.find(
        (item) => item.runtime_config_version_id === previousId,
      );
      if (previousVersion) {
        return previousVersion.config_json as RuntimeConfigDocument;
      }
    }
    return version.config_json as RuntimeConfigDocument;
  }

  return context.currentConfig;
}
