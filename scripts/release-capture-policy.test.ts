// @vitest-environment node
import type { Page, TestInfo } from 'playwright/test';

import type { BrowserFailureAudit } from '../apps/web-antdv-next/tests/e2e/browser-failure-audit';

import { Buffer } from 'node:buffer';

import { PNG } from 'pngjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  directories: new Set<string>(),
  files: new Map<string, Buffer | string>(),
  readPaths: [] as string[],
  snapshot: vi.fn(),
  image: undefined as Buffer | undefined,
}));

vi.mock('node:child_process', () => ({
  execFileSync: () => 'fixture-git-hash\n',
}));
vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(async (path: string, options?: { recursive?: boolean }) => {
    if (state.directories.has(path) && !options?.recursive)
      throw Object.assign(new Error('Invocation directory already exists'), {
        code: 'EEXIST',
      });
    state.directories.add(path);
  }),
  readFile: vi.fn(async (path: string, encoding?: string) => {
    state.readPaths.push(path);
    const contents = state.files.get(path);
    if (contents === undefined)
      throw Object.assign(new Error('missing'), { code: 'ENOENT' });
    return encoding === 'utf8' ? contents.toString() : Buffer.from(contents);
  }),
  rename: vi.fn(async (from: string, to: string) => {
    const contents = state.files.get(from);
    if (contents === undefined)
      throw new Error('Temporary manifest is missing');
    state.files.set(to, contents);
    state.files.delete(from);
  }),
  writeFile: vi.fn(async (path: string, contents: Buffer | string) => {
    state.files.set(path, contents);
  }),
}));
vi.mock('../apps/web-antdv-next/tests/e2e/fixtures', () => {
  const assertion = {
    toBe: vi.fn(),
    toBeLessThanOrEqual: vi.fn(),
    toBeVisible: vi.fn(),
    toHaveAttribute: vi.fn(),
    toHaveCount: vi.fn(),
    toMatchSnapshot: state.snapshot,
  };
  return {
    expect: Object.assign(() => assertion, { poll: () => assertion }),
    expectAccessible: vi.fn(async () => {}),
    readApiData: vi.fn(),
    waitForShell: vi.fn(async () => {}),
  };
});
vi.mock('../apps/web-antdv-next/tests/e2e/stable-screenshot', () => ({
  captureSemanticScreenshot: vi.fn(async () => ({
    image: state.image,
    notice_witness: {
      initial_notice_count: 0,
      mutation_count: 0,
      notices: [],
      overflow: false,
    },
  })),
  flushVisualFrame: vi.fn(async () => {}),
}));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('PLAYWRIGHT_EVIDENCE_RUN', 'publication-policy-test');
  vi.stubEnv(
    'PLAYWRIGHT_BACKEND_COMPLETION_NONCE',
    '00000000-0000-4000-8000-000000000001',
  );
  state.files.clear();
  state.directories.clear();
  state.readPaths.length = 0;
  state.snapshot.mockReset();
  const png = new PNG({ width: 32, height: 16 });
  png.data.fill(255);
  state.image = PNG.sync.write(png);
  state.files.set('/reviewed/page-dashboard.png', state.image);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

async function capture(
  updateSnapshots: TestInfo['config']['updateSnapshots'],
  ignoreSnapshots: boolean,
) {
  const locator = {
    first: () => locator,
    evaluate: vi.fn(async () => true),
    click: vi.fn(async () => {}),
  };
  const page = {
    bringToFront: vi.fn(async () => {}),
    evaluate: vi.fn(async () => ({ clientWidth: 32, scrollWidth: 32 })),
    goto: vi.fn(async () => {}),
    locator: () => locator,
    mouse: { move: vi.fn(async () => {}) },
    url: () => 'http://127.0.0.1/dashboard',
    viewportSize: () => ({ width: 32, height: 16 }),
  } as unknown as Page;
  const testInfo = {
    annotations: [],
    attach: vi.fn(async () => {}),
    config: { updateSnapshots },
    project: { name: 'visual-desktop-dark', ignoreSnapshots },
    snapshotPath: () => '/reviewed/page-dashboard.png',
  } as unknown as TestInfo;
  const audit = {
    dismissExpectedAlerts: vi.fn(async () => false),
    drainHttp: vi.fn(async () => {}),
    semanticEvidence: () => ({
      expected_fault_witnesses: [],
      observed_system_alerts: [],
      unexpected_critical_count: 0,
    }),
  } as unknown as BrowserFailureAudit;
  const { captureReleaseEvidence } =
    await import('../apps/web-antdv-next/tests/e2e/release-closure');
  await captureReleaseEvidence({
    audit,
    dataRevision: 3,
    page,
    scenario: { name: 'page-dashboard', path: '/dashboard' },
    seedRevision: 3,
    testInfo,
    theme: 'dark',
  });
  return testInfo;
}

describe('resolved snapshot policy controls release publication', () => {
  it.each([
    ['all', false],
    ['changed', false],
    ['missing', false],
    ['none', true],
  ] as const)(
    'keeps %s/ignore=%s as explicit candidate-only evidence',
    async (updateSnapshots, ignoreSnapshots) => {
      const testInfo = await capture(updateSnapshots, ignoreSnapshots);
      expect(state.snapshot).toHaveBeenCalledOnce();
      expect(
        [...state.files.keys()].some((path) => path.endsWith('/manifest.json')),
      ).toBe(false);
      expect(state.readPaths).not.toContain('/reviewed/page-dashboard.png');
      const semanticPath = [...state.files.keys()].find((path) =>
        path.endsWith('.candidate.semantic.json'),
      );
      if (!semanticPath) throw new Error('Candidate evidence is missing');
      const semantic = JSON.parse(String(state.files.get(semanticPath)));
      expect(semantic.guard).toBe('candidate-not-release-evidence');
      expect(semantic.snapshot_policy).toEqual({
        update_snapshots: updateSnapshots,
        ignore_snapshots: ignoreSnapshots,
      });
      expect(testInfo.annotations[0]?.type).toBe(
        'candidate-not-release-evidence',
      );
      expect(testInfo.attach).toHaveBeenCalledOnce();
    },
  );

  it('publishes reviewed evidence only for resolved none/ignore=false policy', async () => {
    const testInfo = await capture('none', false);
    expect(state.snapshot).toHaveBeenCalledOnce();
    expect(state.snapshot).toHaveBeenCalledWith('page-dashboard.png', {
      maxDiffPixelRatio: 0.002,
      threshold: 0.2,
    });
    expect(state.readPaths).toContain('/reviewed/page-dashboard.png');
    const manifestPath = [...state.files.keys()].find((path) =>
      path.endsWith('/manifest.json'),
    );
    if (!manifestPath) throw new Error('Reviewed manifest is missing');
    const manifest = JSON.parse(String(state.files.get(manifestPath)));
    expect(manifest.entries).toHaveLength(1);
    expect(manifest.entries[0].canonicalization).toBe(
      'reviewed-platform-golden-v1',
    );
    expect(manifest.entries[0].semantic_guard).toBe(
      'verified-fault-clean-capture',
    );
    expect(testInfo.annotations).toEqual([]);
  });

  it('refuses an existing invocation directory without removing its evidence', async () => {
    const { default: initialize } =
      await import('../apps/web-antdv-next/tests/e2e/release-closure');
    await initialize();
    const directory = [...state.directories].find((path) =>
      path.endsWith('/publication-policy-test'),
    );
    if (!directory) throw new Error('Invocation directory was not created');
    const marker = `${directory}/previous-evidence.json`;
    state.files.set(marker, 'preserved');
    await expect(initialize()).rejects.toThrow(
      'Invocation directory already exists',
    );
    expect(state.files.get(marker)).toBe('preserved');
  });
});
