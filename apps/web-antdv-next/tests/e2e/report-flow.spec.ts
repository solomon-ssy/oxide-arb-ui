import {
  expect,
  expectAccessible,
  readApiData,
  readFirstApiItem,
  test,
  waitForShell,
} from './fixtures';

interface ReportListRow {
  recommendation_report_id: string;
  status: string;
}

interface RecommendationRow {
  identity: { question: string };
  outcome_side: string;
}

test('feature-parity-contained report remains auditable through production boundaries', async ({
  adminApi,
  authenticatedPage,
}) => {
  const report = await readFirstApiItem<ReportListRow>(
    adminApi.context,
    '/api/quant/reports?page=1&size=100&status=revoked',
    (item) => item.status === 'revoked',
  );
  expect(report).toMatchObject({ status: 'revoked' });
  const recommendations = await readApiData<RecommendationRow[]>(
    adminApi.context,
    `/api/quant/reports/${report.recommendation_report_id}/recommendations`,
  );
  const [expectedRecommendation] = recommendations;
  if (!expectedRecommendation) {
    throw new Error('seeded report has no auditable recommendation');
  }

  await authenticatedPage.goto(
    `/quant/reports/${report.recommendation_report_id}`,
  );
  await waitForShell(authenticatedPage);
  await expect(
    authenticatedPage.getByTestId('report-lifecycle-banner'),
  ).toContainText(/已撤销|Revoked/i);

  await authenticatedPage
    .getByRole('tab', { name: /推荐|Recommendations/i })
    .click();
  const recommendation = authenticatedPage
    .getByRole('row')
    .filter({ hasText: expectedRecommendation.identity.question });
  await expect(recommendation).toBeVisible();
  await expect(recommendation).toContainText(
    new RegExp(expectedRecommendation.outcome_side, 'i'),
  );
  await expectAccessible(authenticatedPage, 'main');
});
