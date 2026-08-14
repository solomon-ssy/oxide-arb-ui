import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const uiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const snapshotDirectory = resolve(
  uiRoot,
  'apps/web-antdv-next/tests/e2e/config-audit.spec.ts-snapshots',
);
const expectedPerPlatform = 50;
const supportedPlatforms = ['darwin', 'linux'];

const files = readdirSync(snapshotDirectory)
  .filter((file) => file.endsWith('.png'))
  .toSorted();
const unexpected = files.filter(
  (file) =>
    !supportedPlatforms.some((platform) => file.endsWith(`-${platform}.png`)),
);
if (unexpected.length > 0) {
  throw new Error(
    `unsupported visual snapshot files: ${unexpected.join(', ')}`,
  );
}

for (const platform of supportedPlatforms) {
  const platformFiles = files.filter((file) =>
    file.endsWith(`-${platform}.png`),
  );
  if (platformFiles.length !== expectedPerPlatform) {
    throw new Error(
      `expected ${expectedPerPlatform} ${platform} snapshots, found ${platformFiles.length}`,
    );
  }
}

const tracked = new Set(
  execFileSync(
    'git',
    [
      'ls-files',
      '--',
      'apps/web-antdv-next/tests/e2e/config-audit.spec.ts-snapshots/*.png',
    ],
    { cwd: uiRoot, encoding: 'utf8' },
  )
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((path) => path.split('/').at(-1)),
);
const untracked = files.filter((file) => !tracked.has(file));
if (untracked.length > 0) {
  throw new Error(`untracked visual snapshots: ${untracked.join(', ')}`);
}

const ignored = spawnSync('git', ['check-ignore', '--stdin'], {
  cwd: uiRoot,
  encoding: 'utf8',
  input: files
    .map(
      (file) =>
        `apps/web-antdv-next/tests/e2e/config-audit.spec.ts-snapshots/${file}`,
    )
    .join('\n'),
});
if (ignored.status === 0 && ignored.stdout.trim() !== '') {
  throw new Error(`ignored visual snapshots: ${ignored.stdout.trim()}`);
}

console.log('visual snapshot inventory is complete and tracked');
