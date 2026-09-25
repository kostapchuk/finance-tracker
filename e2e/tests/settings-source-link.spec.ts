import { test, expect } from '../fixtures/test-base';

test.describe('Settings source code link', () => {
  test('should link to the GitHub source code (AGPL-3.0)', async ({ page, settingsPage, setupCleanState }) => {
    await setupCleanState();
    await settingsPage.navigateTo('settings');

    const link = page.getByRole('link', { name: /source code|исходный код/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', 'https://github.com/kostapchuk/finance-tracker');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(link).toContainText('AGPL-3.0');
  });
});
