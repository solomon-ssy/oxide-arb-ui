import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const uiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const projects = [
  'visual-desktop-dark',
  'visual-desktop-light',
  'visual-mobile-dark',
  'visual-tablet-dark',
  'functional-chromium',
];

export async function verifyBackendCompletion({ exitCode, nonce, reportPath }) {
  if (exitCode !== 0)
    throw new Error(`Playwright failed with exit ${exitCode}`);
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  if (report.verification_nonce !== nonce) {
    throw new Error('Backend completion proof belongs to another invocation');
  }
  if (report.status !== 'succeeded') {
    throw new Error(
      `Backend completion is ${report.status}: ${report.error ?? 'terminal success is absent'}`,
    );
  }
  if (
    Object.keys(report).toSorted().join(',') !== 'status,verification_nonce'
  ) {
    throw new Error('Backend success proof contains unexpected fields');
  }
}

async function execute(args, env) {
  const child = spawn(process.execPath, args, {
    cwd: uiRoot,
    env,
    stdio: 'inherit',
  });
  let interrupted = false;
  const forward = (signal) => {
    interrupted = true;
    child.kill(signal);
  };
  const interrupt = () => forward('SIGINT');
  const terminate = () => forward('SIGTERM');
  process.on('SIGINT', interrupt);
  process.on('SIGTERM', terminate);
  try {
    const exitCode = await new Promise((resolveExit, reject) => {
      child.once('error', reject);
      child.once('close', (code) => resolveExit(code));
    });
    if (interrupted) throw new Error('Release verification was interrupted');
    return exitCode;
  } finally {
    process.off('SIGINT', interrupt);
    process.off('SIGTERM', terminate);
  }
}

export async function runRelease({
  run = execute,
  singleRun = false,
  args = [],
} = {}) {
  if (!singleRun && args.length > 0)
    throw new Error(
      'Full release verification does not accept filters; use --once',
    );
  const proofRoot = resolve(uiRoot, 'test-results');
  await mkdir(proofRoot, { recursive: true });
  const proofDirectory = await mkdtemp(
    resolve(proofRoot, 'backend-completion-'),
  );
  console.log(`Backend completion evidence: ${proofDirectory}`);
  const runs = Array.from({ length: singleRun ? 1 : 2 }, (_, index) => {
    const verificationNonce = randomUUID();
    return {
      runId: `${singleRun ? 'single' : `run-${index + 1}`}-${verificationNonce}`,
      verificationNonce,
      reportPath: resolve(proofDirectory, `run-${index + 1}.json`),
    };
  });
  await writeFile(
    resolve(proofDirectory, 'invocation.json'),
    `${JSON.stringify({ runs }, null, 2)}\n`,
    { flag: 'wx' },
  );
  for (const { runId, verificationNonce: nonce, reportPath } of runs) {
    const env = {
      ...process.env,
      PLAYWRIGHT_BACKEND_COMPLETION_PATH: reportPath,
      PLAYWRIGHT_BACKEND_COMPLETION_NONCE: nonce,
      PLAYWRIGHT_BACKEND_URL: 'http://127.0.0.1:8088',
      PLAYWRIGHT_BASE_URL: 'http://127.0.0.1:6099',
      PLAYWRIGHT_EVIDENCE_RUN: runId,
      PLAYWRIGHT_EXTERNAL_SERVERS: 'false',
      PLAYWRIGHT_PRODUCTION_FIXTURE: singleRun
        ? (process.env.PLAYWRIGHT_PRODUCTION_FIXTURE ?? 'governed-feedback')
        : 'governed-feedback',
    };
    const exitCode = await run(
      [
        resolve(uiRoot, 'node_modules/playwright/cli.js'),
        'test',
        '--update-snapshots=none',
        ...(singleRun
          ? args
          : projects.map((project) => `--project=${project}`)),
      ],
      env,
    );
    // Playwright may report success despite a webServer teardown failure.
    // Its process must close before inspecting the backend's durable proof.
    await verifyBackendCompletion({ exitCode, nonce, reportPath });
  }
  if (singleRun) return runs;
  const exitCode = await run(
    [
      resolve(uiRoot, 'scripts/compare-ui-release-manifests.mjs'),
      ...runs.flatMap(({ runId, verificationNonce, reportPath }) => [
        runId,
        verificationNonce,
        reportPath,
      ]),
    ],
    process.env,
  );
  if (exitCode !== 0)
    throw new Error(`Release manifest comparison failed with exit ${exitCode}`);
  return runs;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  const singleRun = args[0] === '--once';
  runRelease({ singleRun, args: singleRun ? args.slice(1) : args }).catch(
    (error) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
