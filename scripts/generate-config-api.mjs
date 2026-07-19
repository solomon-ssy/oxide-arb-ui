import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compileFromFile } from 'json-schema-to-typescript';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const uiRoot = resolve(scriptDir, '..');
const repositoryRoot = resolve(uiRoot, '..');
const schemaPath = resolve(repositoryRoot, 'schema/api/config-v1.schema.json');
const outputPath = resolve(
  uiRoot,
  'packages/types/src/generated/config-api.ts',
);

execFileSync(
  'cargo',
  ['run', '-q', '-p', 'quant-pivot-xtask', '--', 'config-api-schema'],
  { cwd: repositoryRoot, stdio: 'inherit' },
);

const generated = await compileFromFile(schemaPath, {
  additionalProperties: false,
  bannerComment: `/**
 * This file is generated from the Rust Config API DTO contract.
 * Run \`pnpm generate:config-api\`; do not edit it by hand.
 */`,
  enableConstEnums: false,
  style: {
    semi: true,
    singleQuote: true,
    trailingComma: 'all',
  },
  unknownAny: true,
});

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, generated, 'utf8');
execFileSync('pnpm', ['exec', 'eslint', '--fix', outputPath], {
  cwd: uiRoot,
  stdio: 'inherit',
});
execFileSync('pnpm', ['exec', 'oxfmt', outputPath], {
  cwd: uiRoot,
  stdio: 'inherit',
});
console.log(`generated ${outputPath}`);
