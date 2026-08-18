import { inspectorModule } from './workspace-inspector-registry';

/** Tab-strip and deep-link fields shared by workspace modules. */
export interface WorkspaceTabSpec {
  highlight?: string;
  key: string;
  landing?: boolean;
}

/** Landing modules appear in the workspace tab strip. */
export function isLandingModule(module: WorkspaceTabSpec): boolean {
  return module.landing !== false;
}

/** Highlight the owning inventory tab while a contextual module is active. */
export function highlightedTab(
  modules: readonly WorkspaceTabSpec[],
  activeKey: string | undefined,
): string | undefined {
  const landingKeys = new Set(
    modules.filter((item) => isLandingModule(item)).map((item) => item.key),
  );
  const active = modules.find((item) => item.key === activeKey);
  const candidate = active?.highlight ?? active?.key;
  if (candidate && landingKeys.has(candidate)) {
    return candidate;
  }
  return modules.find((item) => isLandingModule(item))?.key;
}

/** Canonicalize `module=` to a registered landing or contextual object-stage view. */
export function resolveWorkspaceModule(options: {
  entity?: string;
  id?: string;
  modules: readonly WorkspaceTabSpec[];
  path: string;
  requested?: string;
}): string | undefined {
  const fallback = options.modules.find((item) => isLandingModule(item))?.key;
  const current = options.requested
    ? options.modules.find((item) => item.key === options.requested)
    : undefined;
  const entity = options.entity;
  const id = options.id;

  if (current && isLandingModule(current)) {
    return current.key;
  }

  const inspectorFallback =
    typeof entity === 'string' && typeof id === 'string' && id.length > 0
      ? inspectorModule(options.path, entity, options.requested)
      : undefined;
  const moduleKeys = new Set(options.modules.map((item) => item.key));
  if (inspectorFallback && moduleKeys.has(inspectorFallback)) {
    return inspectorFallback;
  }
  return current?.highlight ?? fallback;
}
