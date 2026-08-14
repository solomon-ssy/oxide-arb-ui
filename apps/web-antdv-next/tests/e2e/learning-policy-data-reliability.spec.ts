import { expect, readApiData, test } from './fixtures';
import { expectReleaseQuality, waitForUiReady } from './release-closure';

interface FeedbackOverview {
  revision: number;
}

interface DomainSource {
  source_id: string;
}

interface DomainSourcesSnapshot {
  items: DomainSource[];
}

test('learning policy and data reliability expose one evidence-bearing research loop', async ({
  adminApi,
  authenticatedPage: page,
  browserAudit,
}) => {
  const feedback = await readApiData<FeedbackOverview>(
    adminApi.context,
    '/api/research/feedback-overview',
  );
  const sources = await readApiData<DomainSourcesSnapshot>(
    adminApi.context,
    '/api/research/domain-sources',
  );
  expect(feedback.revision).toBeGreaterThanOrEqual(0);
  expect(sources.items.length).toBeGreaterThan(0);
  const source = sources.items[0];
  if (!source) throw new Error('fresh fixture has no domain source');

  await page.goto('/research/learning-policy?module=feedback');
  await waitForUiReady(page, browserAudit);
  await expect(page.getByTestId('feedback-overview-revision')).toHaveText(
    String(feedback.revision),
  );
  await expect(page.getByTestId('websocket-status')).toHaveAttribute(
    'data-state',
    'connected',
  );

  await page.goto('/research/data-reliability?module=sources');
  await waitForUiReady(page, browserAudit);
  const sourcesPage = page.getByTestId('domain-sources-page');
  await expect(sourcesPage).toBeVisible();
  await expect(sourcesPage).toContainText(source.source_id);

  await page
    .getByRole('tab', { name: /Feature integrity|特征完整性/i })
    .click();
  await expect(page).toHaveURL(
    (url) => url.searchParams.get('module') === 'feature-integrity',
  );
  await waitForUiReady(page, browserAudit);
  await expectReleaseQuality(page);
});
