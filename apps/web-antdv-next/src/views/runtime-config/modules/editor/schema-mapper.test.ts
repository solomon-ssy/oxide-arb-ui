import type { RuntimeConfigSchemaView } from '@vben/types';

import { describe, expect, it } from 'vitest';

import {
  buildDiffs,
  buildFieldIndex,
  buildPatch,
  fieldGridSpan,
  fieldToInputValue,
  hasGovernanceCriticalDiff,
  nodeFieldViews,
  nodeGridSpan,
  normalizeDecimalString,
  structurallyActivePaths,
  topSections,
} from './schema-mapper';
import { fieldStub, uiText } from './test-helpers';

describe('topSections / buildFieldIndex', () => {
  it('returns top-level sections ordered by order and indexes fields by path', () => {
    const schema: RuntimeConfigSchemaView = {
      tree: [
        {
          children: [{ kind: 'field', order: 10, path: 'execution.b' }],
          collapsible: true,
          id: 'execution',
          kind: 'section',
          label: uiText('Execution'),
          order: 80,
        },
        {
          children: [{ kind: 'field', order: 10, path: 'selection.a' }],
          collapsible: true,
          id: 'selection',
          kind: 'section',
          label: uiText('Selection'),
          order: 10,
        },
      ],
      fields: [
        fieldStub({ path: 'execution.b' }),
        fieldStub({ path: 'selection.a' }),
      ],
    };
    const sections = topSections(schema);
    expect(sections.map((section) => section.id)).toEqual([
      'selection',
      'execution',
    ]);
    const index = buildFieldIndex(schema);
    expect(index.get('selection.a')?.path).toBe('selection.a');
    const executionSection = sections.find(
      (section) => section.id === 'execution',
    );
    expect(executionSection).toBeDefined();
    if (executionSection === undefined) {
      throw new Error('execution section missing');
    }
    expect(nodeFieldViews(executionSection, index).map((f) => f.path)).toEqual([
      'execution.b',
    ]);
  });
});

describe('structurallyActivePaths', () => {
  it('includes only the active union case children', () => {
    const section: RuntimeConfigSchemaView['tree'][number] = {
      children: [
        { kind: 'field', order: 10, path: 'x.kind' },
        {
          cases: [
            {
              case_value: 'a',
              children: [{ kind: 'field', order: 10, path: 'x.a_only' }],
            },
            {
              case_value: 'b',
              children: [{ kind: 'field', order: 10, path: 'x.b_only' }],
            },
          ],
          discriminator: 'x.kind',
          kind: 'union',
          order: 20,
        },
      ],
      collapsible: true,
      id: 'x',
      kind: 'section',
      label: uiText('X'),
      order: 10,
    };
    const active = structurallyActivePaths(section, { 'x.kind': 'a' }, {});
    expect(active.has('x.kind')).toBe(true);
    expect(active.has('x.a_only')).toBe(true);
    expect(active.has('x.b_only')).toBe(false);
  });
});

describe('buildDiffs / buildPatch', () => {
  it('emits only dirty leaves and skips unchanged sensitive fields', () => {
    const decimal = fieldStub({
      format: 'decimal',
      path: 'portfolio.budget.total_budget_usd',
      value_type: 'string',
    });
    const secret = fieldStub({
      path: 'notification.telegram.bot_token',
      sensitive: true,
      value_type: 'string',
      widget: 'secret_string',
    });
    const config = {
      notification: { telegram: { bot_token: '***' } },
      portfolio: { budget: { total_budget_usd: '100' } },
    };
    const draft = {
      'notification.telegram.bot_token': '',
      'portfolio.budget.total_budget_usd': '250',
    };
    const diffs = buildDiffs([decimal, secret], config, draft);
    expect(diffs).toHaveLength(1);
    expect(buildPatch(diffs)).toEqual({
      'portfolio.budget.total_budget_usd': '250',
    });
  });
});

describe('hasGovernanceCriticalDiff', () => {
  it('is true only when a diff touches a governance_critical field', () => {
    const critical = fieldStub({
      format: 'decimal',
      path: 'portfolio.budget.total_budget_usd',
      semantics: 'governance_critical',
    });
    const plain = fieldStub({
      format: 'decimal',
      path: 'selection.min_liquidity_usd',
    });
    const config = {
      portfolio: { budget: { total_budget_usd: '100' } },
      selection: { min_liquidity_usd: '5' },
    };
    const criticalDiff = buildDiffs([critical], config, {
      'portfolio.budget.total_budget_usd': '250',
    });
    const plainDiff = buildDiffs([plain], config, {
      'selection.min_liquidity_usd': '9',
    });
    expect(hasGovernanceCriticalDiff(criticalDiff)).toBe(true);
    expect(hasGovernanceCriticalDiff(plainDiff)).toBe(false);
  });
});

describe('normalizeDecimalString', () => {
  it('canonicalizes decimal strings', () => {
    expect(normalizeDecimalString('100.00')).toBe('100');
    expect(normalizeDecimalString(' 0.50 ')).toBe('0.5');
    expect(normalizeDecimalString('')).toBe('');
  });
});

describe('fieldToInputValue', () => {
  it('clones schedule_list values from reactive proxies without DataCloneError', () => {
    const schedules = [
      {
        cadence: { interval_secs: 300, kind: 'interval' },
        enabled: true,
        schedule_id: 'default_interval',
        knowledge_lag_secs: 10,
        top_n: 20,
      },
    ];
    const reactiveSchedules = new Proxy(schedules, {
      get(target, prop, receiver) {
        return Reflect.get(target, prop, receiver);
      },
    });
    const field = fieldStub({
      path: 'reports.schedules',
      value_type: 'array',
      widget: 'schedule_list',
    });
    expect(() => fieldToInputValue(field, reactiveSchedules)).not.toThrow();
    const draft = fieldToInputValue(field, reactiveSchedules);
    expect(draft).toEqual(schedules);
    expect(draft).not.toBe(schedules);
  });
});

describe('fieldGridSpan / nodeGridSpan', () => {
  it('defaults to full row and honors ui_props.col_span', () => {
    const full = fieldStub({ path: 'a' });
    const half = fieldStub({ path: 'b', ui_props: { col_span: 12 } });
    expect(fieldGridSpan(full)).toBe(24);
    expect(fieldGridSpan(half)).toBe(12);
    const index = buildFieldIndex({
      fields: [full, half],
      tree: [],
    });
    expect(nodeGridSpan({ kind: 'field', order: 1, path: 'b' }, index)).toBe(
      12,
    );
    expect(
      nodeGridSpan(
        {
          children: [],
          collapsible: true,
          id: 'nested',
          kind: 'section',
          label: uiText('Nested'),
          order: 1,
        },
        index,
      ),
    ).toBe(24);
  });
});
