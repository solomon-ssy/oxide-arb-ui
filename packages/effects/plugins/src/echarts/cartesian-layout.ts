import type { EChartsOption } from 'echarts';

/**
 * ECharts 6 moved the default horizontal legend from `top: 0` to
 * `bottom: tokens.size.m` (15px). Cartesian charts written against the v5
 * default kept `grid.bottom` sized only for axis labels, so the legend now
 * paints on top of the x-axis. This helper is the layout contract: pin an
 * legend without an explicit position to the top, keep it on one scrollable
 * row, and reserve
 * grid insets with `containLabel` so axis labels never share that band.
 */
export const CARTESIAN_LEGEND_ROW = 36;

const GRID_GUTTER = {
  left: 8,
  right: 12,
} as const;

type LegendPlacement = 'bottom' | 'none' | 'side' | 'top';

type GridOption = Exclude<EChartsOption['grid'], undefined | unknown[]>;
type LegendOption = Exclude<EChartsOption['legend'], undefined | unknown[]>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function maxInset(
  base: number | string | undefined,
  author: number | string | undefined,
): number | string | undefined {
  if (typeof base === 'number' && typeof author === 'number') {
    return Math.max(base, author);
  }
  if (author !== undefined) {
    return author;
  }
  return base;
}

function legendPlacement(legend: EChartsOption['legend']): LegendPlacement {
  if (!isPlainObject(legend) || legend.show === false) {
    return 'none';
  }
  if (legend.orient === 'vertical') {
    return 'side';
  }
  const top = legend.top;
  const bottom = legend.bottom;
  if (top !== undefined && top !== 'auto') {
    return 'top';
  }
  if (bottom !== undefined && bottom !== 'auto') {
    return 'bottom';
  }
  // Unspecified: ECharts 6 would put this at the bottom. Pin it to the top.
  return 'top';
}

function legendDefaults(placement: Exclude<LegendPlacement, 'none' | 'side'>) {
  const row = {
    itemGap: 16,
    itemHeight: 8,
    itemWidth: 12,
    left: 'center' as const,
    pageButtonItemGap: 8,
    pageIconSize: 10,
    type: 'scroll' as const,
  };
  return placement === 'top'
    ? { ...row, padding: [0, 8, 4, 8], top: 0 }
    : { ...row, bottom: 0, padding: [4, 8, 0, 8] };
}

function gridDefaults(placement: LegendPlacement): GridOption {
  return {
    bottom: placement === 'bottom' ? CARTESIAN_LEGEND_ROW : 8,
    containLabel: true,
    left: GRID_GUTTER.left,
    right: GRID_GUTTER.right,
    top: placement === 'top' ? CARTESIAN_LEGEND_ROW : 8,
  };
}

function mergeGrid(base: GridOption, author: unknown): GridOption {
  const source = isPlainObject(author) ? (author as GridOption) : {};
  return {
    ...base,
    ...source,
    bottom: maxInset(
      base.bottom as number | string,
      source.bottom as number | string,
    ),
    containLabel: source.containLabel ?? base.containLabel,
    left: maxInset(
      base.left as number | string,
      source.left as number | string,
    ),
    right: maxInset(
      base.right as number | string,
      source.right as number | string,
    ),
    top: maxInset(base.top as number | string, source.top as number | string),
  };
}

function mergeLegend(
  placement: LegendPlacement,
  author: EChartsOption['legend'],
): EChartsOption['legend'] {
  if (placement === 'none' || placement === 'side' || !isPlainObject(author)) {
    return author;
  }
  const defaults = legendDefaults(placement);
  return {
    ...defaults,
    ...(author as LegendOption),
    ...(placement === 'top' ? { top: (author as LegendOption).top ?? 0 } : {}),
    ...(placement === 'bottom'
      ? { bottom: (author as LegendOption).bottom ?? 0 }
      : {}),
  };
}

function withHideOverlap(axis: unknown): unknown {
  if (Array.isArray(axis)) {
    return axis.map((item) => withHideOverlap(item));
  }
  if (!isPlainObject(axis)) {
    return axis;
  }
  const axisLabel = isPlainObject(axis.axisLabel) ? axis.axisLabel : {};
  if (axisLabel.hideOverlap !== undefined || axisLabel.interval === 0) {
    return axis;
  }
  return {
    ...axis,
    axisLabel: {
      hideOverlap: true,
      ...axisLabel,
    },
  };
}

function isCartesian(options: EChartsOption): boolean {
  return options.xAxis !== undefined || options.yAxis !== undefined;
}

/**
 * Normalize cartesian `grid` / `legend` / x-axis overlap so every `useEcharts`
 * consumer gets a collision-free layout without copying pixel magic numbers.
 */
export function applyCartesianLayout(options: EChartsOption): EChartsOption {
  if (!isCartesian(options) || Array.isArray(options.grid)) {
    return options;
  }

  const placement = legendPlacement(options.legend);
  const grid = mergeGrid(gridDefaults(placement), options.grid);
  const legend = mergeLegend(placement, options.legend);

  return {
    ...options,
    grid,
    ...(legend === undefined ? {} : { legend }),
    xAxis: withHideOverlap(options.xAxis) as EChartsOption['xAxis'],
  };
}
