import { describe, expect, it } from 'vitest';

import {
  collectLocalIconCollections,
  extractLocalIconNames,
  renderRegistrationModule,
} from './local-icon-collections';

describe('local icon collections', () => {
  it('extracts only supported Iconify literals', () => {
    const names = extractLocalIconNames(`
      const status = 'lucide:wifi';
      const shell = "ep:fold";
      const custom = 'svg:avatar-1';
      const permission = 'config:read';
    `);

    expect(
      [...names.entries()].map(([prefix, icons]) => [prefix, [...icons]]),
    ).toEqual([
      ['lucide', ['wifi']],
      ['ep', ['fold']],
    ]);
  });

  it('builds a complete local registry for operator-console sources', async () => {
    const report = await collectLocalIconCollections();
    const collections = new Map(
      report.collections.map((collection) => [collection.prefix, collection]),
    );

    expect([...report.iconNames.keys()].toSorted()).toEqual([
      'ant-design',
      'ep',
      'fluent-mdl2',
      'lucide',
      'mdi',
    ]);
    const lucideNames = report.iconNames.get('lucide');
    expect(lucideNames?.size).toBeGreaterThan(80);
    expect(lucideNames).toContain('layout-dashboard');
    expect(lucideNames).toContain('wifi');
    expect(collections.get('lucide')).toMatchObject({
      aliases: { 'loader-2': { parent: 'loader-circle' } },
      icons: {
        'loader-circle': expect.objectContaining({ body: expect.any(String) }),
      },
    });
    for (const [prefix, names] of report.iconNames) {
      const collection = collections.get(prefix);
      expect(collection, `missing collection ${prefix}`).toBeDefined();
      const registered = new Set([
        ...Object.keys(collection?.aliases ?? {}),
        ...Object.keys(collection?.icons ?? {}),
      ]);
      for (const name of names) {
        expect(registered, `missing local icon ${prefix}:${name}`).toContain(
          name,
        );
      }
    }

    const moduleCode = renderRegistrationModule(report.collections);
    expect(moduleCode).not.toMatch(
      /api\.iconify\.design|api\.simplesvg\.com|api\.unisvg\.com/,
    );
    expect(moduleCode).toContain('registerLocalIconCollection');
  });
});
