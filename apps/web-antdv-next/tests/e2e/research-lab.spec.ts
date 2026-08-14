import { expect, readFirstApiItem, test } from './fixtures';
import { expectReleaseQuality, waitForUiReady } from './release-closure';

interface ModelSpecRow {
  model_spec_id: string;
  name: string;
}

test('research lab opens authoritative model lineage inside the canonical workspace', async ({
  adminApi,
  authenticatedPage: page,
  browserAudit,
}) => {
  const modelSpec = await readFirstApiItem<ModelSpecRow>(
    adminApi.context,
    '/api/research/model-specs?page=1&size=100',
    ({ name }) => name === 'ui-demo-seed-model',
  );

  await page.goto(
    `/research/lab?module=specs&entity=model-spec&id=${modelSpec.model_spec_id}`,
  );
  await waitForUiReady(page, browserAudit);
  const dialog = page.getByRole('dialog').filter({ hasText: modelSpec.name });
  await expect(dialog).toContainText(modelSpec.model_spec_id);
  await expect(dialog).toContainText(/Input Contract|输入契约/i);
  await dialog.getByRole('button', { name: /^(关闭|Close)$/i }).click();
  await expect(dialog).not.toBeVisible();

  await page.getByRole('tab', { name: /Lineage|谱系/i }).click();
  await expect(page).toHaveURL(
    (url) => url.searchParams.get('module') === 'lineage',
  );
  await waitForUiReady(page, browserAudit);
  const lineageNode = page.locator('.lineage-node').first();
  await expect(lineageNode).toBeVisible();
  await lineageNode.click();
  await expect(page).toHaveURL((url) =>
    Boolean(url.searchParams.get('entity')),
  );
  await expect(page.locator('.object-inspector-panel')).toBeVisible();
  await expectReleaseQuality(page);
});
