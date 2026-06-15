import type { RuntimeConfigSchemaView } from '@vben/types';

import { describe, expect, it } from 'vitest';

import { groupRuntimeConfigFields } from './schema-mapper';
import { uiText } from './test-helpers';
import { resolveUiText } from './ui-text';

const fixture: RuntimeConfigSchemaView = {
  groups: [
    {
      id: 'settlement',
      label: uiText('Settlement', '结算'),
      order: 10,
    },
  ],
  fields: [
    {
      constraints: {
        enum_values: ['disabled', 'proxy_safe'],
      },
      default: 'disabled',
      description: 'route',
      enum_items: [
        {
          key: 'proxy_safe',
          label: uiText('Gnosis Safe (proxy)', 'Gnosis Safe（代理）'),
        },
      ],
      group: 'settlement',
      help: uiText('Active redemption route', '赎回路由'),
      label: uiText('Active redemption route', '赎回路由'),
      money_critical: true,
      order: 10,
      path: 'settlement.redeem.route',
      sensitive: false,
      value_type: 'enum',
      widget: 'enum_select',
    },
  ],
};

describe('runtime-config schema envelope', () => {
  it('resolves every field label and enum label for both locales', () => {
    for (const field of fixture.fields) {
      expect(resolveUiText(field.label, 'en-US')).not.toBe('');
      expect(resolveUiText(field.label, 'zh-CN')).not.toBe('');
      expect(resolveUiText(field.help, 'zh-CN')).not.toBe('');
      for (const item of field.enum_items ?? []) {
        expect(resolveUiText(item.label, 'zh-CN')).not.toBe('');
      }
    }
  });

  it('groups fields using server metadata', () => {
    const groups = groupRuntimeConfigFields(fixture);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.fields[0]?.path).toBe('settlement.redeem.route');
    expect(resolveUiText(groups[0]?.label, 'zh-CN')).toBe('结算');
  });
});
