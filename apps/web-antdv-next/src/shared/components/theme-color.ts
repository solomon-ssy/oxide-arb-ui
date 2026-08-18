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

/**
 * Product tokens store CSS Color 4 channels (`H S% L%` or `H S% L% / A%`).
 * Canvas/ZRender 6 only parse comma `rgb()` / `rgba()` / `hsl(h, s%, l%)`.
 * Space-separated `hsl()` and `currentColor` both return `undefined` there,
 * and ECharts then reads `.length` on every hover/paint frame.
 */
const HSL_TOKEN =
  /^(-?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%(?:\s*\/\s*(\d+(?:\.\d+)?)%?)?$/;

const CANVAS_TRANSPARENT = 'rgba(0, 0, 0, 0)';

function parseAlphaPercent(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return undefined;
  }
  return Math.min(1, Math.max(0, numeric / 100));
}

function formatAlpha(alpha: number): string {
  if (alpha >= 1) {
    return '1';
  }
  if (alpha <= 0) {
    return '0';
  }
  return String(Math.round(alpha * 1000) / 1000);
}

function hueToRgb(min: number, max: number, hue: number): number {
  let next = hue;
  if (next < 0) {
    next += 1;
  } else if (next > 1) {
    next -= 1;
  }
  if (next * 6 < 1) {
    return min + (max - min) * next * 6;
  }
  if (next * 2 < 1) {
    return max;
  }
  if (next * 3 < 2) {
    return min + (max - min) * (2 / 3 - next) * 6;
  }
  return min;
}

function hslToRgb(
  hue: number,
  saturation: number,
  lightness: number,
): readonly [number, number, number] {
  const h = (((hue % 360) + 360) % 360) / 360;
  const s = Math.min(1, Math.max(0, saturation));
  const l = Math.min(1, Math.max(0, lightness));
  const max = l <= 0.5 ? l * (s + 1) : l + s - l * s;
  const min = l * 2 - max;
  return [
    Math.round(hueToRgb(min, max, h + 1 / 3) * 255),
    Math.round(hueToRgb(min, max, h) * 255),
    Math.round(hueToRgb(min, max, h - 1 / 3) * 255),
  ];
}

function rgba(r: number, g: number, b: number, alpha: number): string {
  return `rgba(${r}, ${g}, ${b}, ${formatAlpha(alpha)})`;
}

/** Convert a product HSL channel token into a ZRender-safe `rgba()` color. */
export function canvasColorFromHslToken(
  token: string,
  alpha?: `${number}%`,
): string {
  const match = HSL_TOKEN.exec(token.trim());
  if (!match) {
    return CANVAS_TRANSPARENT;
  }
  const channels = hslToRgb(
    Number(match[1]),
    Number(match[2]) / 100,
    Number(match[3]) / 100,
  );
  const resolvedAlpha =
    parseAlphaPercent(alpha?.replace('%', '')) ??
    parseAlphaPercent(match[4]) ??
    1;
  return rgba(channels[0], channels[1], channels[2], resolvedAlpha);
}

function readThemeColor(cssVariable: ThemeColorVariable): string {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVariable)
    .trim();
  const reference = /^var\((--qp-[^)]+)\)$/.exec(raw)?.[1];
  return reference
    ? getComputedStyle(document.documentElement)
        .getPropertyValue(reference)
        .trim()
    : raw;
}

/** Resolve a product HSL token for canvas, SVG, and ZRender. */
export function resolveThemeColor(
  cssVariable: ThemeColorVariable,
  alpha?: `${number}%`,
): string {
  if (typeof document === 'undefined') {
    return CANVAS_TRANSPARENT;
  }
  return canvasColorFromHslToken(readThemeColor(cssVariable), alpha);
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
