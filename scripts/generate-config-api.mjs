import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
const checkOnly = process.argv.includes('--check');
const temporaryRoot = checkOnly
  ? await mkdtemp(resolve(uiRoot, '.config-api-check-'))
  : undefined;
const generatedSchemaPath = temporaryRoot
  ? resolve(temporaryRoot, 'config-v1.schema.json')
  : schemaPath;
const generatedOutputPath = temporaryRoot
  ? resolve(temporaryRoot, 'config-api.ts')
  : outputPath;

try {
  execFileSync(
    'cargo',
    [
      'run',
      '-q',
      '-p',
      'quant-pivot-xtask',
      '--',
      'config-api-schema',
      '--output',
      generatedSchemaPath,
    ],
    { cwd: repositoryRoot, stdio: 'inherit' },
  );

  const generated = await compileFromFile(generatedSchemaPath, {
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

  await mkdir(dirname(generatedOutputPath), { recursive: true });
  await writeFile(generatedOutputPath, generated, 'utf8');
  execFileSync('pnpm', ['exec', 'eslint', '--fix', generatedOutputPath], {
    cwd: uiRoot,
    stdio: 'inherit',
  });
  execFileSync('pnpm', ['exec', 'oxfmt', generatedOutputPath], {
    cwd: uiRoot,
    stdio: 'inherit',
  });

  if (checkOnly) {
    const [expectedSchema, actualSchema, expectedTypes, actualTypes] =
      await Promise.all([
        readFile(schemaPath, 'utf8'),
        readFile(generatedSchemaPath, 'utf8'),
        readFile(outputPath, 'utf8'),
        readFile(generatedOutputPath, 'utf8'),
      ]);
    const staleArtifacts = [];
    if (expectedSchema !== actualSchema) staleArtifacts.push(schemaPath);
    if (expectedTypes !== actualTypes) staleArtifacts.push(outputPath);
    if (staleArtifacts.length > 0) {
      throw new Error(
        `Config API generated artifacts are stale: ${staleArtifacts.join(', ')}. Run pnpm generate:config-api.`,
      );
    }
    console.log('Config API Rust schema and generated TypeScript are in sync');
  } else {
    console.log(`generated ${outputPath}`);
  }
} finally {
  if (temporaryRoot) await rm(temporaryRoot, { force: true, recursive: true });
}
