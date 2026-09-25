import { test, expect } from '../fixtures/test-base';
import { testAccounts, testCategories, testIncomeSources } from '../fixtures/test-data';

test.describe('Dashboard account balances by month', () => {
  test.beforeEach(async ({ setupCleanState }) => {
    await setupCleanState();
  });

  test('should show account balances as of the end of the selected month', async ({
    page,
    dashboardPage,
    reportPage,
    dbHelper,
  }) => {
    // Stored balance (1000) already includes this month's transactions
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const incomeId = await dbHelper.seedIncomeSource(testIncomeSources.salary());
    const catId = await dbHelper.seedCategory(testCategories.food());

    await dbHelper.seedTransaction({
      type: 'income',
      amount: 300,
      currency: 'USD',
      accountId,
      incomeSourceId: incomeId,
      date: new Date(),
    });
    await dbHelper.seedTransaction({
      type: 'expense',
      amount: 50,
      currency: 'USD',
      accountId,
      categoryId: catId,
      date: new Date(),
    });
    await dbHelper.refreshStoreData();

    const account = dashboardPage.getAccountByName('USD Cash');
    await expect(account).toContainText('1,000');

    // End of previous month: 1000 - 300 + 50 = 750
    await reportPage.goToPreviousMonth();
    await expect(account).toContainText('750');
    await expect(page.locator('text=/1,000/')).toHaveCount(0);

    await reportPage.goToNextMonth();
    await expect(account).toContainText('1,000');
  });
});
