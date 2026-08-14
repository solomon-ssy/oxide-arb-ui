import { expect, readApiData, readFirstApiItem, test } from './fixtures';
import { expectReleaseQuality, waitForUiReady } from './release-closure';

interface ReportRow {
  recommendation_report_id: string;
  status: string;
}

interface RecommendationRow {
  identity: { question: string };
  outcome_side: string;
  recommendation_id: string;
}

test('recommendation workspace preserves revoked report evidence and owning detail routes', async ({
  adminApi,
  authenticatedPage: page,
  browserAudit,
}) => {
  const report = await readFirstApiItem<ReportRow>(
    adminApi.context,
    '/api/quant/reports?page=1&size=100&status=revoked',
    ({ status }) => status === 'revoked',
  );
  const recommendations = await readApiData<RecommendationRow[]>(
    adminApi.context,
    `/api/quant/reports/${report.recommendation_report_id}/recommendations`,
  );
  const recommendation = recommendations[0];
  if (!recommendation)
    throw new Error('seeded revoked report has no recommendation');

  await page.goto(
    `/trading/recommendations?module=queue&entity=report&id=${report.recommendation_report_id}`,
  );
  await waitForUiReady(page, browserAudit);
  await expect(page.getByTestId('report-lifecycle-banner')).toContainText(
    /已撤销|Revoked/i,
  );
  await page
    .getByTestId('report-detail-workspace')
    .getByRole('tab', { name: /^(推荐|Recommendations)$/i })
    .click();
  const row = page.getByRole('row').filter({
    hasText: recommendation.identity.question,
  });
  await expect(row).toContainText(new RegExp(recommendation.outcome_side, 'i'));
  await expectReleaseQuality(page);
});
