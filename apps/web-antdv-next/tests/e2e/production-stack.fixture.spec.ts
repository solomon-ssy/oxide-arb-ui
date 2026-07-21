import { expect, test, waitForShell } from './fixtures';

test('real production stack composes authenticated browser and API boundaries', async ({
  adminApi,
  authenticatedPage,
  namespace,
}) => {
  const identity = await adminApi.context.get('/api/auth/me');
  expect(identity.ok(), await identity.text()).toBeTruthy();
  await expect(identity.json()).resolves.toMatchObject({
    data: {
      roles: [{ code: 'super_admin' }],
      user: { username: 'admin' },
    },
  });

  await authenticatedPage.goto('/quant/reports');
  await waitForShell(authenticatedPage);
  await expect(
    authenticatedPage.getByTestId('reports-workspace'),
  ).toBeVisible();
  expect(namespace).toMatch(/^pw-\d+-\d+$/);
});
