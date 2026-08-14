export interface WorkspaceInspectorRegistration {
  readonly canonicalModule: string;
  readonly contextualModules?: readonly string[];
}

/**
 * Typed workspace Inspector registry.
 *
 * Every entity has one owning module. Contextual modules are explicit views
 * that intentionally inspect the same identity in a graph or process rail;
 * every other module/entity pair is canonicalized to the owner.
 */
export const WORKSPACE_INSPECTOR_REGISTRY = {
  '/execution/orders': {
    'execution-order': {
      canonicalModule: 'orders',
      contextualModules: ['flow'],
    },
    'order-intent': {
      canonicalModule: 'intents',
      contextualModules: ['approvals', 'flow'],
    },
    position: { canonicalModule: 'flow' },
    reconciliation: { canonicalModule: 'flow' },
    'settlement-redeem': { canonicalModule: 'flow' },
  },
  '/execution/portfolio': {
    position: { canonicalModule: 'positions' },
  },
  '/execution/post-trade': {
    reconciliation: { canonicalModule: 'reconciliation' },
    'settlement-redeem': { canonicalModule: 'settlement' },
  },
  '/research/data-reliability': {
    'market-linkage': { canonicalModule: 'linkages' },
    'parity-run': { canonicalModule: 'feature-integrity' },
  },
  '/research/lab': {
    backtest: {
      canonicalModule: 'evaluation',
      contextualModules: ['lineage'],
    },
    'calibration-artifact': { canonicalModule: 'lineage' },
    comparison: { canonicalModule: 'evaluation' },
    factor: { canonicalModule: 'factors' },
    'model-spec': {
      canonicalModule: 'specs',
      contextualModules: ['lineage'],
    },
    'model-version': {
      canonicalModule: 'models',
      contextualModules: ['lineage'],
    },
    'training-dataset': {
      canonicalModule: 'datasets',
      contextualModules: ['lineage'],
    },
  },
  '/research/learning-policy': {
    'calibration-artifact': { canonicalModule: 'calibration' },
    'feedback-cycle': { canonicalModule: 'feedback' },
    'trade-policy': { canonicalModule: 'policies' },
  },
  '/system/audit': {
    'governance-audit-event': { canonicalModule: 'receipts' },
    'operation-log': { canonicalModule: 'operations' },
  },
  '/system/config': {
    'config-activation': {
      canonicalModule: 'policy',
      contextualModules: ['history'],
    },
    'config-resource': { canonicalModule: 'policy' },
    'config-version': { canonicalModule: 'history' },
  },
  '/trading/market-intelligence': {
    market: {
      canonicalModule: 'overview',
      contextualModules: ['live'],
    },
  },
  '/trading/recommendations': {
    recommendation: { canonicalModule: 'queue' },
    report: {
      canonicalModule: 'reports',
      contextualModules: ['diff', 'funnel', 'queue'],
    },
    'report-run': { canonicalModule: 'reports' },
  },
} as const satisfies Record<
  string,
  Record<string, WorkspaceInspectorRegistration>
>;

export type WorkspaceInspectorPath = keyof typeof WORKSPACE_INSPECTOR_REGISTRY;

/** Resolve an identity to its canonical or explicitly contextual module. */
export function inspectorModule(
  path: string,
  entity: string,
  requestedModule?: string,
): string | undefined {
  const workspace =
    WORKSPACE_INSPECTOR_REGISTRY[path as WorkspaceInspectorPath];
  const registration = workspace?.[entity as keyof typeof workspace] as
    | undefined
    | WorkspaceInspectorRegistration;
  if (!registration) return undefined;
  if (
    requestedModule === registration.canonicalModule ||
    registration.contextualModules?.includes(requestedModule ?? '')
  ) {
    return requestedModule;
  }
  return registration.canonicalModule;
}
