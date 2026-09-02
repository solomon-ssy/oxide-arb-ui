import type {
  ConfigResourceKind,
  PolicyDocument,
  RuntimeFieldDescriptor,
} from '@vben/types/config-api';

import { createApp, nextTick } from 'vue';

import { describe, expect, it, vi } from 'vitest';

import RuntimeResourceEditor from './runtime-resource-editor.vue';

vi.mock('#/locales', () => ({
  $t: (key: string) => key,
  $te: () => false,
  i18n: { global: { locale: { value: 'zh-CN' } } },
}));

vi.mock('antdv-next', () => ({
  Button: 'button',
  Checkbox: 'input',
  Input: 'input',
  InputNumber: 'input',
  Select: 'select',
  Tag: 'span',
  Tooltip: 'span',
}));

const resources: ConfigResourceKind[] = [
  'recommendation_policy',
  'execution_risk_policy',
  'model_routing',
  'report_schedule',
  'operations_policy',
  'execution_authorization_policy',
];

const firstGroup: Record<ConfigResourceKind, string> = {
  execution_authorization_policy: 'policy_automatic_limits',
  execution_risk_policy: 'portfolio/budget',
  model_routing: 'model/buy_routes',
  operations_policy: 'outcome_reconciliation',
  recommendation_policy: 'selection',
  report_schedule: 'schedules',
};

function descriptor(
  pointer: string,
  order: number,
  group: string,
): RuntimeFieldDescriptor {
  return {
    apply_effect: 'report_run_claim',
    bounds: {},
    control: 'text',
    description: `Description for ${pointer}`,
    documentation_url: 'docs/runtime-config.md',
    enum_values: [],
    group,
    order,
    pointer,
    read_only: false,
    required: true,
    risk_level: 'medium',
    title: pointer,
    write_only: false,
  };
}

function editorFixture(
  props: InstanceType<typeof RuntimeResourceEditor>['$props'],
) {
  const host = document.createElement('div');
  document.body.append(host);
  return { app: createApp(RuntimeResourceEditor, { ...props }), host };
}

describe('runtime resource descriptor coverage', () => {
  it('renders risk levels through canonical semantic chips', async () => {
    const riskTones = {
      critical: 'danger',
      high: 'warning',
      low: 'neutral',
      medium: 'running',
    } as const;
    const fields = Object.keys(riskTones).map((level, index) => ({
      ...descriptor(`/${level}`, index, 'selection'),
      risk_level: level as RuntimeFieldDescriptor['risk_level'],
    }));
    const { app, host } = editorFixture({
      fields,
      modelValue: {} as PolicyDocument['document'],
      resource: 'recommendation_policy',
    });

    try {
      app.mount(host);
      await nextTick();

      for (const [level, tone] of Object.entries(riskTones)) {
        const field = host.querySelector(`[data-config-pointer="/${level}"]`);
        const chip = field?.querySelector<HTMLElement>('.qp-status-chip');
        expect(chip?.dataset.tone).toBe(tone);
        expect(chip?.textContent).toBe(`page.config.riskLevel.${level}`);
        expect(field?.querySelector('.ant-tag')).toBeNull();
      }
    } finally {
      app.unmount();
      host.remove();
    }
  });

  for (const resource of resources) {
    it(`renders every ${resource} pointer exactly once`, async () => {
      const fields = [
        descriptor('/alpha', 0, firstGroup[resource]),
        descriptor('/beta', 1, firstGroup[resource]),
      ];
      const { app, host } = editorFixture({
        fields,
        modelValue: {
          alpha: 'a',
          beta: 'b',
        } as unknown as PolicyDocument['document'],
        resource,
      });

      try {
        app.mount(host);
        await nextTick();
        const rendered = [
          ...host.querySelectorAll<HTMLElement>('[data-config-pointer]'),
        ].map((element) => element.dataset.configPointer);
        expect(rendered).toEqual(fields.map((field) => field.pointer));
        expect(new Set(rendered).size).toBe(rendered.length);
      } finally {
        app.unmount();
        host.remove();
      }
    });
  }
});
