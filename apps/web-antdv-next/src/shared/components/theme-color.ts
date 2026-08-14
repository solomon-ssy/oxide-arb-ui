const CATEGORICAL_VARIABLES = [
  '--qp-chart-cat-1',
  '--qp-chart-cat-2',
  '--qp-chart-cat-3',
  '--qp-chart-cat-4',
  '--qp-chart-cat-5',
  '--qp-chart-cat-6',
  '--qp-chart-cat-7',
  '--qp-chart-cat-8',
  '--qp-chart-cat-9',
  '--qp-chart-cat-10',
  '--qp-chart-cat-11',
  '--qp-chart-cat-12',
] as const;

const SEQUENTIAL_VARIABLES = [
  '--qp-chart-sequential-1',
  '--qp-chart-sequential-2',
  '--qp-chart-sequential-3',
  '--qp-chart-sequential-4',
  '--qp-chart-sequential-5',
] as const;

const DIVERGING_VARIABLES = [
  '--qp-chart-diverging-negative',
  '--qp-chart-diverging-negative-soft',
  '--qp-chart-diverging-neutral',
  '--qp-chart-diverging-positive-soft',
  '--qp-chart-diverging-positive',
] as const;

const THEME_COLOR_VARIABLES = [
  '--qp-accent-command',
  '--qp-accent-realtime',
  '--qp-accent-research',
  '--qp-border-active',
  '--qp-border-subtle',
  '--qp-status-danger',
  '--qp-status-neutral',
  '--qp-status-paused',
  '--qp-status-queued',
  '--qp-status-running',
  '--qp-status-success',
  '--qp-status-warning',
  '--qp-surface-base',
  '--qp-surface-canvas',
  '--qp-surface-inset',
  '--qp-surface-overlay',
  '--qp-surface-raised',
  '--qp-text-muted',
  '--qp-text-primary',
  '--qp-text-secondary',
  ...CATEGORICAL_VARIABLES,
  ...SEQUENTIAL_VARIABLES,
  ...DIVERGING_VARIABLES,
] as const;

export type ThemeColorVariable = (typeof THEME_COLOR_VARIABLES)[number];

/** Resolve a product HSL token for renderers that cannot consume CSS variables. */
export function resolveThemeColor(
  cssVariable: ThemeColorVariable,
  alpha?: `${number}%`,
): string {
  if (typeof document === 'undefined') {
    return 'currentColor';
  }
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVariable)
    .trim();
  return value ? `hsl(${value}${alpha ? ` / ${alpha}` : ''})` : 'currentColor';
}

/** The only JS color facade for canvas and SVG renderers. */
export const themeColors = {
  accent: {
    get command() {
      return resolveThemeColor('--qp-accent-command');
    },
    get realtime() {
      return resolveThemeColor('--qp-accent-realtime');
    },
    get research() {
      return resolveThemeColor('--qp-accent-research');
    },
  },
  get categorical() {
    return CATEGORICAL_VARIABLES.map((variable) => resolveThemeColor(variable));
  },
  get diverging() {
    return DIVERGING_VARIABLES.map((variable) => resolveThemeColor(variable));
  },
  border: {
    get active() {
      return resolveThemeColor('--qp-border-active');
    },
    get subtle() {
      return resolveThemeColor('--qp-border-subtle');
    },
  },
  get sequential() {
    return SEQUENTIAL_VARIABLES.map((variable) => resolveThemeColor(variable));
  },
  status: {
    get danger() {
      return resolveThemeColor('--qp-status-danger');
    },
    get neutral() {
      return resolveThemeColor('--qp-status-neutral');
    },
    get paused() {
      return resolveThemeColor('--qp-status-paused');
    },
    get queued() {
      return resolveThemeColor('--qp-status-queued');
    },
    get running() {
      return resolveThemeColor('--qp-status-running');
    },
    get success() {
      return resolveThemeColor('--qp-status-success');
    },
    get warning() {
      return resolveThemeColor('--qp-status-warning');
    },
  },
  surface: {
    get base() {
      return resolveThemeColor('--qp-surface-base');
    },
    get canvas() {
      return resolveThemeColor('--qp-surface-canvas');
    },
    get inset() {
      return resolveThemeColor('--qp-surface-inset');
    },
    get overlay() {
      return resolveThemeColor('--qp-surface-overlay');
    },
    get raised() {
      return resolveThemeColor('--qp-surface-raised');
    },
  },
  text: {
    get muted() {
      return resolveThemeColor('--qp-text-muted');
    },
    get primary() {
      return resolveThemeColor('--qp-text-primary');
    },
    get secondary() {
      return resolveThemeColor('--qp-text-secondary');
    },
  },
};
