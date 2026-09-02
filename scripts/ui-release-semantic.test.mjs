// @vitest-environment node
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PNG } from 'pngjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  compareReleaseRuns,
  readReleaseManifest,
} from './compare-ui-release-manifests.mjs';
import { RELEASE_SCENARIOS } from './ui-release-contract.ts';

vi.mock('node:fs/promises', async (importOriginal) => ({
  ...(await importOriginal()),
  readFile: vi.fn(),
}));
const uiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runId = 'semantic-contract-test';
const nonce = '00000000-0000-4000-8000-000000000001';
const runRoot = resolve(
  uiRoot,
  'apps/web-antdv-next/test-results/ui-release-closure',
  runId,
);
const files = new Map();
const timestamp = '2026-08-31T12:00:00.000Z';
const hash = (value) => createHash('sha256').update(value).digest('hex');

function png(tone) {
  const image = new PNG({ width: 16, height: 8 });
  for (let offset = 0; offset < image.data.length; offset += 4)
    image.data.set([tone, tone, tone, 255], offset);
  return PNG.sync.write(image);
}

beforeEach(() => {
  files.clear();
  vi.mocked(readFile).mockImplementation(async (path, encoding) => {
    const value = files.get(String(path));
    if (value === undefined) throw new Error(`missing evidence: ${path}`);
    return encoding === 'utf8' ? value : Buffer.from(value);
  });
});

function fixture(
  change = () => {},
  { evidenceRunId = runId, backendNonce = nonce } = {},
) {
  const evidenceRoot = resolve(
    uiRoot,
    'apps/web-antdv-next/test-results/ui-release-closure',
    evidenceRunId,
  );
  const fault = {
    current_published_reports: 0,
    kind: 'browser_parity_containment',
    latch_open: true,
    latch_run_id: 'full',
    latch_run_status: 'mismatched',
    observed_at: timestamp,
    report_id: 'report',
    report_status: 'revoked',
    report_status_reason: 'feature parity containment for run sampled',
    revoked_at: timestamp,
    sampled_containment_completed_at: timestamp,
    sampled_run_id: 'sampled',
    sampled_status: 'mismatched',
  };
  const event = {
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
  const scenarios = Object.entries(RELEASE_SCENARIOS).flatMap(
    ([project, names]) => names.map((scenario) => ({ project, scenario })),
  );
  const entries = scenarios.map(({ project, scenario }, index) => {
    const raw = png(100);
    const canonical = png(101);
    const entry = {
      project,
      raw_screenshot: `apps/web-antdv-next/test-results/ui-release-closure/${evidenceRunId}/${project}/${scenario}.raw.png`,
      raw_sha256: hash(raw),
      screenshot: `apps/web-antdv-next/test-results/ui-release-closure/${evidenceRunId}/${project}/${scenario}.png`,
      sha256: hash(canonical),
      scenario,
      semantic_evidence: `apps/web-antdv-next/test-results/ui-release-closure/${evidenceRunId}/${project}/${scenario}.semantic.json`,
      semantic_guard: 'verified-fault-clean-capture',
      semantic_sha256: '',
    };
    const semantic = {
      backend_verification_nonce: backendNonce,
      evidence: {
        expected_fault_witnesses: [structuredClone(fault)],
        observed_system_alerts: [
          {
            acknowledged_at: timestamp,
            event: structuredClone(event),
            expected: true,
            received_at: timestamp,
            timestamp,
            validated_at: timestamp,
            witness: structuredClone(fault),
          },
        ],
        unexpected_critical_count: 0,
      },
      guard: entry.semantic_guard,
      notice_witness: {
        initial_notice_count: 0,
        mutation_count: 0,
        notices: [],
        overflow: false,
      },
      project: entry.project,
      raw_sha256: entry.raw_sha256,
      run_id: evidenceRunId,
      snapshot_policy: { update_snapshots: 'none', ignore_snapshots: false },
      scenario,
    };
    if (index === 0) change(entry, semantic);
    if (typeof entry.raw_screenshot === 'string')
      files.set(resolve(uiRoot, entry.raw_screenshot), raw);
    if (typeof entry.screenshot === 'string')
      files.set(resolve(uiRoot, entry.screenshot), canonical);
    const value = JSON.stringify(semantic);
    if (typeof entry.semantic_evidence === 'string')
      files.set(resolve(uiRoot, entry.semantic_evidence), value);
    entry.semantic_sha256 = hash(value);
    return entry;
  });
  files.set(
    resolve(evidenceRoot, 'manifest.json'),
    JSON.stringify({
      run_id: evidenceRunId,
      backend_verification_nonce: backendNonce,
      entries,
    }),
  );
  const reportPath = resolve(evidenceRoot, 'backend-completion.json');
  files.set(
    reportPath,
    JSON.stringify({ status: 'succeeded', verification_nonce: backendNonce }),
  );
  return { runId: evidenceRunId, verificationNonce: backendNonce, reportPath };
}

describe('mandatory release semantic evidence', () => {
  it('accepts exact fault identity, post-arrival verification, and a zero-mutation capture', async () => {
    fixture();
    const manifest = await readReleaseManifest({
      runId,
      verificationNonce: nonce,
    });
    expect(manifest.entries).toHaveLength(51);
  });

  it.each(['semantic_guard', 'semantic_evidence'])(
    'rejects a missing %s without an older-manifest fallback',
    async (field) => {
      fixture((entry) => {
        Reflect.deleteProperty(entry, field);
      });
      await expect(
        readReleaseManifest({ runId, verificationNonce: nonce }),
      ).rejects.toThrow('required semantic capture evidence');
    },
  );

  it.each(['initial_notice_count', 'mutation_count'])(
    'rejects nonzero %s despite matching pixels',
    async (field) => {
      fixture((_entry, semantic) => {
        semantic.notice_witness[field] = 1;
      });
      await expect(
        readReleaseManifest({ runId, verificationNonce: nonce }),
      ).rejects.toThrow('notice-free captured pixels');
    },
  );

  it('rejects an unknown critical alert even when the declared count lies', async () => {
    fixture((_entry, semantic) => {
      semantic.evidence.observed_system_alerts[0].expected = false;
    });
    await expect(
      readReleaseManifest({ runId, verificationNonce: nonce }),
    ).rejects.toThrow('Unexpected critical alert');
  });

  it('rejects initial-only alert witnesses', async () => {
    fixture((_entry, semantic) => {
      semantic.evidence.observed_system_alerts[0].validated_at = null;
    });
    await expect(
      readReleaseManifest({ runId, verificationNonce: nonce }),
    ).rejects.toThrow('post-arrival');
  });

  it('rejects a different backend reason under the same expected alert id', async () => {
    fixture((_entry, semantic) => {
      semantic.evidence.observed_system_alerts[0].event.message =
        'another cause';
    });
    await expect(
      readReleaseManifest({ runId, verificationNonce: nonce }),
    ).rejects.toThrow('exact Browser fault contract');
  });

  it('rejects a cleared latch masquerading as the expected fault', async () => {
    fixture((_entry, semantic) => {
      semantic.evidence.expected_fault_witnesses[0].latch_open = false;
    });
    await expect(
      readReleaseManifest({ runId, verificationNonce: nonce }),
    ).rejects.toThrow('exact Browser containment witness');
  });

  it('binds the semantic witness to the actual raw PNG hash', async () => {
    fixture((_entry, semantic) => {
      semantic.raw_sha256 = 'b'.repeat(64);
    });
    await expect(
      readReleaseManifest({ runId, verificationNonce: nonce }),
    ).rejects.toThrow('notice-free captured pixels');
  });

  it('rejects changed semantic bytes and escaped artifact paths', async () => {
    fixture();
    const path = resolve(
      runRoot,
      'visual-desktop-dark/page-dashboard.semantic.json',
    );
    files.set(path, `${files.get(path)} `);
    await expect(
      readReleaseManifest({ runId, verificationNonce: nonce }),
    ).rejects.toThrow('hash mismatch');
    fixture((entry) => {
      entry.semantic_evidence = '../outside.semantic.json';
    });
    await expect(
      readReleaseManifest({ runId, verificationNonce: nonce }),
    ).rejects.toThrow('escaped its release run');
  });
});

describe('release invocation identity', () => {
  it.each(['all', 'changed', 'missing', 'ignored'])(
    'rejects %s snapshot policy even if candidate artifacts are relabeled',
    async (mode) => {
      fixture((_entry, semantic) => {
        semantic.snapshot_policy = {
          update_snapshots: mode === 'ignored' ? 'none' : mode,
          ignore_snapshots: mode === 'ignored',
        };
      });
      await expect(
        readReleaseManifest({ runId, verificationNonce: nonce }),
      ).rejects.toThrow('snapshot policy');
    },
  );
  it('does not infer an expected nonce from the manifest itself', async () => {
    fixture();
    await expect(readReleaseManifest({ runId })).rejects.toThrow(
      'Expected backend nonce is required',
    );
  });
  it.each([
    'wrong-run',
    'duplicate-keys',
    'foreign-scenario',
    'wrong-backend-nonce',
  ])('rejects %s even when every artifact is valid', async (mutation) => {
    fixture();
    const path = resolve(runRoot, 'manifest.json');
    const manifest = JSON.parse(files.get(path));
    if (mutation === 'wrong-run') manifest.run_id = 'old-run';
    if (mutation === 'duplicate-keys')
      manifest.entries = Array.from({ length: 51 }, () => manifest.entries[0]);
    if (mutation === 'foreign-scenario') {
      const entry = manifest.entries[0];
      entry.scenario = 'unreviewed-scenario';
      const semanticPath = resolve(uiRoot, entry.semantic_evidence);
      const semantic = JSON.parse(files.get(semanticPath));
      semantic.scenario = entry.scenario;
      const value = JSON.stringify(semantic);
      files.set(semanticPath, value);
      entry.semantic_sha256 = hash(value);
    }
    if (mutation === 'wrong-backend-nonce')
      manifest.backend_verification_nonce =
        '00000000-0000-4000-8000-000000000002';
    files.set(path, JSON.stringify(manifest));
    await expect(
      readReleaseManifest({ runId, verificationNonce: nonce }),
    ).rejects.toThrow(/run identity|scenario contract|backend nonce/);
  });

  it.each(['run_id', 'backend_verification_nonce'])(
    'rejects a semantic artifact from a different %s',
    async (field) => {
      fixture((_entry, semantic) => {
        semantic[field] = 'old-invocation';
      });
      await expect(
        readReleaseManifest({ runId, verificationNonce: nonce }),
      ).rejects.toThrow('semantic invocation');
    },
  );
});

describe('completed fresh release identity', () => {
  function runs() {
    return [
      fixture(),
      fixture(undefined, {
        evidenceRunId: 'semantic-contract-second',
        backendNonce: '00000000-0000-4000-8000-000000000002',
      }),
    ];
  }

  it('requires exact current artifacts and two distinct Succeeded backend proofs', async () => {
    await expect(compareReleaseRuns(runs())).resolves.toBeUndefined();
  });

  it.each(['missing', 'pending', 'wrong-nonce'])(
    'rejects %s backend proof despite a complete valid screenshot set',
    async (kind) => {
      const descriptors = runs();
      const first = descriptors[0];
      files.delete(first.reportPath);
      if (kind === 'pending')
        files.set(
          first.reportPath,
          JSON.stringify({
            status: 'pending',
            verification_nonce: first.verificationNonce,
          }),
        );
      if (kind === 'wrong-nonce')
        files.set(
          first.reportPath,
          JSON.stringify({
            status: 'succeeded',
            verification_nonce: descriptors[1].verificationNonce,
          }),
        );
      await expect(compareReleaseRuns(descriptors)).rejects.toThrow(
        /missing evidence|Backend completion/,
      );
    },
  );

  it('rejects reuse of an entire old pair despite new Succeeded backend proofs', async () => {
    const previous = runs();
    const current = previous.map((old, index) => {
      const verificationNonce = `00000000-0000-4000-8000-00000000000${index + 3}`;
      const currentRunId = `run-${index + 1}-${verificationNonce}`;
      const previousRoot = resolve(
        uiRoot,
        'apps/web-antdv-next/test-results/ui-release-closure',
        old.runId,
      );
      const currentRoot = resolve(
        uiRoot,
        'apps/web-antdv-next/test-results/ui-release-closure',
        currentRunId,
      );
      for (const [path, contents] of files) {
        if (path.startsWith(`${previousRoot}/`))
          files.set(path.replace(previousRoot, currentRoot), contents);
      }
      const reportPath = resolve(currentRoot, 'backend-completion.json');
      files.set(
        reportPath,
        JSON.stringify({
          status: 'succeeded',
          verification_nonce: verificationNonce,
        }),
      );
      return { runId: currentRunId, verificationNonce, reportPath };
    });
    await expect(compareReleaseRuns(current)).rejects.toThrow(
      'Release run identity',
    );
  });

  it.each(['verificationNonce', 'runId', 'reportPath'])(
    'rejects reused %s identity',
    async (field) => {
      const descriptors = runs();
      descriptors[1][field] = descriptors[0][field];
      await expect(compareReleaseRuns(descriptors)).rejects.toThrow(
        'two distinct invocation identities',
      );
    },
  );
});

describe.each([
  [
    'raw_screenshot',
    'raw_sha256',
    'visual-desktop-dark/page-dashboard.raw.png',
  ],
  ['screenshot', 'sha256', 'visual-desktop-dark/page-dashboard.png'],
])('required PNG bytes for %s', (pathField, hashField, filename) => {
  it('rejects a missing PNG despite valid semantic evidence', async () => {
    fixture();
    files.delete(resolve(runRoot, filename));
    await expect(
      readReleaseManifest({ runId, verificationNonce: nonce }),
    ).rejects.toThrow('missing evidence');
  });

  it('rejects changed PNG bytes despite valid manifest hashes', async () => {
    fixture();
    files.set(resolve(runRoot, filename), png(0));
    await expect(
      readReleaseManifest({ runId, verificationNonce: nonce }),
    ).rejects.toThrow('PNG evidence hash mismatch');
  });

  it('rejects a hash belonging to a different PNG', async () => {
    fixture((entry) => {
      entry[hashField] = hash(png(255));
    });
    await expect(
      readReleaseManifest({ runId, verificationNonce: nonce }),
    ).rejects.toThrow('PNG evidence hash mismatch');
  });

  it('rejects a PNG path outside the current release run', async () => {
    fixture((entry) => {
      entry[pathField] = '../outside.png';
    });
    await expect(
      readReleaseManifest({ runId, verificationNonce: nonce }),
    ).rejects.toThrow('PNG evidence escaped its release run');
  });

  it('rejects non-PNG bytes even when their hash is correct', async () => {
    const invalid = Buffer.from('not a PNG');
    fixture((entry, semantic) => {
      entry[hashField] = hash(invalid);
      semantic.raw_sha256 = entry.raw_sha256;
    });
    files.set(resolve(runRoot, filename), invalid);
    await expect(
      readReleaseManifest({ runId, verificationNonce: nonce }),
    ).rejects.toThrow(/PNG|signature/);
  });
});
