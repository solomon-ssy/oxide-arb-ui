import {
  expect,
  expectAccessible,
  readFirstApiItem,
  test,
  waitForShell,
} from './fixtures';

interface ModelSpecListRow {
  model_spec_id: string;
  name: string;
}

test('model specification lineage opens from the production research catalog', async ({
  adminApi,
  authenticatedPage,
}) => {
  const modelSpec = await readFirstApiItem<ModelSpecListRow>(
    adminApi.context,
    '/api/research/model-specs?page=1&size=100',
    (item) => item.name === 'ui-demo-seed-model',
  );

  await authenticatedPage.goto(
    `/research/model-specs?open=${modelSpec.model_spec_id}`,
  );
  await waitForShell(authenticatedPage);

  const drawer = authenticatedPage
    .getByRole('dialog')
    .filter({ hasText: 'ui-demo-seed-model' });
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText(modelSpec.model_spec_id);
  await expect(drawer).toContainText(/Input Contract|输入契约/i);
  await expect(drawer).toContainText(/Training Contract|训练契约/i);
  await expectAccessible(authenticatedPage, '[role="dialog"]');
});
