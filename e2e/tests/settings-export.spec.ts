import { readFile } from 'node:fs/promises';
import { test, expect } from '../fixtures/test-base';
import { testAccounts, testCategories } from '../fixtures/test-data';

test.describe('Settings - Export to CSV', () => {
  test('downloads transactions as a spreadsheet-friendly CSV', async ({
    page,
    settingsPage,
    dbHelper,
    setupCleanState,
  }) => {
    await setupCleanState();

    const accountId = await dbHelper.seedAccount({ ...testAccounts.usdCash(), name: 'Cash Wallet' });
    const categoryId = await dbHelper.seedCategory(testCategories.food());
    await dbHelper.seedTransaction({
      type: 'expense',
      amount: 12.5,
      currency: 'USD',
      accountId,
      categoryId,
      comment: 'Lunch, with "friends"',
    });
    await dbHelper.refreshStoreData();

    await settingsPage.navigateTo('settings');

    const exportButton = page.getByRole('button', { name: 'Export to CSV' });
    await expect(exportButton).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^finance-tracker-transactions-\d{4}-\d{2}-\d{2}\.csv$/);

    const path = await download.path();
    const content = await readFile(path, 'utf8');
    const lines = content.replace(/^\uFEFF/, '').trimEnd().split('\r\n');

    expect(content.startsWith('\uFEFF')).toBe(true);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('Date,Type,Amount,Currency,Account');
    expect(lines[1]).toContain(',Expense,12.5,USD,Cash Wallet,12.5,USD,');
    expect(lines[1]).toContain(testCategories.food().name);
    expect(lines[1]).toMatch(/"Lunch, with ""friends"""$/);
  });
});
