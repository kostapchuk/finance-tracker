import { test, expect } from '../fixtures/test-base';

test.describe('PWA Update Notification', () => {
  test('should not show dot badge on Settings tab when no update is available', async ({ page, setupCleanState }) => {
    await setupCleanState();

    // The settings nav button should not have a dot badge
    const settingsButton = page.locator('nav button').filter({ hasText: /settings/i });
    const badge = settingsButton.locator('.rounded-full.bg-primary');
    await expect(badge).not.toBeVisible();
  });

  test('should show dot badge on Settings tab when update is available', async ({ page, setupCleanState }) => {
    // Set the test flag before navigation
    await page.addInitScript(() => {
      window.__TEST_FORCE_SW_UPDATE__ = true;
    });
    await setupCleanState();

    // The settings nav button should have a dot badge
    const settingsButton = page.locator('nav button').filter({ hasText: /settings/i });
    const badge = settingsButton.locator('.rounded-full.bg-primary');
    await expect(badge).toBeVisible();
  });

  test('should show update card in Settings page when update is available', async ({ page, settingsPage, setupCleanState }) => {
    // Set the test flag before navigation
    await page.addInitScript(() => {
      window.__TEST_FORCE_SW_UPDATE__ = true;
    });
    await setupCleanState();

    await settingsPage.navigateTo('settings');

    // Should show update card with title and button
    await expect(page.getByText('Update available')).toBeVisible();
    await expect(page.getByText('A new version of the app is ready to install')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Update' })).toBeVisible();
  });

  test('should not show update card in Settings page when no update is available', async ({ page, settingsPage, setupCleanState }) => {
    await setupCleanState();

    await settingsPage.navigateTo('settings');

    // Should not show update card text
    await expect(page.getByText('A new version of the app is ready to install')).not.toBeVisible();
  });
});
