/** Iconify icon ids for table row operation buttons (icon-only + tooltip). */
const ACTION_ICONS = {
  activate: 'lucide:play',
  approve: 'lucide:check',
  backtest: 'lucide:history',
  block: 'lucide:shield-off',
  cancel: 'lucide:ban',
  detail: 'lucide:eye',
  publish: 'lucide:badge-check',
  reject: 'lucide:x',
  resolve: 'lucide:check-check',
  result: 'lucide:external-link',
  retire: 'lucide:archive',
  retry: 'lucide:refresh-cw',
  revoke: 'lucide:undo-2',
  rollback: 'lucide:rotate-ccw',
  submit: 'lucide:send',
  train: 'lucide:brain-circuit',
  unblock: 'lucide:shield-check',
} as const;

export type TableOperationCode = keyof typeof ACTION_ICONS;

export interface IconOperationOption<TRow = unknown> {
  code: string;
  danger?: boolean;
  icon: string;
  show?: (row: TRow) => boolean;
  tooltip: string;
}

/** Build a CellOperation option with icon-only display and a text tooltip. */
export function iconOp<TRow = unknown>(
  code: TableOperationCode,
  label: string,
  extra?: Omit<IconOperationOption<TRow>, 'code' | 'icon' | 'tooltip'>,
): IconOperationOption<TRow> {
  return {
    code,
    icon: ACTION_ICONS[code],
    tooltip: label,
    ...extra,
  };
}
