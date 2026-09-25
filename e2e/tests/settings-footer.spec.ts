import { test, expect } from '../fixtures/test-base';

test.describe('Settings footer', () => {
  test('should not show a source code link', async ({ page, settingsPage, setupCleanState }) => {
    await setupCleanState();
    await settingsPage.navigateTo('settings');

    await expect(page.getByText(/Finance Tracker v/)).toBeVisible();
    await expect(page.getByRole('link', { name: /source code|исходный код/i })).toHaveCount(0);
    await expect(page.locator('a[href*="github.com"]')).toHaveCount(0);
  });
});
