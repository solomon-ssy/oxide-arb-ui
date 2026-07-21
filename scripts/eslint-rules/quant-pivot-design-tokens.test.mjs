import { resolve } from 'node:path';

import vueParser from 'vue-eslint-parser';

import tsParser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import stylelint from 'stylelint';
import { describe, expect, it } from 'vitest';

import plugin from './quant-pivot-design-tokens.mjs';

const rules = {
  'quant-pivot/no-raw-color-literals': 'error',
  'quant-pivot/no-raw-palette-classes': 'error',
};
const stylelintConfigFile = resolve(process.cwd(), 'stylelint.config.mjs');
const stylelintFixture = resolve(
  process.cwd(),
  'apps/web-antdv-next/src/design-token-fixture.vue',
);

function verify(code, filename, parser = tsParser) {
  const linter = new Linter({ configType: 'flat' });
  return linter.verify(
    code,
    {
      files: ['**/*.{js,mjs,cjs,ts,vue}'],
      languageOptions: {
        ecmaVersion: 'latest',
        parser,
        parserOptions:
          parser === vueParser
            ? { parser: tsParser, sourceType: 'module' }
            : { sourceType: 'module' },
      },
      plugins: { 'quant-pivot': plugin },
      rules,
    },
    { filename },
  );
}

describe('quant-pivot design-token ESLint rules', () => {
  it('accepts semantic and visual Tailwind utilities', () => {
    const messages = verify(
      `const classes = 'text-success bg-visual-1/10 border-destructive/30';`,
      'fixture.ts',
    );
    expect(messages).toHaveLength(0);
  });

  it('rejects raw palette utilities through variants and arbitrary opacity', () => {
    const messages = verify(
      `const classes = 'hover:text-red-500 dark:bg-sky-500/[0.08] from-violet-400';`,
      'fixture.ts',
    );
    expect(messages.map(({ ruleId }) => ruleId)).toEqual([
      'quant-pivot/no-raw-palette-classes',
      'quant-pivot/no-raw-palette-classes',
      'quant-pivot/no-raw-palette-classes',
    ]);
  });

  it('checks static and bound Vue class values', () => {
    const messages = verify(
      `<template><div class="text-green-500" :class="'dark:border-rose-400'"></div></template>`,
      'fixture.vue',
      vueParser,
    );
    expect(messages.map(({ ruleId }) => ruleId)).toEqual([
      'quant-pivot/no-raw-palette-classes',
      'quant-pivot/no-raw-palette-classes',
    ]);
  });

  it('rejects renderer literals but accepts CSS variable resolution', () => {
    const messages = verify(
      `const colors = ['#ff4d4f', 'rgb(1 2 3 / 40%)', 'hsl(var(--destructive))'];`,
      'fixture.ts',
    );
    expect(messages.map(({ ruleId }) => ruleId)).toEqual([
      'quant-pivot/no-raw-color-literals',
      'quant-pivot/no-raw-color-literals',
    ]);
  });
});

describe('quant-pivot design-token Stylelint policy', () => {
  it('accepts semantic CSS variables', async () => {
    const result = await stylelint.lint({
      code: '<style>.state { color: hsl(var(--destructive)); }</style>',
      codeFilename: stylelintFixture,
      configFile: stylelintConfigFile,
    });
    expect(result.results[0]?.warnings).toHaveLength(0);
  });

  it('rejects raw hex and rgb declarations', async () => {
    const result = await stylelint.lint({
      code: `<style>
.state {
  color: #dc2626;
  background: rgb(220 38 38 / 10%);
}
</style>`,
      codeFilename: stylelintFixture,
      configFile: stylelintConfigFile,
    });
    expect(result.results[0]?.warnings.map(({ rule }) => rule)).toEqual([
      'color-no-hex',
      'declaration-property-value-disallowed-list',
    ]);
  });
});
