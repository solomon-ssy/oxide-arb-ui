import type {
  BarSeriesOption,
  GaugeSeriesOption,
  LineSeriesOption,
  PieSeriesOption,
  RadarSeriesOption,
  ScatterSeriesOption,
} from 'echarts/charts';
import type {
  DatasetComponentOption,
  GridComponentOption,
  LegendComponentOption,
  TitleComponentOption,
  ToolboxComponentOption,
  TooltipComponentOption,
} from 'echarts/components';
import type { ComposeOption } from 'echarts/core';

// `aria` is intentionally not composed into `ECOption`: `ComposeOption`
// synthesizes an "arrayable" variant for every included option type, which
// conflicts with the single-object `AriaOption` shape ECharts actually
// expects. Chart authors who need `aria` should type their option object as
// the full `EChartsOption` from `'echarts'` (already accepted by
// `renderEcharts`), not the narrower tree-shaken `ECOption`.
export type ECOption = ComposeOption<
  | BarSeriesOption
  | DatasetComponentOption
  | GaugeSeriesOption
  | GridComponentOption
  | LegendComponentOption
  | LineSeriesOption
  | PieSeriesOption
  | RadarSeriesOption
  | ScatterSeriesOption
  | TitleComponentOption
  | ToolboxComponentOption
  | TooltipComponentOption
>;

export type { TooltipComponentOption };
