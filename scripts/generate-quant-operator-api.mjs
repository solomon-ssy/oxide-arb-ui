import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import addFormats from 'ajv-formats';
import Ajv2020 from 'ajv/dist/2020.js';
import standaloneCode from 'ajv/dist/standalone/index.js';
import { compileFromFile } from 'json-schema-to-typescript';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const uiRoot = resolve(scriptDir, '..');
const repositoryRoot = resolve(uiRoot, '..');
const schemaPath = resolve(
  repositoryRoot,
  'schema/api/quant-operator-v1.schema.json',
);
const generatedRoot = resolve(uiRoot, 'packages/types/src/generated');
const outputPath = resolve(generatedRoot, 'quant-operator-api.ts');
const validatorsPath = resolve(
  generatedRoot,
  'quant-operator-api-validators.ts',
);
const checkOnly = process.argv.includes('--check');
const temporaryRoot = checkOnly
  ? await mkdtemp(resolve(uiRoot, '.quant-operator-api-check-'))
  : undefined;
const generatedSchemaPath = temporaryRoot
  ? resolve(temporaryRoot, 'quant-operator-v1.schema.json')
  : schemaPath;
const generatedOutputPath = temporaryRoot
  ? resolve(temporaryRoot, 'quant-operator-api.ts')
  : outputPath;
const generatedValidatorsPath = temporaryRoot
  ? resolve(temporaryRoot, 'quant-operator-api-validators.ts')
  : validatorsPath;

const schemaId = 'quant-pivot/quant-operator-api';
const integerFormatBounds = {
  int32: [-2_147_483_648, 2_147_483_647],
  int64: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  uint32: [0, 4_294_967_295],
  uint64: [0, Number.MAX_SAFE_INTEGER],
};

function normalizeIntegerFormats(value) {
  if (Array.isArray(value)) {
    for (const item of value) normalizeIntegerFormats(item);
    return;
  }
  if (!value || typeof value !== 'object') return;
  const bounds = integerFormatBounds[value.format];
  if (bounds) {
    delete value.format;
    value.minimum = Math.max(value.minimum ?? bounds[0], bounds[0]);
    value.maximum = Math.min(value.maximum ?? bounds[1], bounds[1]);
  }
  for (const child of Object.values(value)) normalizeIntegerFormats(child);
}

function compileStandaloneValidators(schema) {
  const runtimeSchema = structuredClone(schema);
  runtimeSchema.$id = schemaId;
  normalizeIntegerFormats(runtimeSchema);
  const ajv = new Ajv2020({
    allErrors: true,
    code: { esm: true, source: true },
    strict: true,
  });
  addFormats(ajv);
  ajv.addSchema(runtimeSchema);
  const source = standaloneCode(ajv, {
    validateAccountSnapshot: `${schemaId}#/$defs/AccountSnapshotView`,
    validateCreateIntent: `${schemaId}#/$defs/CreateIntentRequest`,
    validateEquitySnapshot: `${schemaId}#/$defs/EquitySnapshotView`,
    validateExecutionConfirmation: `${schemaId}#/$defs/OrderIntentView`,
    validateIncentiveEvent: `${schemaId}#/$defs/VenueIncentiveEventView`,
    validateIncentiveReconciliation: `${schemaId}#/$defs/IncentiveReconciliationView`,
    validateLiveAccount: `${schemaId}#/$defs/LiveAccountView`,
    validateRecommendation: `${schemaId}#/$defs/QuantRecommendationView`,
    validateReportDetail: `${schemaId}#/$defs/QuantReportDetailView`,
    validateReportDiff: `${schemaId}#/$defs/ReportDiffView`,
    validateReportListRow: `${schemaId}#/$defs/QuantReportView`,
  })
    .replaceAll('require("ajv/dist/runtime/ucs2length").default', 'ucs2Length')
    .replaceAll(
      'require("ajv-formats/dist/formats").fullFormats',
      'fullFormats',
    );
  if (/\brequire\s*\(/u.test(source)) {
    throw new Error(
      'Ajv emitted an unsupported CommonJS runtime helper; extend the explicit ESM conversion before generating browser code.',
    );
  }
  return `/* oxlint-disable */
// @ts-nocheck -- generated Ajv standalone validation code
import formatRuntime from 'ajv-formats/dist/formats.js';
import ucs2LengthRuntime from 'ajv/dist/runtime/ucs2length.js';
const fullFormats = formatRuntime.fullFormats ?? formatRuntime.default?.fullFormats;
const ucs2Length = typeof ucs2LengthRuntime === 'function'
  ? ucs2LengthRuntime
  : ucs2LengthRuntime.default;
${source}`;
}

try {
  execFileSync(
    'cargo',
    [
      'run',
      '-q',
      '-p',
      'quant-pivot-xtask',
      '--',
      'quant-operator-api-schema',
      '--output',
      generatedSchemaPath,
    ],
    { cwd: repositoryRoot, stdio: 'inherit' },
  );

  const generated = await compileFromFile(generatedSchemaPath, {
    additionalProperties: false,
    bannerComment: `/**
 * This file is generated from the Rust operator API DTO contract.
 * Run \`pnpm generate:quant-operator-api\`; do not edit it by hand.
 */`,
    enableConstEnums: false,
    style: {
      semi: true,
      singleQuote: true,
      trailingComma: 'all',
    },
    unknownAny: true,
  });
  const schemaJson = await readFile(generatedSchemaPath, 'utf8');
  const validators = compileStandaloneValidators(JSON.parse(schemaJson));

  await mkdir(dirname(generatedOutputPath), { recursive: true });
  await writeFile(generatedOutputPath, generated, 'utf8');
  await writeFile(generatedValidatorsPath, validators, 'utf8');
  execFileSync('pnpm', ['exec', 'eslint', '--fix', generatedOutputPath], {
    cwd: uiRoot,
    stdio: 'inherit',
  });
  execFileSync('pnpm', ['exec', 'oxfmt', generatedOutputPath], {
    cwd: uiRoot,
    stdio: 'inherit',
  });
  execFileSync('pnpm', ['exec', 'oxfmt', generatedValidatorsPath], {
    cwd: uiRoot,
    stdio: 'inherit',
  });

  if (checkOnly) {
    const [
      expectedSchema,
      actualSchema,
      expectedTypes,
      actualTypes,
      expectedValidators,
      actualValidators,
    ] = await Promise.all([
      readFile(schemaPath, 'utf8'),
      readFile(generatedSchemaPath, 'utf8'),
      readFile(outputPath, 'utf8'),
      readFile(generatedOutputPath, 'utf8'),
      readFile(validatorsPath, 'utf8'),
      readFile(generatedValidatorsPath, 'utf8'),
    ]);
    const staleArtifacts = [];
    if (expectedSchema !== actualSchema) staleArtifacts.push(schemaPath);
    if (expectedTypes !== actualTypes) staleArtifacts.push(outputPath);
    if (expectedValidators !== actualValidators) {
      staleArtifacts.push(validatorsPath);
    }
    if (staleArtifacts.length > 0) {
      throw new Error(
        `Operator API generated artifacts are stale: ${staleArtifacts.join(', ')}. Run pnpm generate:quant-operator-api.`,
      );
    }
    console.log(
      'Operator API Rust schema, TypeScript, and standalone validators are in sync',
    );
  } else {
    console.log(`generated ${outputPath}`);
    console.log(`generated ${validatorsPath}`);
  }
} finally {
  if (temporaryRoot) await rm(temporaryRoot, { force: true, recursive: true });
}
