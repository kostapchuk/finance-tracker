import { test, expect } from '../fixtures/test-base';
import { testAccounts, testCategories, testIncomeSources } from '../fixtures/test-data';

test.describe('Reports Page', () => {
  test.beforeEach(async ({ setupCleanState }) => {
    await setupCleanState();
  });

  test('should show empty state when no transactions exist', async ({ reportPage }) => {
    await reportPage.navigateTo('report');

    // Should show zero amounts
    await expect(reportPage.getIncomeAmount()).toContainText('0');
    await expect(reportPage.getExpensesAmount()).toContainText('0');

    // Should show empty state messages
    await expect(reportPage.getNoExpenseDataMessage()).toBeVisible();
    await expect(reportPage.getNoTransactionDataMessage()).toBeVisible();
  });

  test('should display monthly income correctly', async ({
    reportPage,
    dbHelper,
  }) => {
    // Seed data
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const incomeId = await dbHelper.seedIncomeSource(testIncomeSources.salary());

    // Seed income transaction
    await dbHelper.seedTransaction({
      type: 'income',
      amount: 2500,
      currency: 'USD',
      accountId,
      incomeSourceId: incomeId,
      date: new Date(),
      comment: 'Monthly salary',
    });
    await dbHelper.refreshStoreData();

    // Navigate to reports
    await reportPage.navigateTo('report');

    // Verify income is displayed
    await expect(reportPage.getIncomeAmount()).toContainText('2,500');
  });

  test('should display monthly expenses correctly', async ({
    reportPage,
    dbHelper,
  }) => {
    // Seed data
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const catId = await dbHelper.seedCategory(testCategories.food());

    // Seed expense transaction
    await dbHelper.seedTransaction({
      type: 'expense',
      amount: 150,
      currency: 'USD',
      accountId,
      categoryId: catId,
      date: new Date(),
      comment: 'Groceries',
    });
    await dbHelper.refreshStoreData();

    // Navigate to reports
    await reportPage.navigateTo('report');

    // Verify expense is displayed
    await expect(reportPage.getExpensesAmount()).toContainText('150');
  });

  test('should calculate net flow correctly (income - expenses)', async ({
    reportPage,
    dbHelper,
  }) => {
    // Seed data
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const incomeId = await dbHelper.seedIncomeSource(testIncomeSources.salary());
    const catId = await dbHelper.seedCategory(testCategories.food());

    // Seed income ($3000)
    await dbHelper.seedTransaction({
      type: 'income',
      amount: 3000,
      currency: 'USD',
      accountId,
      incomeSourceId: incomeId,
      date: new Date(),
    });

    // Seed expense ($800)
    await dbHelper.seedTransaction({
      type: 'expense',
      amount: 800,
      currency: 'USD',
      accountId,
      categoryId: catId,
      date: new Date(),
    });
    await dbHelper.refreshStoreData();

    // Navigate to reports
    await reportPage.navigateTo('report');

    // Net flow should be $2200 ($3000 - $800)
    await expect(reportPage.getNetFlowAmount()).toContainText('2,200');
  });

  test('should show spending by category chart with data', async ({
    reportPage,
    dbHelper,
  }) => {
    // Seed data with multiple categories
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const foodId = await dbHelper.seedCategory(testCategories.food());
    const transportId = await dbHelper.seedCategory(testCategories.transport());

    // Seed expenses to different categories
    await dbHelper.seedTransaction({
      type: 'expense',
      amount: 200,
      currency: 'USD',
      accountId,
      categoryId: foodId,
      date: new Date(),
    });
    await dbHelper.seedTransaction({
      type: 'expense',
      amount: 100,
      currency: 'USD',
      accountId,
      categoryId: transportId,
      date: new Date(),
    });
    await dbHelper.refreshStoreData();

    // Navigate to reports
    await reportPage.navigateTo('report');

    // Pie chart should be visible
    await expect(reportPage.getCategoryPieChart()).toBeVisible();

    // Category legend should show both categories
    const foodLegend = await reportPage.getCategoryLegendItem('Food');
    const transportLegend = await reportPage.getCategoryLegendItem('Transport');
    await expect(foodLegend).toBeVisible();
    await expect(transportLegend).toBeVisible();
  });

  test('should show 6-month trend chart with data', async ({
    reportPage,
    dbHelper,
  }) => {
    // Seed data
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const incomeId = await dbHelper.seedIncomeSource(testIncomeSources.salary());
    const catId = await dbHelper.seedCategory(testCategories.food());

    // Seed transactions
    await dbHelper.seedTransaction({
      type: 'income',
      amount: 1000,
      currency: 'USD',
      accountId,
      incomeSourceId: incomeId,
      date: new Date(),
    });
    await dbHelper.seedTransaction({
      type: 'expense',
      amount: 300,
      currency: 'USD',
      accountId,
      categoryId: catId,
      date: new Date(),
    });
    await dbHelper.refreshStoreData();

    // Navigate to reports
    await reportPage.navigateTo('report');

    // Trend bars should be visible
    await expect(reportPage.getTrendBars().first()).toBeVisible();

    // Legend should show income and expenses
    await expect(reportPage.getTrendLegend()).toBeVisible();
  });

  test('should navigate to previous month', async ({ reportPage }) => {
    await reportPage.navigateTo('report');

    // Get current month text
    const currentMonthText = await reportPage.getCurrentMonthText().textContent();

    // Go to previous month
    await reportPage.goToPreviousMonth();

    // Month should have changed
    const newMonthText = await reportPage.getCurrentMonthText().textContent();
    expect(newMonthText).not.toBe(currentMonthText);
  });

  test('should navigate to next month', async ({ reportPage }) => {
    await reportPage.navigateTo('report');

    // First go back a month so we can go forward
    await reportPage.goToPreviousMonth();
    const prevMonthText = await reportPage.getCurrentMonthText().textContent();

    // Go to next month
    await reportPage.goToNextMonth();

    // Month should have changed
    const newMonthText = await reportPage.getCurrentMonthText().textContent();
    expect(newMonthText).not.toBe(prevMonthText);
  });

  test('should show different data when navigating months', async ({
    reportPage,
    dbHelper,
  }) => {
    // Seed data
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const incomeId = await dbHelper.seedIncomeSource(testIncomeSources.salary());

    // Seed income in current month
    await dbHelper.seedTransaction({
      type: 'income',
      amount: 5000,
      currency: 'USD',
      accountId,
      incomeSourceId: incomeId,
      date: new Date(),
    });
    await dbHelper.refreshStoreData();

    // Navigate to reports - should show $5000 income
    await reportPage.navigateTo('report');
    await expect(reportPage.getIncomeAmount()).toContainText('5,000');

    // Go to previous month - should show $0 income
    await reportPage.goToPreviousMonth();
    await expect(reportPage.getIncomeAmount()).toContainText('0');
  });

  test('should display total balance from all accounts', async ({
    reportPage,
    dbHelper,
  }) => {
    // Seed multiple accounts with different balances
    await dbHelper.seedAccount({ ...testAccounts.usdCash(), balance: 1000 });
    await dbHelper.seedAccount({
      name: 'Savings',
      type: 'bank',
      currency: 'USD',
      balance: 2500,
      color: '#3b82f6',
      icon: 'piggy-bank',
      sortOrder: 1,
    });
    await dbHelper.refreshStoreData();

    await reportPage.navigateTo('report');

    // Total balance should be $3500 ($1000 + $2500)
    await expect(reportPage.getTotalBalanceAmount()).toContainText('3,500');
  });
});
