import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';
import type { Recordable } from '@vben/types';

import type { ComponentPropsMap, ComponentType } from './component';

import type { DecimalInput } from '#/shared/components/format';

import { h } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { $te } from '@vben/locales';
import {
  setupVbenVxeTable,
  useVbenVxeGrid as useGrid,
} from '@vben/plugins/vxe-table';
import { get, isFunction, isString } from '@vben/utils';

import { objectOmit } from '@vueuse/core';
import {
  Button,
  Dropdown,
  Image,
  message,
  Switch,
  Tag,
  Tooltip,
} from 'antdv-next';

import { $t } from '#/locales';
import {
  decimalSign,
  EMPTY_PLACEHOLDER,
  formatBps,
  formatDateTimeLocal,
  formatDateTimeUtc,
  formatPercent,
  formatPrice,
  formatScore,
  formatUsd,
  parseDecimal,
  truncateHexId,
} from '#/shared/components/format';

import { useVbenForm } from './form';

/** Tag color per execution mode: dry_run grey, paper blue, live red. */
const EXECUTION_MODE_COLOR: Record<string, string> = {
  dry_run: 'default',
  live: 'error',
  paper: 'processing',
};

/** Tag color per circuit-breaker FSM state. */
const BREAKER_STATE_COLOR: Record<string, string> = {
  closed: 'success',
  half_open: 'warning',
  halted: 'magenta',
  open: 'error',
  recovered: 'processing',
};

/** Dot color (CSS class) matching the breaker state Tag color. */
const BREAKER_STATE_DOT_CLASS: Record<string, string> = {
  closed: 'bg-green-500',
  half_open: 'bg-yellow-500',
  halted: 'bg-fuchsia-500',
  open: 'bg-red-500',
  recovered: 'bg-blue-500',
};

setupVbenVxeTable({
  configVxeTable: (vxeUI) => {
    vxeUI.setConfig({
      grid: {
        align: 'center',
        border: false,
        columnConfig: {
          resizable: true,
        },
        formConfig: {
          // 全局禁用vxe-table的表单配置，使用formOptions
          enabled: false,
        },
        minHeight: 180,
        proxyConfig: {
          autoLoad: true,
          response: {
            // 对齐后端 Paginated{items,total}
            result: 'items',
            total: 'total',
            list: '',
          },
          showActiveMsg: true,
          showResponseMsg: false,
        },
        round: true,
        showOverflow: true,
        size: 'small',
        toolbarConfig: {
          custom: true,
          refresh: { code: 'query' },
          zoom: true,
        },
      } as VxeTableGridOptions,
    });

    /**
     * 解决vxeTable在热更新时可能会出错的问题
     */
    vxeUI.renderer.forEach((_item, key) => {
      if (key.startsWith('Cell')) {
        vxeUI.renderer.delete(key);
      }
    });

    // 表格配置项可以用 cellRender: { name: 'CellImage' },
    vxeUI.renderer.add('CellImage', {
      renderTableDefault(renderOpts, params) {
        const { props } = renderOpts;
        const { column, row } = params;
        return h(Image, { src: row[column.field], ...props });
      },
    });

    // 表格配置项可以用 cellRender: { name: 'CellLink' },
    vxeUI.renderer.add('CellLink', {
      renderTableDefault(renderOpts) {
        const { props } = renderOpts;
        return h(
          Button,
          { size: 'small', type: 'link' },
          { default: () => props?.text },
        );
      },
    });

    // 单元格渲染： Tag
    vxeUI.renderer.add('CellTag', {
      renderTableDefault({ options, props }, { column, row }) {
        const value = get(row, column.field);
        const tagOptions = options ?? [
          { color: 'success', label: $t('common.enabled'), value: 1 },
          { color: 'error', label: $t('common.disabled'), value: 0 },
        ];
        const tagItem = tagOptions.find((item) => item.value === value);
        return h(
          Tag,
          {
            ...props,
            ...objectOmit(tagItem ?? {}, ['label']),
          },
          { default: () => tagItem?.label ?? value },
        );
      },
    });

    // 单元格渲染：开关(异步 beforeChange 钩子 + 行级 loading)
    vxeUI.renderer.add('CellSwitch', {
      renderTableDefault({ attrs, props }, { column, row }) {
        const loadingKey = `__loading_${column.field}`;
        const finallyProps = {
          checkedChildren: $t('common.enabled'),
          checkedValue: 1,
          unCheckedChildren: $t('common.disabled'),
          unCheckedValue: 0,
          ...props,
          checked: row[column.field],
          loading: row[loadingKey] ?? false,
          'onUpdate:checked': onChange,
        };
        async function onChange(newVal: any) {
          row[loadingKey] = true;
          try {
            const result = await attrs?.beforeChange?.(newVal, row);
            if (result !== false) {
              row[column.field] = newVal;
            }
          } finally {
            row[loadingKey] = false;
          }
        }
        return h(Switch, finallyProps);
      },
    });

    /**
     * 注册表格的操作按钮渲染器
     */
    vxeUI.renderer.add('CellOperation', {
      renderTableDefault({ attrs, options, props }, { column, row }) {
        const defaultProps = { size: 'small', type: 'link', ...props };
        const COLUMN_ALIGN: Record<string, string> = {
          left: 'start',
          right: 'end',
        };
        const align = COLUMN_ALIGN[column.align ?? ''] ?? 'center';
        const operations: Array<Recordable<any>> = (
          options || ['edit', 'delete']
        )
          .map((opt) => {
            return isString(opt)
              ? {
                  code: opt,
                  text: $te(`common.${opt}`) ? $t(`common.${opt}`) : opt,
                  ...defaultProps,
                }
              : { ...defaultProps, ...opt };
          })
          .map((opt) => {
            const optBtn: Recordable<any> = {};
            Object.keys(opt).forEach((key) => {
              optBtn[key] = isFunction(opt[key]) ? opt[key](row) : opt[key];
            });
            return optBtn;
          })
          .filter((opt: Recordable<any>) => opt.show !== false);

        function renderBtn(opt: Recordable<any>, listen = true) {
          const iconVNode = opt.icon
            ? h(IconifyIcon, { class: 'size-5', icon: opt.icon })
            : null;

          // Render button content: icon and optional text
          const buttonContent = opt.text
            ? [iconVNode, h('span', {}, opt.text)]
            : [iconVNode];

          const baseButton = h(
            Button,
            {
              ...props,
              ...objectOmit(opt, ['dropdown', 'icon', 'text', 'tooltip']),
              onClick: listen
                ? () =>
                    attrs?.onClick?.({
                      code: opt.code,
                      row,
                    })
                : undefined,
            },
            { default: () => buttonContent },
          );

          // Build Tooltip-wrapped trigger when tooltip is provided
          const tooltip = opt.tooltip;
          let triggerNode = baseButton;
          if (tooltip) {
            const tooltipProps = isString(tooltip)
              ? { title: tooltip }
              : tooltip;
            triggerNode = h(Tooltip, tooltipProps, {
              default: () => baseButton,
            });
          }

          // When dropdown is configured, Dropdown should be the outermost wrapper.
          // antdv-next follows the antd v5 API: menu items go through the
          // `menu` prop (no `overlay` slot).
          const dropdown = opt.dropdown;
          if (dropdown) {
            // Transform icon strings to VNodes for menu items
            const menuItems = (dropdown.items ?? []).map((item: any) => {
              if (item.icon && isString(item.icon)) {
                return {
                  ...item,
                  icon: () => h(IconifyIcon, { icon: item.icon }),
                };
              }
              return item;
            });

            return h(
              Dropdown,
              {
                menu: {
                  items: menuItems,
                  onClick: (info: any) => {
                    attrs?.onClick?.({
                      code: opt.code,
                      extra: { menuInfo: info, menuKey: info?.key },
                      row,
                    });
                  },
                },
                trigger: ['click'],
              },
              { default: () => triggerNode },
            );
          }

          return triggerNode;
        }

        const btns = operations.map((opt) => renderBtn(opt, !opt?.dropdown));
        return h(
          'div',
          {
            class: 'flex table-operations',
            style: { justifyContent: align },
          },
          btns,
        );
      },
    });

    // 单元格渲染：USD 金额(string Decimal → $1,234.56,正绿负红,空值 —)
    vxeUI.renderer.add('CellUsd', {
      renderTableDefault(_renderOpts, { column, row }) {
        const value = get(row, column.field) as DecimalInput;
        const sign = decimalSign(value);
        let colorClass = '';
        if (sign !== null && sign !== 0) {
          colorClass = sign > 0 ? 'text-success' : 'text-destructive';
        }
        return h(
          'span',
          { class: ['font-mono', colorClass] },
          formatUsd(value),
        );
      },
    });

    // 单元格渲染：价格(string Decimal → 4 位小数,不着色)
    vxeUI.renderer.add('CellPrice', {
      renderTableDefault(_renderOpts, { column, row }) {
        const value = get(row, column.field) as DecimalInput;
        return h('span', { class: 'font-mono' }, formatPrice(value));
      },
    });

    // 单元格渲染：bps(数值 → `450 bps`,按阈值着色,props: { warn?, danger? })
    vxeUI.renderer.add('CellBps', {
      renderTableDefault({ props }, { column, row }) {
        const value = get(row, column.field) as DecimalInput | number;
        const decimal = parseDecimal(
          typeof value === 'number' ? String(value) : value,
        );
        let colorClass = '';
        if (decimal !== null) {
          const { danger, warn } = (props ?? {}) as {
            danger?: number;
            warn?: number;
          };
          if (danger !== undefined && decimal.gte(danger)) {
            colorClass = 'text-destructive';
          } else if (warn !== undefined && decimal.gte(warn)) {
            colorClass = 'text-yellow-500';
          }
        }
        return h(
          'span',
          { class: ['font-mono', colorClass] },
          formatBps(value),
        );
      },
    });

    // 单元格渲染：百分比(0–1 string → 68.5%,props: { fractionDigits? })
    vxeUI.renderer.add('CellPercent', {
      renderTableDefault({ props }, { column, row }) {
        const value = get(row, column.field) as DecimalInput;
        const fractionDigits = (props as Recordable<any>)?.fractionDigits ?? 1;
        return h(
          'span',
          { class: 'font-mono' },
          formatPercent(value, fractionDigits),
        );
      },
    });

    // 单元格渲染：composite ranking score(string Decimal → grouped 2dp)
    vxeUI.renderer.add('CellScore', {
      renderTableDefault(_renderOpts, { column, row }) {
        const value = get(row, column.field) as DecimalInput;
        return h('span', { class: 'font-mono' }, formatScore(value));
      },
    });

    // 单元格渲染：执行模式(dry_run/paper/live → Tag + enum.executionMode.*)
    vxeUI.renderer.add('CellExecutionMode', {
      renderTableDefault(_renderOpts, { column, row }) {
        const value = get(row, column.field) as null | string | undefined;
        if (!value) {
          return h('span', {}, EMPTY_PLACEHOLDER);
        }
        const key = `enum.executionMode.${value}`;
        return h(
          Tag,
          { color: EXECUTION_MODE_COLOR[value] ?? 'default' },
          { default: () => ($te(key) ? $t(key) : value) },
        );
      },
    });

    // 单元格渲染：熔断器状态(状态点 + Tag + enum.breakerState.*)
    vxeUI.renderer.add('CellBreakerState', {
      renderTableDefault(_renderOpts, { column, row }) {
        const value = get(row, column.field) as null | string | undefined;
        if (!value) {
          return h('span', {}, EMPTY_PLACEHOLDER);
        }
        const key = `enum.breakerState.${value}`;
        const dot = h('span', {
          class: [
            'inline-block size-2 rounded-full',
            BREAKER_STATE_DOT_CLASS[value] ?? 'bg-gray-400',
          ],
        });
        return h(
          Tag,
          { color: BREAKER_STATE_COLOR[value] ?? 'default' },
          {
            default: () => [
              h('span', { class: 'inline-flex items-center gap-1' }, [
                dot,
                h('span', {}, $te(key) ? $t(key) : value),
              ]),
            ],
          },
        );
      },
    });

    // 单元格渲染：MarketId(0x… 66 位截断,hover 全量,点击复制)
    vxeUI.renderer.add('CellMarketId', {
      renderTableDefault(_renderOpts, { column, row }) {
        const value = get(row, column.field) as null | string | undefined;
        if (!value) {
          return h('span', {}, EMPTY_PLACEHOLDER);
        }
        async function copy(event: MouseEvent) {
          event.stopPropagation();
          try {
            await navigator.clipboard.writeText(value as string);
            message.success($t('common.copied'));
          } catch {
            // Clipboard unavailable (insecure context); copy silently fails.
          }
        }
        return h(
          Tooltip,
          { title: value },
          {
            default: () =>
              h(
                'span',
                { class: 'cursor-pointer font-mono', onClick: copy },
                truncateHexId(value),
              ),
          },
        );
      },
    });

    // 单元格渲染：时间(ISO → 本地时区 YYYY-MM-DD HH:mm:ss,hover 显示 UTC)
    vxeUI.renderer.add('CellDateTime', {
      renderTableDefault(_renderOpts, { column, row }) {
        const value = get(row, column.field) as null | string | undefined;
        if (!value) {
          return h('span', {}, EMPTY_PLACEHOLDER);
        }
        return h(
          Tooltip,
          { title: formatDateTimeUtc(value) },
          { default: () => h('span', {}, formatDateTimeLocal(value)) },
        );
      },
    });

    // 这里可以自行扩展 vxe-table 的全局配置，比如自定义格式化
    // vxeUI.formats.add
  },
  useVbenForm,
});

/** Standard oxide grid toolbar: refresh, fullscreen (zoom), column settings. */
export const OXIDE_GRID_TOOLBAR_CONFIG = {
  custom: true,
  refresh: { code: 'query' },
  zoom: true,
} as const;

export const useVbenVxeGrid = <T extends Record<string, any>>(
  options: Parameters<typeof useGrid<T, ComponentType, ComponentPropsMap>>[0],
) => {
  const { gridOptions, ...rest } = options;
  const toolbarConfig = gridOptions?.toolbarConfig;

  return useGrid<T, ComponentType, ComponentPropsMap>({
    ...rest,
    gridOptions: gridOptions
      ? {
          ...gridOptions,
          toolbarConfig:
            toolbarConfig?.enabled === false
              ? toolbarConfig
              : {
                  ...OXIDE_GRID_TOOLBAR_CONFIG,
                  ...toolbarConfig,
                },
        }
      : { toolbarConfig: OXIDE_GRID_TOOLBAR_CONFIG },
  });
};

/** Payload delivered by the `CellOperation` renderer to page-level handlers. */
export type OnActionClickParams<T = Recordable<any>> = {
  code: string;
  extra?: Recordable<any>;
  row: T;
};

/** Row-action dispatch callback consumed by `useColumns(onActionClick)` factories. */
export type OnActionClickFn<T = Recordable<any>> = (
  params: OnActionClickParams<T>,
) => void;

export type * from '@vben/plugins/vxe-table';
