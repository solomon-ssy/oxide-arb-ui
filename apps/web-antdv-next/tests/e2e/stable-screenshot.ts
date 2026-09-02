import type { Buffer } from 'node:buffer';
import type { Page } from 'playwright/test';

import type { BrowserFailureAudit } from './browser-failure-audit';
import type { NoticeCaptureWitness } from './notice-capture-witness';

import { performance } from 'node:perf_hooks';

import pixelmatch from 'pixelmatch';
import { expect } from 'playwright/test';
import { PNG } from 'pngjs';

import {
  beginNoticeWitness,
  disposeNoticeWitness,
  finishNoticeWitness,
} from './notice-capture-witness';

type ScreenshotPage = Pick<Page, 'evaluate' | 'screenshot'>;
type SemanticBoundary = Pick<
  BrowserFailureAudit,
  'assertExpectedNotices' | 'assertNoTransientNotices' | 'dismissExpectedAlerts'
>;

export interface SemanticScreenshot {
  image: Buffer;
  notice_witness: NoticeCaptureWitness;
}

export async function flushVisualFrame(page: ScreenshotPage): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolveFrame) => {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolveFrame()),
        );
      }),
  );
}

/** Qualify raw bytes independently of the golden; never retry a golden mismatch. */
export async function captureStableScreenshot(
  page: ScreenshotPage,
  options: Parameters<Page['screenshot']>[0],
  deadline: number,
): Promise<Buffer> {
  const timeout = deadline - performance.now();
  if (timeout <= 0) throw new Error('Screenshot stability deadline expired');
  let previous: ReturnType<typeof PNG.sync.read> | undefined;
  let stable: Buffer | undefined;
  await expect
    .poll(
      async () => {
        await flushVisualFrame(page);
        const remaining = deadline - performance.now();
        if (remaining <= 0)
          throw new Error('Screenshot stability deadline expired');
        const current = await page.screenshot({
          ...options,
          timeout: remaining,
        });
        const pixels = PNG.sync.read(current);
        const matches =
          previous !== undefined &&
          previous.width === pixels.width &&
          previous.height === pixels.height &&
          pixelmatch(
            previous.data,
            pixels.data,
            undefined,
            pixels.width,
            pixels.height,
            {
              checkerboard: false,
              includeAA: false,
              threshold: 0.2,
            },
          ) === 0;
        previous = pixels;
        if (matches) stable = current;
        return matches;
      },
      {
        intervals: [0],
        message:
          'Two consecutive screenshots must have identical dimensions and no significant pixel differences',
        timeout,
      },
    )
    .toBe(true);
  if (!stable) throw new Error('Stable screenshot bytes are missing');
  return stable;
}

/** Discard only captures invalidated by a verified, normally dismissed notice. */
export async function captureSemanticScreenshot(
  page: Page,
  options: Parameters<Page['screenshot']>[0],
  audit: SemanticBoundary,
  deadline: number,
): Promise<SemanticScreenshot> {
  for (;;) {
    if (performance.now() >= deadline)
      throw new Error('UI semantic capture deadline expired');
    await audit.dismissExpectedAlerts(page, deadline);
    await audit.assertNoTransientNotices(page, deadline);
    let screenshot: Buffer | undefined;
    let witness: NoticeCaptureWitness;
    let observing = false;
    try {
      const initial = await beginNoticeWitness(page);
      observing = true;
      if (initial === 0)
        screenshot = await captureStableScreenshot(page, options, deadline);
      witness = await finishNoticeWitness(page);
      observing = false;
    } finally {
      if (observing) await disposeNoticeWitness(page);
    }
    if (
      witness.initial_notice_count > 0 ||
      witness.mutation_count > 0 ||
      witness.overflow
    ) {
      audit.assertExpectedNotices(witness);
      if (!(await audit.dismissExpectedAlerts(page, deadline))) {
        throw new Error(
          'A notice contaminated captured pixels and disappeared without verified user dismissal',
        );
      }
      continue;
    }
    if (await audit.dismissExpectedAlerts(page, deadline)) continue;
    await audit.assertNoTransientNotices(page, deadline);
    if (!screenshot)
      throw new Error('Semantic capture produced no qualified PNG');
    return { image: screenshot, notice_witness: witness };
  }
}
