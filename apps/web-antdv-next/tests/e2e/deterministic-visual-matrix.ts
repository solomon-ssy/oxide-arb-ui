import type { Locator, Page } from 'playwright/test';

import { expect, expectAccessible } from './fixtures';

export type EvidenceTheme = 'dark' | 'light';

export interface EvidenceViewport {
  height: number;
  name: string;
  width: number;
}

export interface VisualMatrixOptions {
  mask?: Locator[];
  prepare?: (page: Page) => Promise<void>;
  rootSelector: string;
  state: string;
}

export const EVIDENCE_THEMES: readonly EvidenceTheme[] = ['light', 'dark'];
export const EVIDENCE_VIEWPORTS: readonly EvidenceViewport[] = [
  { height: 844, name: '390x844', width: 390 },
  { height: 1024, name: '768x1024', width: 768 },
  { height: 720, name: '1280x720', width: 1280 },
  { height: 900, name: '1440x900', width: 1440 },
];

const FIXED_EVIDENCE_TIME = new Date('2030-01-15T12:00:00.000Z');
const VISUAL_STABILITY_STYLE_ID = 'playwright-visual-stability';

async function disableVisualMotion(page: Page): Promise<void> {
  await page.evaluate((styleId) => {
    if (document.querySelector(`#${styleId}`)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        scroll-behavior: auto !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
      ::view-transition-old(root), ::view-transition-new(root) {
        animation: none !important;
      }
      .bell-button > span {
        visibility: hidden !important;
      }
    `;
    document.head.append(style);
  }, VISUAL_STABILITY_STYLE_ID);
}

async function flushVisualFrame(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

export async function freezeEvidenceClock(page: Page): Promise<void> {
  // Theme changes use the View Transition API unless reduced motion is
  // requested. Evidence must represent the settled theme, never an
  // intermediate light/dark cross-fade that can also distort axe contrast.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // A fixed origin keeps rendered time deterministic while allowing timers to
  // advance. `setFixedTime` freezes Date.now(), which prevents Ant Design's
  // duration-based loading messages and transitions from ever settling.
  await page.clock.install({ time: FIXED_EVIDENCE_TIME });
}

async function setEvidenceTheme(
  page: Page,
  theme: EvidenceTheme,
): Promise<void> {
  const expectsDark = theme === 'dark';
  const toggle = page.locator('button.theme-toggle').first();
  await expect(toggle).toBeVisible();
  const current = await toggle.evaluate((element) =>
    element.classList.contains('is-light'),
  );
  if (current !== expectsDark) {
    await toggle.evaluate((element: HTMLButtonElement) => element.click());
  }
  await expect
    .poll(async () => {
      const [toggleDark, rootDark] = await Promise.all([
        toggle.evaluate((element) => element.classList.contains('is-light')),
        page.evaluate(() =>
          document.documentElement.classList.contains('dark'),
        ),
      ]);
      return toggleDark === expectsDark && rootDark === expectsDark;
    })
    .toBe(true);
}

async function resetVisualFrame(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo({ left: 0, top: 0 }));
  const drawerBody = page.locator('[role="dialog"]:visible .ant-drawer-body');
  if ((await drawerBody.count()) > 0) {
    await drawerBody.first().evaluate((element) => {
      element.scrollTop = 0;
    });
  }
  await page.locator('body').evaluate((element) => {
    void element.getBoundingClientRect();
  });
}

export async function captureVisualMatrix(
  page: Page,
  options: VisualMatrixOptions,
): Promise<void> {
  await disableVisualMotion(page);
  const menuLoading = page.getByText(/加载菜单中|Loading menu/i);
  const volatile = page.locator('[data-screenshot-volatile="true"]');
  const mask = options.mask ?? [volatile];
  for (const theme of EVIDENCE_THEMES) {
    await page.setViewportSize({ height: 900, width: 1440 });
    await resetVisualFrame(page);
    await setEvidenceTheme(page, theme);
    await flushVisualFrame(page);
    for (const viewport of EVIDENCE_VIEWPORTS) {
      await page.setViewportSize(viewport);
      await resetVisualFrame(page);
      await options.prepare?.(page);
      await expect(page.locator(options.rootSelector).first()).toBeVisible();
      await expectAccessible(page, options.rootSelector);
      const overflow = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(
        overflow.scrollWidth,
        `${options.state}/${theme}/${viewport.name} has horizontal page overflow`,
      ).toBeLessThanOrEqual(overflow.clientWidth + 1);
      // Route generation owns this short-lived shell notification. A visual
      // state can already be business-ready before its 1.5 second dismissal
      // timer completes, so settle it at the screenshot boundary rather than
      // recording an unrelated menu-loading frame.
      await expect(menuLoading).toHaveCount(0, { timeout: 10_000 });
      await flushVisualFrame(page);
      await expect(menuLoading).toHaveCount(0);
      await expect(page).toHaveScreenshot(
        `${viewport.name}-${theme}-${options.state}.png`,
        {
          animations: 'disabled',
          caret: 'hide',
          fullPage: true,
          mask,
          maxDiffPixels: 0,
          scale: 'css',
        },
      );
    }
  }
}
