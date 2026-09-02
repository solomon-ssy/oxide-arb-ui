const pageScenarios = [
  'page-dashboard',
  'page-activity-center',
  'page-market-intelligence',
  'page-recommendations',
  'page-execution-orders',
  'page-portfolio',
  'page-post-trade',
  'page-research-lab',
  'page-learning-policy',
  'page-data-reliability',
  'page-system-config',
  'page-system-audit',
] as const;

const stateScenarios = [
  'state-market-live',
  'state-report-detail',
  'state-report-funnel',
  'state-report-diff',
  'state-execution-flow',
  'state-approval-queue',
  'state-portfolio-exposure',
  'state-portfolio-equity',
  'state-settlement-ledger',
  'state-governed-actions',
  'state-lineage-inspector',
  'state-model-spec',
  'state-feedback-loop',
  'state-config-policy',
] as const;

export const RELEASE_SCENARIOS = {
  'visual-desktop-dark': [...pageScenarios, ...stateScenarios],
  'visual-desktop-light': pageScenarios,
  'visual-mobile-dark': pageScenarios,
  'visual-tablet-dark': ['page-dashboard'],
} as const;

export const RELEASE_SCENARIO_KEYS = Object.entries(RELEASE_SCENARIOS)
  .flatMap(([project, scenarios]) =>
    scenarios.map((scenario) => `${project}/${scenario}`),
  )
  .toSorted();
