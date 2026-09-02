// @vitest-environment node
import type { Page } from 'playwright/test';

import { Buffer } from 'node:buffer';
import { performance } from 'node:perf_hooks';

import { PNG } from 'pngjs';
import { describe, expect, it, vi } from 'vitest';

import { captureStableScreenshot } from '../apps/web-antdv-next/tests/e2e/stable-screenshot';

function frame(tone: number, width = 32, height = 16) {
  const image = new PNG({ width, height });
  for (let offset = 0; offset < image.data.length; offset += 4)
    image.data.set([tone, tone, tone, 255], offset);
  return PNG.sync.write(image);
}

function capturedPage(screenshot: ReturnType<typeof vi.fn>) {
  return {
    evaluate: vi.fn().mockResolvedValue(undefined),
    screenshot,
  } as unknown as Pick<Page, 'evaluate' | 'screenshot'>;
}

describe('raw screenshot stability', () => {
  it('returns the exact final B buffer from A, B, B', async () => {
    const final = frame(255);
    const screenshot = vi
      .fn()
      .mockResolvedValueOnce(frame(0))
      .mockResolvedValueOnce(frame(255))
      .mockResolvedValueOnce(final);
    const page = capturedPage(screenshot);
    expect(
      await captureStableScreenshot(
        page,
        { fullPage: true },
        performance.now() + 1000,
      ),
    ).toBe(final);
    expect(screenshot).toHaveBeenCalledTimes(3);
    expect(page.evaluate).toHaveBeenCalledTimes(3);
    let previousTimeout = 1000;
    for (const [options] of screenshot.mock.calls) {
      expect(options.fullPage).toBe(true);
      expect(options.timeout).toBeGreaterThan(0);
      expect(options.timeout).toBeLessThanOrEqual(previousTimeout);
      previousTimeout = options.timeout;
    }
  });

  it('qualifies 18 delta-one pixels and returns the same raw buffer', async () => {
    const first = frame(100);
    const noisy = PNG.sync.read(first);
    for (let pixel = 0; pixel < 18; pixel++) noisy.data[pixel * 4] = 101;
    const final = PNG.sync.write(noisy);
    expect(first.equals(final)).toBe(false);
    const screenshot = vi
      .fn()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(final);
    expect(
      await captureStableScreenshot(
        capturedPage(screenshot),
        {},
        performance.now() + 1000,
      ),
    ).toBe(final);
    expect(screenshot).toHaveBeenCalledTimes(2);
  });

  it('requires exact dimensions even for a uniform color', async () => {
    const final = frame(100, 33);
    const screenshot = vi
      .fn()
      .mockResolvedValueOnce(frame(100))
      .mockResolvedValueOnce(final)
      .mockResolvedValueOnce(final);
    expect(
      await captureStableScreenshot(
        capturedPage(screenshot),
        {},
        performance.now() + 1000,
      ),
    ).toBe(final);
    expect(screenshot).toHaveBeenCalledTimes(3);
  });

  it('does not qualify a visibly moving block', async () => {
    const images = [0, 12].map((left) => {
      const image = PNG.sync.read(frame(255));
      for (let y = 2; y < 12; y++) {
        for (let x = left; x < left + 8; x++)
          image.data.set([0, 0, 0, 255], (y * image.width + x) * 4);
      }
      return PNG.sync.write(image);
    });
    let sequence = 0;
    const screenshot = vi.fn(async () => images[sequence++ % 2]);
    await expect(
      captureStableScreenshot(
        capturedPage(screenshot),
        {},
        performance.now() + 75,
      ),
    ).rejects.toThrow(/timeout|deadline/i);
    expect(screenshot.mock.calls.length).toBeGreaterThan(1);
  });

  it('returns stable wrong pixels without sampling toward the golden', async () => {
    const wrong = frame(0);
    const golden = frame(255);
    const screenshot = vi
      .fn()
      .mockResolvedValueOnce(wrong)
      .mockResolvedValueOnce(wrong)
      .mockResolvedValue(golden);
    const result = await captureStableScreenshot(
      capturedPage(screenshot),
      {},
      performance.now() + 1000,
    );
    expect(result).toBe(wrong);
    expect(result.equals(golden)).toBe(false);
    expect(screenshot).toHaveBeenCalledTimes(2);
  });

  it('propagates invalid PNG data without another capture', async () => {
    const screenshot = vi.fn().mockResolvedValue(Buffer.from('invalid PNG'));
    await expect(
      captureStableScreenshot(
        capturedPage(screenshot),
        {},
        performance.now() + 1000,
      ),
    ).rejects.toThrow('unrecognised content at end of stream');
    expect(screenshot).toHaveBeenCalledTimes(1);
  });

  it('propagates screenshot errors without another capture', async () => {
    const failure = new Error('capture failed');
    const screenshot = vi.fn().mockRejectedValue(failure);
    await expect(
      captureStableScreenshot(
        capturedPage(screenshot),
        {},
        performance.now() + 1000,
      ),
    ).rejects.toBe(failure);
    expect(screenshot).toHaveBeenCalledTimes(1);
  });
});
