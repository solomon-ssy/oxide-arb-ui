import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const VIEWS_ROOT = resolve(process.cwd(), 'apps/web-antdv-next/src/views');

function collectVue(root: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectVue(path));
    } else if (entry.isFile() && path.endsWith('.vue')) {
      files.push(path);
    }
  }
  return files;
}

describe('in-page scroll chaining', () => {
  it('reserves overscroll contain for overlay surfaces, not document views', () => {
    const traps = collectVue(VIEWS_ROOT).filter((path) =>
      /overscroll-behavior:\s*contain/.test(readFileSync(path, 'utf8')),
    );
    expect(traps).toEqual([]);
  });
});
