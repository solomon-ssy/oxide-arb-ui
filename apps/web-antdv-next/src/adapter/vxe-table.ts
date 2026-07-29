import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';
import type { Recordable } from '@vben/types';

import type { ComponentPropsMap, ComponentType } from './component';

import type { DecimalInput } from '#/shared/components/format';

import { h } from 'vue';
import { RouterLink } from 'vue-router';

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
          refresh: true,
          refreshOptions: { code: 'query' },
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

    // 单元格渲染： Tag 列表（数组字段）
    vxeUI.renderer.add('CellTags', {
      renderTableDefault({ attrs, options, props }, { column, row }) {
        const values = get(row, column.field);
        const tagOptions = options ?? [];
        const items = Array.isArray(values) ? values : [];
        const emptyLabel = attrs?.emptyLabel ?? EMPTY_PLACEHOLDER;
        const emptyColor = attrs?.emptyColor ?? 'default';

        const tagNodes =
          items.length === 0
            ? [
                h(
                  Tag,
                  { color: emptyColor, ...props },
                  { default: () => emptyLabel },
                ),
              ]
            : items.map((value) => {
                const tagItem = tagOptions.find(
                  (item) => item.value === value,
                ) ?? {
                  color: attrs?.defaultColor ?? 'default',
                  label: value,
                  value,
                };
                return h(
                  Tag,
                  {
                    ...props,
                    ...objectOmit(tagItem, ['label', 'value']),
                  },
                  { default: () => tagItem.label ?? value },
                );
              });

        return h(
          'div',
          {
            class: 'inline-flex flex-wrap items-center justify-center gap-1',
          },
          tagNodes,
        );
      },
    });

    // 单元格渲染： Tag
    vxeUI.renderer.add('CellTag', {
      renderTableDefault({ attrs, options, props }, { column, row }) {
        const value = get(row, column.field);
        const tagOptions = options ?? [
          { color: 'success', label: $t('common.enabled'), value: 1 },
          { color: 'error', label: $t('common.disabled'), value: 0 },
        ];
        let tagItem = tagOptions.find((item) => item.value === value);
        if (!tagItem && attrs?.colorField) {
          const colorKey = String(get(row, attrs.colorField) ?? '');
          tagItem = {
            color:
              attrs.colorMap?.[colorKey] ?? attrs.defaultColor ?? 'default',
            label: value,
            value,
          };
        }
        if (!tagItem) {
          tagItem = {
            color: attrs?.defaultColor ?? 'default',
            label: value,
            value,
          };
        }
        return h(
          Tag,
          {
            ...props,
            ...objectOmit(tagItem, ['label', 'value']),
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
          const accessibleName =
            opt['aria-label'] ??
            (isString(opt.tooltip) ? opt.tooltip : opt.text);

          const baseButton = h(
            Button,
            {
              ...props,
              ...objectOmit(opt, ['dropdown', 'icon', 'text', 'tooltip']),
              'aria-label': accessibleName,
              class: ['min-h-11 min-w-11', props?.class, opt.class],
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
            colorClass = 'text-warning';
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

    // 单元格渲染：可复制文本（点击复制完整值）
    vxeUI.renderer.add('CellCopy', {
      renderTableDefault(_renderOpts, { column, row }) {
        const value = get(row, column.field) as null | string | undefined;
        if (!value) {
          return h('span', {}, EMPTY_PLACEHOLDER);
        }
        const text = value;
        async function copy(event: MouseEvent) {
          event.stopPropagation();
          try {
            await navigator.clipboard.writeText(text);
            message.success($t('common.copied'));
          } catch {
            // Clipboard unavailable.
          }
        }
        const label = value.length > 16 ? `${value.slice(0, 12)}…` : value;
        return h(
          Tooltip,
          { title: value },
          {
            default: () =>
              h(
                'span',
                { class: 'cursor-pointer font-mono text-xs', onClick: copy },
                label,
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

    // 单元格渲染：实体深链(router-link,截断/mono,点击不触发行选中)
    // props: { to: (row) => string, mono?: boolean }
    vxeUI.renderer.add('CellEntityRoute', {
      renderTableDefault({ props }, { column, row }) {
        const value = get(row, column.field) as null | string | undefined;
        if (!value) {
          return h('span', {}, EMPTY_PLACEHOLDER);
        }
        const { mono, to } = (props ?? {}) as {
          mono?: boolean;
          to?: (row: Recordable<any>) => string;
        };
        if (!to) {
          return h('span', {}, value);
        }
        return h(
          RouterLink,
          {
            class: [
              'text-primary hover:underline',
              mono ? 'font-mono text-xs break-all' : '',
            ],
            // Cross-page navigation must not toggle vxe row selection.
            onClick: (event: MouseEvent) => event.stopPropagation(),
            to: to(row),
          },
          { default: () => value },
        );
      },
    });

    // 这里可以自行扩展 vxe-table 的全局配置，比如自定义格式化
    // vxeUI.formats.add
  },
  useVbenForm,
});

/** Standard quant-pivot grid toolbar: refresh, fullscreen (zoom), column settings. */
export const QP_GRID_TOOLBAR_CONFIG = {
  custom: true,
  refresh: true,
  refreshOptions: { code: 'query' },
  zoom: true,
} as const;

type ToolbarConfigRecord = Record<string, unknown>;

function isPlainObject(value: unknown): value is ToolbarConfigRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** vxe-table 4.19+ rejects object-style toolbar flags (refresh/zoom/...). */
function normalizeToolbarConfig<T extends ToolbarConfigRecord>(config: T): T {
  let normalized = config;
  const pairs = [
    ['custom', 'customOptions'],
    ['export', 'exportOptions'],
    ['import', 'importOptions'],
    ['print', 'printOptions'],
    ['refresh', 'refreshOptions'],
    ['zoom', 'zoomOptions'],
  ] as const;

  for (const [flagKey, optionsKey] of pairs) {
    const flag = normalized[flagKey];
    if (!isPlainObject(flag)) {
      continue;
    }
    const options = normalized[optionsKey];
    normalized = {
      ...normalized,
      [flagKey]: true,
      [optionsKey]: {
        ...(isPlainObject(options) ? options : {}),
        ...flag,
      },
    };
  }

  return normalized;
}

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
              : normalizeToolbarConfig({
                  ...QP_GRID_TOOLBAR_CONFIG,
                  ...toolbarConfig,
                }),
        }
      : { toolbarConfig: QP_GRID_TOOLBAR_CONFIG },
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
