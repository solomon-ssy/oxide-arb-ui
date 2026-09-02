import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  runRelease,
  verifyBackendCompletion,
} from './run-ui-release-closure.mjs';

const directories = new Set();
const nonce = '00000000-0000-4000-8000-000000000001';

afterEach(async () => {
  await Promise.all(
    [...directories].map((path) => rm(path, { force: true, recursive: true })),
  );
  directories.clear();
  vi.unstubAllEnvs();
});

async function proof(report) {
  const directory = await mkdtemp(join(tmpdir(), 'backend-proof-test-'));
  directories.add(directory);
  const reportPath = join(directory, 'completion.json');
  if (report !== undefined) await writeFile(reportPath, JSON.stringify(report));
  return reportPath;
}

async function playwrightConfig(overrides = {}) {
  vi.resetModules();
  vi.doMock('playwright/test', () => ({
    defineConfig: (config) => config,
    devices: {
      'Desktop Chrome': { defaultBrowserType: 'chromium' },
      'Pixel 7': { defaultBrowserType: 'chromium', isMobile: true },
    },
  }));
  for (const [name, value] of Object.entries({
    PLAYWRIGHT_PRODUCTION_FIXTURE: 'governed-feedback',
    PLAYWRIGHT_EXTERNAL_SERVERS: 'false',
    PLAYWRIGHT_BACKEND_COMPLETION_PATH: '/tmp/owned-backend-completion.json',
    PLAYWRIGHT_BACKEND_COMPLETION_NONCE: nonce,
    PLAYWRIGHT_EVIDENCE_RUN: `single-${nonce}`,
    NO_PROXY: process.env.NO_PROXY,
    no_proxy: process.env.no_proxy,
    ...overrides,
  }))
    vi.stubEnv(name, value);
  const configuration = await import('../playwright.config.ts');
  return configuration.default;
}

describe('backend readiness watchdog', () => {
  afterEach(() => {
    vi.doUnmock('playwright/test');
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it.each([
    ['governed-feedback', 10],
    ['feedback-closure', 187],
    ['feedback-closure-recovery', 202],
  ])('preserves the %s orchestration budget', async (fixture, minutes) => {
    const config = await playwrightConfig({
      PLAYWRIGHT_PRODUCTION_FIXTURE: fixture,
    });
    expect(Array.isArray(config.webServer)).toBe(true);
    const backend = config.webServer[0];
    expect(backend.timeout).toBe(minutes * 60_000);
    expect(backend.command).toContain(`--fixture ${fixture}`);
    expect(backend.url).toBe('http://127.0.0.1:8089/ready');
    expect(backend.command).toContain(`--verification-nonce ${nonce}`);
  });

  it('binds external workers to the host nonce and proof path without starting another backend', async () => {
    const config = await playwrightConfig({
      PLAYWRIGHT_EXTERNAL_SERVERS: 'true',
    });
    expect(config.webServer).toBeUndefined();
    expect(process.env.PLAYWRIGHT_BACKEND_COMPLETION_NONCE).toBe(nonce);
    expect(process.env.PLAYWRIGHT_BACKEND_COMPLETION_PATH).toBe(
      '/tmp/owned-backend-completion.json',
    );
  });

  it.each([
    [{ PLAYWRIGHT_BACKEND_COMPLETION_NONCE: undefined }, /supplied together/],
    [{ PLAYWRIGHT_BACKEND_COMPLETION_PATH: undefined }, /supplied together/],
    [
      {
        PLAYWRIGHT_BACKEND_COMPLETION_PATH: undefined,
        PLAYWRIGHT_BACKEND_COMPLETION_NONCE: undefined,
      },
      /managed runner/,
    ],
    [
      { PLAYWRIGHT_BACKEND_COMPLETION_NONCE: 'not-the-real-nonce' },
      /must be a UUID/,
    ],
    [
      { PLAYWRIGHT_BACKEND_COMPLETION_PATH: 'relative.json' },
      /absolute proof path/,
    ],
    [{ PLAYWRIGHT_EVIDENCE_RUN: undefined }, /PLAYWRIGHT_EVIDENCE_RUN/],
  ])(
    'rejects an incomplete or invalid invocation identity %j',
    async (overrides, error) => {
      await expect(playwrightConfig(overrides)).rejects.toThrow(error);
    },
  );
});

describe('backend completion verification', () => {
  it.each([
    ['missing', undefined],
    ['pending', { status: 'pending', verification_nonce: nonce }],
    [
      'failed',
      {
        error: 'strict runtime log failed after drain',
        status: 'failed',
        verification_nonce: nonce,
      },
    ],
    ['wrong nonce', { status: 'succeeded', verification_nonce: 'other' }],
    [
      'contradictory success',
      { error: 'failure', status: 'succeeded', verification_nonce: nonce },
    ],
  ])('rejects %s even when Playwright exits zero', async (_name, report) => {
    await expect(
      verifyBackendCompletion({
        exitCode: 0,
        nonce,
        reportPath: await proof(report),
      }),
    ).rejects.toThrow(/ENOENT|Backend completion|Backend success/);
  });

  it('rejects a failed Playwright exit despite backend success', async () => {
    await expect(
      verifyBackendCompletion({
        exitCode: 1,
        nonce,
        reportPath: await proof({
          status: 'succeeded',
          verification_nonce: nonce,
        }),
      }),
    ).rejects.toThrow('Playwright failed');
  });

  it('accepts only a matching terminal backend success and zero Playwright exit', async () => {
    await expect(
      verifyBackendCompletion({
        exitCode: 0,
        nonce,
        reportPath: await proof({
          status: 'succeeded',
          verification_nonce: nonce,
        }),
      }),
    ).resolves.toBeUndefined();
  });

  it('never starts round two after failed backend cleanup', async () => {
    const run = vi.fn(async (_args, env) => {
      directories.add(dirname(env.PLAYWRIGHT_BACKEND_COMPLETION_PATH));
      await writeFile(
        env.PLAYWRIGHT_BACKEND_COMPLETION_PATH,
        JSON.stringify({
          error: 'owned cleanup failed',
          status: 'failed',
          verification_nonce: env.PLAYWRIGHT_BACKEND_COMPLETION_NONCE,
        }),
      );
      return 0;
    });
    await expect(runRelease({ run })).rejects.toThrow('owned cleanup failed');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('requires two unique fresh proofs before comparing manifests', async () => {
    const proofs = [];
    const run = vi.fn(async (args, env) => {
      if (args[0].endsWith('compare-ui-release-manifests.mjs')) return 0;
      directories.add(dirname(env.PLAYWRIGHT_BACKEND_COMPLETION_PATH));
      expect(env.PLAYWRIGHT_EXTERNAL_SERVERS).toBe('false');
      expect(env.PLAYWRIGHT_PRODUCTION_FIXTURE).toBe('governed-feedback');
      expect(args).toContain('--update-snapshots=none');
      proofs.push([
        env.PLAYWRIGHT_BACKEND_COMPLETION_PATH,
        env.PLAYWRIGHT_BACKEND_COMPLETION_NONCE,
      ]);
      await writeFile(
        env.PLAYWRIGHT_BACKEND_COMPLETION_PATH,
        JSON.stringify({
          status: 'succeeded',
          verification_nonce: env.PLAYWRIGHT_BACKEND_COMPLETION_NONCE,
        }),
      );
      return 0;
    });
    const runs = await runRelease({ run });
    expect(run).toHaveBeenCalledTimes(3);
    expect(proofs[0][0]).not.toBe(proofs[1][0]);
    expect(proofs[0][1]).not.toBe(proofs[1][1]);
    expect(run.mock.calls[2][0].slice(1)).toEqual(
      runs.flatMap(({ runId, verificationNonce, reportPath }) => [
        runId,
        verificationNonce,
        reportPath,
      ]),
    );
    expect(runs[0].runId).toBe(`run-1-${runs[0].verificationNonce}`);
    expect(runs[1].runId).toBe(`run-2-${runs[1].verificationNonce}`);
    const invocation = JSON.parse(
      await readFile(join(dirname(proofs[0][0]), 'invocation.json'), 'utf8'),
    );
    expect(invocation.runs).toEqual(runs);
  });

  it('keeps direct single-run filters while requiring its actual backend terminal proof', async () => {
    const filters = ['--project=functional-chromium', '--grep=portfolio'];
    const run = vi.fn(async (_args, env) => {
      directories.add(dirname(env.PLAYWRIGHT_BACKEND_COMPLETION_PATH));
      await writeFile(
        env.PLAYWRIGHT_BACKEND_COMPLETION_PATH,
        JSON.stringify({
          status: 'succeeded',
          verification_nonce: env.PLAYWRIGHT_BACKEND_COMPLETION_NONCE,
        }),
      );
      return 0;
    });
    const runs = await runRelease({ run, singleRun: true, args: filters });
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0][0].slice(1)).toEqual([
      'test',
      '--update-snapshots=none',
      ...filters,
    ]);
    expect(runs).toHaveLength(1);
    expect(runs[0].runId).toBe(`single-${runs[0].verificationNonce}`);
    expect(run.mock.calls[0][1].PLAYWRIGHT_EVIDENCE_RUN).toBe(runs[0].runId);
  });

  it('rejects direct single-run success when its backend proof is missing', async () => {
    const run = vi.fn(async (_args, env) => {
      directories.add(dirname(env.PLAYWRIGHT_BACKEND_COMPLETION_PATH));
      return 0;
    });
    await expect(
      runRelease({ run, singleRun: true, args: ['--grep=portfolio'] }),
    ).rejects.toThrow(/ENOENT/);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('does not let filters override the complete two-run release contract', async () => {
    const run = vi.fn();
    await expect(
      runRelease({ run, args: ['--grep=portfolio'] }),
    ).rejects.toThrow('does not accept filters');
    expect(run).not.toHaveBeenCalled();
  });
});
