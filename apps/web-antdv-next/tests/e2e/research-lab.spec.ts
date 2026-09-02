import { expect, readFirstApiItem, test } from './fixtures';
import { expectReleaseQuality, waitForUiReady } from './release-closure';
import { flushVisualFrame } from './stable-screenshot';

test('lineage retains a valid viewport across a collapsed panel', async ({
  authenticatedPage: page,
  browserAudit,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/research/lab?module=lineage');
  await waitForUiReady(page, browserAudit);
  const viewport = page.locator('.lineage-viewport');
  await expect(page.locator('.lineage-node')).toHaveCount(6);
  await expect
    .poll(async () =>
      viewport.evaluate(
        (element) => element.clientWidth > 0 && element.clientHeight > 0,
      ),
    )
    .toBe(true);
  // Data can be ready while a route transition still moves an ancestor.
  await expect
    .poll(() =>
      viewport.evaluate((element) => {
        for (
          let ancestor: Element | null = element;
          ancestor;
          ancestor = ancestor.parentElement
        ) {
          if (
            ancestor
              .getAnimations()
              .some(
                (animation) =>
                  animation.pending || animation.playState === 'running',
              )
          )
            return false;
        }
        return true;
      }),
    )
    .toBe(true);
  await flushVisualFrame(page);
  const original = await viewport.boundingBox();
  expect(original).not.toBeNull();
  await page.setViewportSize({ width: 1, height: 1 });
  await expect
    .poll(async () =>
      viewport.evaluate(
        (element) => element.clientWidth > 0 && element.clientHeight > 0,
      ),
    )
    .toBe(true);
  await expect(page.locator('.lineage-node')).toHaveCount(6);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => viewport.boundingBox()).toEqual(original);
  await expect(page.locator('.lineage-node')).toHaveCount(6);
  await waitForUiReady(page, browserAudit);
  await expectReleaseQuality(page);
});

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
  const inspector = page
    .getByTestId('workspace-object-stage')
    .filter({ hasText: modelSpec.name });
  await expect(inspector).toContainText(modelSpec.model_spec_id);
  await expect(inspector).toContainText(/Input Contract|输入契约/i);
  await inspector.getByRole('button', { name: /^(返回|Back)$/i }).click();
  await expect(inspector).not.toBeVisible();
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get('module') === 'specs' &&
      !url.searchParams.has('entity') &&
      !url.searchParams.has('id'),
  );

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
  await expect(page.locator('.workspace-inspector-surface')).toBeVisible();
  await expectReleaseQuality(page);
});
