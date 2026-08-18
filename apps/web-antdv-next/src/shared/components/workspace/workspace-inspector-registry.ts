export type WorkspaceSurface = 'inspector' | 'page';

export interface WorkspaceInspectorRegistration {
  readonly canonicalModule: string;
  readonly contextualModules?: readonly string[];
  readonly surface: WorkspaceSurface;
}

/**
 * Typed workspace Inspector registry.
 *
 * Every entity has one owning module. Contextual modules are explicit views
 * that intentionally inspect the same identity in a graph or process rail;
 * every other module/entity pair is canonicalized to the owner.
 *
 * `surface` chooses the chrome: `page` replaces the list with a full-width
 * object stage; `inspector` keeps the list and opens the inset overlay.
 *
 * Stage chrome is back + object identity + optional primary actions.
 * Inspector chrome is title + optional primary actions + close.
 * Do not put Close on Stage or Back on Inspector, and do not repeat the
 * chrome title inside ObjectInspectorHeader.
 */
export const WORKSPACE_INSPECTOR_REGISTRY = {
  '/execution/orders': {
    'execution-order': {
      canonicalModule: 'orders',
      contextualModules: ['flow'],
      surface: 'page',
    },
    'order-intent': {
      canonicalModule: 'intents',
      contextualModules: ['approvals', 'flow'],
      surface: 'page',
    },
    position: { canonicalModule: 'flow', surface: 'inspector' },
    reconciliation: { canonicalModule: 'flow', surface: 'inspector' },
    'settlement-redeem': { canonicalModule: 'flow', surface: 'inspector' },
  },
  '/execution/portfolio': {
    position: { canonicalModule: 'positions', surface: 'inspector' },
  },
  '/execution/post-trade': {
    reconciliation: { canonicalModule: 'reconciliation', surface: 'page' },
    'settlement-redeem': { canonicalModule: 'settlement', surface: 'page' },
  },
  '/research/data-reliability': {
    'market-linkage': { canonicalModule: 'linkages', surface: 'page' },
    'parity-run': {
      canonicalModule: 'feature-integrity',
      surface: 'inspector',
    },
  },
  '/research/lab': {
    backtest: {
      canonicalModule: 'evaluation',
      contextualModules: ['lineage'],
      surface: 'page',
    },
    'calibration-artifact': { canonicalModule: 'lineage', surface: 'page' },
    comparison: { canonicalModule: 'evaluation', surface: 'page' },
    factor: { canonicalModule: 'factors', surface: 'page' },
    'model-spec': {
      canonicalModule: 'specs',
      contextualModules: ['lineage'],
      surface: 'page',
    },
    'model-version': {
      canonicalModule: 'models',
      contextualModules: ['lineage'],
      surface: 'page',
    },
    'training-dataset': {
      canonicalModule: 'datasets',
      contextualModules: ['lineage'],
      surface: 'page',
    },
  },
  '/research/learning-policy': {
    'calibration-artifact': { canonicalModule: 'calibration', surface: 'page' },
    'feedback-cycle': { canonicalModule: 'feedback', surface: 'page' },
    'trade-policy': { canonicalModule: 'policies', surface: 'page' },
  },
  '/system/audit': {
    'governance-audit-event': {
      canonicalModule: 'receipts',
      surface: 'inspector',
    },
    'operation-log': { canonicalModule: 'operations', surface: 'inspector' },
  },
  '/system/config': {
    'config-activation': {
      canonicalModule: 'policy',
      contextualModules: ['history'],
      surface: 'inspector',
    },
    'config-resource': { canonicalModule: 'policy', surface: 'page' },
    'config-version': { canonicalModule: 'history', surface: 'inspector' },
  },
  '/trading/market-intelligence': {
    market: {
      canonicalModule: 'overview',
      contextualModules: ['live'],
      surface: 'page',
    },
  },
  '/trading/recommendations': {
    recommendation: { canonicalModule: 'queue', surface: 'page' },
    report: {
      canonicalModule: 'reports',
      contextualModules: ['diff', 'funnel', 'queue'],
      surface: 'page',
    },
    'report-run': { canonicalModule: 'reports', surface: 'page' },
  },
} as const satisfies Record<
  string,
  Record<string, WorkspaceInspectorRegistration>
>;

export type WorkspaceInspectorPath = keyof typeof WORKSPACE_INSPECTOR_REGISTRY;

function registration(
  path: string,
  entity: string,
): undefined | WorkspaceInspectorRegistration {
  const workspace =
    WORKSPACE_INSPECTOR_REGISTRY[path as WorkspaceInspectorPath];
  return workspace?.[entity as keyof typeof workspace] as
    | undefined
    | WorkspaceInspectorRegistration;
}

/** Resolve an identity to its canonical or explicitly contextual module. */
export function inspectorModule(
  path: string,
  entity: string,
  requestedModule?: string,
): string | undefined {
  const found = registration(path, entity);
  if (!found) return undefined;
  if (
    requestedModule === found.canonicalModule ||
    found.contextualModules?.includes(requestedModule ?? '')
  ) {
    return requestedModule;
  }
  return found.canonicalModule;
}

/** Chrome class for a workspace identity, or undefined when unregistered. */
export function inspectorSurface(
  path: string,
  entity: string,
): undefined | WorkspaceSurface {
  return registration(path, entity)?.surface;
}
