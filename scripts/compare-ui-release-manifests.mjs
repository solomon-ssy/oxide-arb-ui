import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PNG } from 'pngjs';

import { verifyBackendCompletion } from './run-ui-release-closure.mjs';
import { RELEASE_SCENARIO_KEYS } from './ui-release-contract.ts';

const uiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const expectedContainedAlert = {
  affects_trading: true,
  category: 'trading_safety',
  dedupe_secs: 900,
  idempotency_key: 'quant-report-health:no-current',
  level: 'critical',
  message:
    'No global current Published authority exists; new entry is unavailable.',
  source: 'scheduler',
  title: 'No current recommendation report',
  visible_toast: true,
};

export async function readReleaseManifest({ runId, verificationNonce }) {
  if (!/^[a-z0-9-]+$/.test(runId))
    throw new Error('Invalid release evidence run id');
  if (
    !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/.test(verificationNonce ?? '')
  )
    throw new Error('Expected backend nonce is required');
  const path = resolve(
    uiRoot,
    'apps/web-antdv-next/test-results/ui-release-closure',
    runId,
    'manifest.json',
  );
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  if (manifest.run_id !== runId)
    throw new Error('Release run identity differs from this invocation');
  if (manifest.backend_verification_nonce !== verificationNonce)
    throw new Error('Release backend nonce differs from this invocation');
  if (!Array.isArray(manifest.entries))
    throw new Error('Release scenario contract is missing');
  const keys = manifest.entries
    .map((entry) => `${entry.project}/${entry.scenario}`)
    .toSorted();
  if (
    new Set(keys).size !== 51 ||
    JSON.stringify(keys) !== JSON.stringify(RELEASE_SCENARIO_KEYS)
  )
    throw new Error(
      'Release scenario contract requires the exact 51 unique project/scenario keys',
    );
  const runRoot = dirname(path);
  for (const entry of manifest.entries) {
    if (
      entry.semantic_guard !== 'verified-fault-clean-capture' ||
      typeof entry.semantic_evidence !== 'string' ||
      typeof entry.semantic_sha256 !== 'string'
    ) {
      throw new Error(
        `${runId}/${entry.scenario} has no required semantic capture evidence`,
      );
    }
    for (const [pathField, hashField] of [
      ['raw_screenshot', 'raw_sha256'],
      ['screenshot', 'sha256'],
    ]) {
      if (
        typeof entry[pathField] !== 'string' ||
        typeof entry[hashField] !== 'string' ||
        !/^[\da-f]{64}$/.test(entry[hashField])
      ) {
        throw new Error('Required PNG evidence path or SHA-256 is missing');
      }
      const pngPath = resolve(uiRoot, entry[pathField]);
      if (!pngPath.startsWith(`${runRoot}/`))
        throw new Error('PNG evidence escaped its release run');
      const pngBytes = await readFile(pngPath);
      if (
        createHash('sha256').update(pngBytes).digest('hex') !== entry[hashField]
      )
        throw new Error(`PNG evidence hash mismatch: ${entry[pathField]}`);
      // A digest alone must not let a non-image masquerade as screenshot evidence.
      try {
        PNG.sync.read(pngBytes);
      } catch (error) {
        throw new Error(`Invalid PNG evidence: ${entry[pathField]}`, {
          cause: error,
        });
      }
    }
    const semanticPath = resolve(uiRoot, entry.semantic_evidence);
    if (!semanticPath.startsWith(`${runRoot}/`))
      throw new Error('Semantic evidence escaped its release run');
    const bytes = await readFile(semanticPath);
    if (
      createHash('sha256').update(bytes).digest('hex') !== entry.semantic_sha256
    )
      throw new Error('Semantic evidence hash mismatch');
    const semantic = JSON.parse(bytes.toString());
    if (
      semantic.snapshot_policy?.update_snapshots !== 'none' ||
      semantic.snapshot_policy?.ignore_snapshots !== false
    )
      throw new Error(
        'Release semantic snapshot policy did not compare an unchanged reviewed golden',
      );
    if (
      semantic.run_id !== runId ||
      semantic.backend_verification_nonce !== verificationNonce
    )
      throw new Error(
        'Release semantic invocation differs from its expected run and backend nonce',
      );
    const witness = semantic.notice_witness;
    if (
      semantic.guard !== entry.semantic_guard ||
      semantic.raw_sha256 !== entry.raw_sha256 ||
      semantic.project !== entry.project ||
      semantic.scenario !== entry.scenario ||
      !witness ||
      witness.initial_notice_count !== 0 ||
      witness.mutation_count !== 0 ||
      witness.overflow !== false ||
      !Array.isArray(witness.notices) ||
      witness.notices.length > 0
    ) {
      throw new Error(
        `${runId}/${entry.scenario} does not prove notice-free captured pixels`,
      );
    }
    const evidence = semantic.evidence;
    if (
      !evidence ||
      evidence.unexpected_critical_count !== 0 ||
      !Array.isArray(evidence.expected_fault_witnesses) ||
      !Array.isArray(evidence.observed_system_alerts)
    )
      throw new Error('Invalid semantic alert evidence');
    for (const fault of evidence.expected_fault_witnesses) validateFault(fault);
    for (const alert of evidence.observed_system_alerts) {
      const event = alert.event;
      if (
        !event ||
        typeof event !== 'object' ||
        Object.keys(event).toSorted().join(',') !==
          Object.keys(expectedContainedAlert).toSorted().join(',') ||
        typeof event.idempotency_key !== 'string' ||
        typeof event.title !== 'string' ||
        typeof event.message !== 'string' ||
        typeof event.visible_toast !== 'boolean' ||
        typeof event.affects_trading !== 'boolean' ||
        !Number.isSafeInteger(event.dedupe_secs) ||
        event.dedupe_secs < 0 ||
        !['critical', 'emergency', 'info', 'warning'].includes(event.level) ||
        typeof alert.timestamp !== 'string' ||
        Number.isNaN(Date.parse(alert.timestamp))
      ) {
        throw new Error(
          'Release evidence lost the actual system.alert identity or payload',
        );
      }
      if (
        typeof alert.expected !== 'boolean' ||
        (!alert.expected &&
          ['critical', 'emergency'].includes(alert.event?.level))
      ) {
        throw new Error('Unexpected critical alert in release evidence');
      }
      if (alert.expected) {
        if (
          !Object.keys(expectedContainedAlert).every(
            (key) => event[key] === expectedContainedAlert[key],
          )
        )
          throw new Error(
            'Expected alert payload differs from its exact Browser fault contract',
          );
        validateFault(alert.witness);
        if (
          typeof alert.validated_at !== 'string' ||
          typeof alert.received_at !== 'string' ||
          Number.isNaN(Date.parse(alert.validated_at)) ||
          Number.isNaN(Date.parse(alert.received_at)) ||
          Date.parse(alert.validated_at) < Date.parse(alert.received_at)
        ) {
          throw new Error(
            'Expected alert lacks a fresh post-arrival fault verification',
          );
        }
        if (
          alert.acknowledged_at !== null &&
          (typeof alert.acknowledged_at !== 'string' ||
            Number.isNaN(Date.parse(alert.acknowledged_at)) ||
            Date.parse(alert.acknowledged_at) < Date.parse(alert.received_at))
        ) {
          throw new Error('Expected alert has an invalid user acknowledgement');
        }
      }
    }
  }
  return manifest;
}

function validateFault(fault) {
  if (
    !fault ||
    fault.kind !== 'browser_parity_containment' ||
    fault.current_published_reports !== 0 ||
    fault.latch_open !== true ||
    fault.report_status !== 'revoked' ||
    typeof fault.report_id !== 'string' ||
    typeof fault.sampled_run_id !== 'string' ||
    typeof fault.latch_run_id !== 'string' ||
    !['failed', 'mismatched'].includes(fault.sampled_status) ||
    !['failed', 'mismatched'].includes(fault.latch_run_status) ||
    ['observed_at', 'revoked_at', 'sampled_containment_completed_at'].some(
      (field) =>
        typeof fault[field] !== 'string' ||
        Number.isNaN(Date.parse(fault[field])),
    ) ||
    fault.report_status_reason !==
      `feature parity containment for run ${fault.sampled_run_id}`
  ) {
    throw new Error(
      'Expected alert lacks the exact Browser containment witness',
    );
  }
}

function stableEntry(entry) {
  return {
    canonicalization: entry.canonicalization,
    data_revision: entry.data_revision,
    locale: entry.locale,
    project: entry.project,
    scenario: entry.scenario,
    semantic_guard: entry.semantic_guard,
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

export async function compareReleaseRuns(runs) {
  if (
    runs.some(
      ({ reportPath }) =>
        typeof reportPath !== 'string' || !isAbsolute(reportPath),
    )
  )
    throw new Error(
      'Release comparison requires explicit absolute backend proof paths',
    );
  if (
    runs.length !== 2 ||
    new Set(runs.map(({ runId }) => runId)).size !== 2 ||
    new Set(runs.map(({ verificationNonce }) => verificationNonce)).size !==
      2 ||
    new Set(runs.map(({ reportPath }) => resolve(reportPath))).size !== 2
  )
    throw new Error(
      'Release comparison requires two distinct invocation identities',
    );
  for (const { verificationNonce, reportPath } of runs)
    await verifyBackendCompletion({
      exitCode: 0,
      nonce: verificationNonce,
      reportPath,
    });
  const [first, second] = await Promise.all(
    runs.map((run) => readReleaseManifest(run)),
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
        const candidate = secondEntries.get(
          `${entry.project}/${entry.scenario}`,
        );
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
    'UI release manifests contain the same 51 scenarios, data revision, canonical screenshot SHA-256 values, and verified semantic capture guards.\n',
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  if (args.length !== 6)
    throw new Error(
      'usage: node scripts/compare-ui-release-manifests.mjs <run-a> <nonce-a> <proof-a> <run-b> <nonce-b> <proof-b>',
    );
  await compareReleaseRuns([
    { runId: args[0], verificationNonce: args[1], reportPath: args[2] },
    { runId: args[3], verificationNonce: args[4], reportPath: args[5] },
  ]);
}
