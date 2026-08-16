import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const runIds = process.argv.slice(2);
if (
  runIds.length !== 2 ||
  runIds.some((runId) => !/^[a-z0-9-]+$/.test(runId))
) {
  throw new Error(
    'usage: node scripts/compare-ui-release-manifests.mjs <run-a> <run-b>',
  );
}

async function readManifest(runId) {
  const path = resolve(
    'apps/web-antdv-next/test-results/ui-release-closure',
    runId,
    'manifest.json',
  );
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  if (manifest.entries.length !== 51) {
    throw new Error(
      `${runId} contains ${manifest.entries.length} screenshots, expected 51`,
    );
  }
  return manifest;
}

function stableEntry(entry) {
  return {
    canonicalization: entry.canonicalization,
    data_revision: entry.data_revision,
    locale: entry.locale,
    project: entry.project,
    scenario: entry.scenario,
    sha256: entry.sha256,
    theme: entry.theme,
    timezone: entry.timezone,
    viewport: entry.viewport,
  };
}

function stableContract(manifest) {
  return {
    backend_build_id: manifest.backend_build_id,
    entries: manifest.entries.map((entry) => stableEntry(entry)),
    frontend_build_id: manifest.frontend_build_id,
    git_hash: manifest.git_hash,
    schema_version: manifest.schema_version,
    seed_revision: manifest.seed_revision,
  };
}

const [first, second] = await Promise.all(
  runIds.map((runId) => readManifest(runId)),
);
const firstContract = JSON.stringify(stableContract(first));
const secondContract = JSON.stringify(stableContract(second));
if (firstContract !== secondContract) {
  const secondEntries = new Map(
    second.entries.map((entry) => [
      `${entry.project}/${entry.scenario}`,
      entry,
    ]),
  );
  const differingEntries = first.entries
    .filter((entry) => {
      const candidate = secondEntries.get(`${entry.project}/${entry.scenario}`);
      return (
        !candidate ||
        JSON.stringify(stableEntry(entry)) !==
          JSON.stringify(stableEntry(candidate))
      );
    })
    .map((entry) => `${entry.project}/${entry.scenario}`);
  throw new Error(
    `fresh-boot UI release manifests differ in scenario, data revision, or canonical screenshot SHA-256: ${differingEntries.join(', ')}`,
  );
}

process.stdout.write(
  'UI release manifests contain the same 51 scenarios, data revision, and canonical screenshot SHA-256 values.\n',
);
