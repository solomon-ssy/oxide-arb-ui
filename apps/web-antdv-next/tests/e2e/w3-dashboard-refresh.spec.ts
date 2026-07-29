import { expect, login, test } from './fixtures';

test('healthy WS keeps Dashboard REST quiet and static Orbit console-clean', async ({
  page,
}) => {
  test.setTimeout(90_000);
  let dashboardGets = 0;
  let feedbackGets = 0;

  page.on('request', (request) => {
    if (request.method() !== 'GET') {
      return;
    }
    const path = new URL(request.url()).pathname;
    if (path === '/api/dashboard/overview') {
      dashboardGets += 1;
    } else if (path === '/api/research/feedback-overview') {
      feedbackGets += 1;
    }
  });

  await login(page);
  await expect(
    page.getByText(/Realtime connected|实时已连接/i).first(),
  ).toBeVisible();
  const commandCenter = page.getByTestId('dashboard-command-center');
  await expect(
    commandCenter.getByText(/Feedback & Retraining|反馈与再训练/i),
  ).toBeVisible();
  await expect(commandCenter.getByText('crypto_price_15m')).toBeVisible();
  await expect(
    commandCenter.getByRole('button', { name: /Pause|暂停/i }),
  ).toHaveCount(0);

  await page.waitForTimeout(1000);
  const baselineDashboardGets = dashboardGets;
  const baselineFeedbackGets = feedbackGets;
  expect(baselineDashboardGets).toBeGreaterThan(0);
  expect(baselineFeedbackGets).toBeGreaterThan(0);

  await page.waitForTimeout(31_000);
  expect(dashboardGets).toBe(baselineDashboardGets);
  expect(feedbackGets).toBe(baselineFeedbackGets);
});
