import { ENUM_CATALOG } from '@vben/types';

import { describe, expect, it } from 'vitest';

import { i18n } from '#/locales';
import { enumOption, enumOptions } from '#/shared/presentation/enum-options';

import enEnum from './langs/en-US/enum.json';
import enPage from './langs/en-US/page.json';
import zhEnum from './langs/zh-CN/enum.json';
import zhPage from './langs/zh-CN/page.json';

type LocaleTree = Record<string, unknown>;

function localeLeaves(
  value: unknown,
  path: string[] = [],
): Array<readonly [string, string]> {
  if (typeof value === 'string') {
    return [[path.join('.'), value]];
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`Locale leaf ${path.join('.')} must be a string`);
  }
  return Object.entries(value).flatMap(([key, child]) =>
    localeLeaves(child, [...path, key]),
  );
}

function leafKeys(value: LocaleTree): string[] {
  return localeLeaves(value).map(([key]) => key);
}

function installAppLocale(locale: 'en-US' | 'zh-CN') {
  const messages =
    locale === 'en-US'
      ? { enum: enEnum, page: enPage }
      : { enum: zhEnum, page: zhPage };
  i18n.global.setLocaleMessage(locale, messages);
  i18n.global.locale.value = locale;
}

const factories = Object.keys(ENUM_CATALOG).map(
  (name) =>
    [name, () => enumOptions(name as keyof typeof ENUM_CATALOG)] as const,
);

describe('application locale contract', () => {
  it('keeps canonical enum translation keys identical in both locales', () => {
    expect(leafKeys(zhEnum).toSorted()).toEqual(leafKeys(enEnum).toSorted());
  });

  it('provides every English page key in the Chinese locale', () => {
    const chineseKeys = new Set(leafKeys(zhPage));
    expect(leafKeys(enPage).filter((key) => !chineseKeys.has(key))).toEqual([]);
  });

  it.each([
    ['en-US', enEnum, enPage],
    ['zh-CN', zhEnum, zhPage],
  ] as const)('contains only non-empty %s locale leaves', (_, ...trees) => {
    for (const tree of trees) {
      expect(
        localeLeaves(tree).filter(([, value]) => value.trim().length === 0),
      ).toEqual([]);
    }
  });

  it.each(['en-US', 'zh-CN'] as const)(
    'renders every registered tag option without leaking an i18n key in %s',
    (locale) => {
      installAppLocale(locale);
      for (const [, factory] of factories) {
        const options = factory();
        expect(options.length).toBeGreaterThan(0);
        expect(new Set(options.map(({ value }) => value)).size).toBe(
          options.length,
        );
        for (const option of options) {
          expect(option.label.trim()).not.toBe('');
          expect(option.label.startsWith('enum.')).toBe(false);
        }
      }
    },
  );

  it.each([
    ['en-US', 'Unknown: venue_added_without_ui_release'],
    ['zh-CN', '未知值：venue_added_without_ui_release'],
  ] as const)(
    'keeps unknown wire values fail-visible in %s',
    (locale, label) => {
      installAppLocale(locale);
      expect(
        enumOption(
          enumOptions('MarketStatus'),
          'venue_added_without_ui_release',
        ),
      ).toEqual({
        color: 'error',
        enumName: 'MarketStatus',
        label,
        value: 'venue_added_without_ui_release',
      });
    },
  );
});
