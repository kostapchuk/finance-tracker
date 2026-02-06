import { test, expect } from '../fixtures/test-base';
import { testAccounts, testCategories } from '../fixtures/test-data';

test.describe('History Infinite Scroll', () => {
  test.beforeEach(async ({ setupCleanState }) => {
    await setupCleanState();
  });

  test('should initially show only 50 transactions', async ({ page, historyPage, dbHelper }) => {
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const categoryId = await dbHelper.seedCategory(testCategories.food());
    await dbHelper.seedTransactions(100, accountId, categoryId);
    await dbHelper.refreshStoreData();

    await historyPage.navigateTo('history');
    await page.waitForTimeout(500);

    const count = await historyPage.getTransactionCount();
    expect(count).toBe(50);
  });

  test('should load more transactions on scroll', async ({ page, historyPage, dbHelper }) => {
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const categoryId = await dbHelper.seedCategory(testCategories.food());
    await dbHelper.seedTransactions(100, accountId, categoryId);
    await dbHelper.refreshStoreData();

    await historyPage.navigateTo('history');
    await page.waitForTimeout(500);

    const initialCount = await historyPage.getTransactionCount();
    expect(initialCount).toBe(50);

    // Scroll to bottom to trigger load more
    await historyPage.scrollToBottom();
    await historyPage.waitForMoreTransactions(initialCount);

    const newCount = await historyPage.getTransactionCount();
    expect(newCount).toBe(100);
  });

  test('should reset to 50 when filter changes', async ({ page, historyPage, dbHelper }) => {
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const categoryId = await dbHelper.seedCategory(testCategories.food());
    await dbHelper.seedTransactions(100, accountId, categoryId);
    await dbHelper.refreshStoreData();

    await historyPage.navigateTo('history');
    await historyPage.scrollToBottom();
    await page.waitForTimeout(500);

    // All 100 should be loaded
    let count = await historyPage.getTransactionCount();
    expect(count).toBe(100);

    // Change filter - should reset to 50
    await historyPage.filterByType('expense');
    await page.waitForTimeout(300);

    count = await historyPage.getTransactionCount();
    expect(count).toBe(50);
  });

  test('should show all transactions message when fully loaded', async ({ page, historyPage, dbHelper }) => {
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const categoryId = await dbHelper.seedCategory(testCategories.food());
    await dbHelper.seedTransactions(60, accountId, categoryId);
    await dbHelper.refreshStoreData();

    await historyPage.navigateTo('history');
    await historyPage.scrollToBottom();
    await page.waitForTimeout(500);

    // Should show "Showing all X transactions" message
    await expect(page.locator('text=/showing all|показаны все/i')).toBeVisible();
  });
});
