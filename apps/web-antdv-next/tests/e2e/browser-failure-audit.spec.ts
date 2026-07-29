import { BrowserFailureAudit } from './browser-failure-audit';
import { expect, test } from './fixtures';

test('shared browser audit captures every hard-fail family', async ({
  baseURL,
  browser,
}) => {
  const context = await browser.newContext({ baseURL });
  const audit = new BrowserFailureAudit();
  try {
    const page = await context.newPage();
    await audit.track(page);
    await page.goto('/auth/login');

    await page.route(
      /\/api\/research\/feedback-overview(?:\?.*)?$/,
      async (route) => {
        await route.abort('aborted');
      },
    );
    await audit.allowRequestFailures(
      [
        {
          errorText: 'net::ERR_ABORTED',
          method: 'GET',
          pathname: '/api/research/feedback-overview',
          search: '',
        },
      ],
      async () => {
        await page.evaluate(() =>
          fetch('/api/research/feedback-overview').catch(() => undefined),
        );
      },
    );
    await audit.settle();
    expect(audit.failures).toEqual([]);

    await page.evaluate(() => {
      console.warn('w3-ui10-console-warning-probe');
      console.error('w3-ui10-console-error-probe');
      setTimeout(() => {
        throw new Error('w3-ui10-pageerror-probe');
      }, 0);
      setTimeout(() => {
        void Promise.reject(new Error('w3-ui10-unhandled-probe'));
      }, 0);
      void fetch('/api/w3-ui10-response-probe').catch(() => undefined);
      void fetch('/api/research/feedback-overview?unexpected=1').catch(
        () => undefined,
      );
      void fetch('http://127.0.0.1:1/w3-ui10-requestfailed-probe').catch(
        () => undefined,
      );
    });

    await expect
      .poll(() => audit.failures, {
        message: 'browser audit did not observe every injected failure family',
      })
      .toEqual(
        expect.arrayContaining([
          expect.stringContaining(
            'console.warning: w3-ui10-console-warning-probe',
          ),
          expect.stringContaining('console.error: w3-ui10-console-error-probe'),
          expect.stringContaining('pageerror: w3-ui10-pageerror-probe'),
          expect.stringContaining('unhandledrejection'),
          expect.stringContaining('w3-ui10-unhandled-probe'),
          expect.stringContaining(
            'response 404 GET http://127.0.0.1:6099/api/w3-ui10-response-probe',
          ),
          expect.stringContaining(
            'requestfailed GET http://127.0.0.1:1/w3-ui10-requestfailed-probe',
          ),
          expect.stringContaining(
            'requestfailed GET http://127.0.0.1:6099/api/research/feedback-overview?unexpected=1',
          ),
        ]),
      );
  } finally {
    await context.close();
  }
});
