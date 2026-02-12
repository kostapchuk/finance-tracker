import { test, expect } from '../fixtures/test-base';
import { testAccounts, testCategories, testIncomeSources } from '../fixtures/test-data';

test.describe('History Page - Advanced Filters', () => {
  test.beforeEach(async ({ setupCleanState }) => {
    await setupCleanState();
  });

  test('should filter transactions by account', async ({
    page,
    historyPage,
    dbHelper,
  }) => {
    // Seed two accounts and a category
    const cashId = await dbHelper.seedAccount({ ...testAccounts.usdCash(), name: 'Cash Wallet' });
    const bankId = await dbHelper.seedAccount({
      name: 'Bank Account',
      type: 'bank',
      currency: 'USD',
      balance: 1000,
      color: '#3b82f6',
      icon: 'landmark',
      sortOrder: 1,
    });
    const catId = await dbHelper.seedCategory(testCategories.food());

    // Seed transactions directly
    await dbHelper.seedTransaction({
      type: 'expense',
      amount: 50,
      currency: 'USD',
      accountId: cashId,
      categoryId: catId,
      comment: 'Cash purchase',
    });
    await dbHelper.seedTransaction({
      type: 'expense',
      amount: 100,
      currency: 'USD',
      accountId: bankId,
      categoryId: catId,
      comment: 'Card purchase',
    });
    await dbHelper.refreshStoreData();

    // Navigate to history
    await historyPage.navigateTo('history');

    // Should see both transactions
    await expect(page.locator('text=Cash purchase')).toBeVisible();
    await expect(page.locator('text=Card purchase')).toBeVisible();

    // Open filters
    await historyPage.toggleFilters();

    // Filter by Cash Wallet account - use custom select locator
    await page.locator('button.w-full.border').filter({ hasText: /all.*accounts|все.*счета/i }).click();
    await page.locator('.z-50 .cursor-pointer').filter({ hasText: 'Cash Wallet' }).click();

    // Should only see Cash purchase
    await expect(page.locator('text=Cash purchase')).toBeVisible();
    await expect(page.locator('text=Card purchase')).not.toBeVisible();
  });

  test('should filter transactions by category', async ({
    page,
    historyPage,
    dbHelper,
  }) => {
    // Seed account and multiple categories
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const foodId = await dbHelper.seedCategory(testCategories.food());
    const transportId = await dbHelper.seedCategory(testCategories.transport());

    // Seed transactions
    await dbHelper.seedTransaction({
      type: 'expense',
      amount: 30,
      currency: 'USD',
      accountId,
      categoryId: foodId,
      comment: 'Groceries',
    });
    await dbHelper.seedTransaction({
      type: 'expense',
      amount: 20,
      currency: 'USD',
      accountId,
      categoryId: transportId,
      comment: 'Bus ticket',
    });
    await dbHelper.refreshStoreData();

    // Navigate to history and filter by expense type
    await historyPage.navigateTo('history');
    await historyPage.filterByType('expense');

    // Open filters
    await historyPage.toggleFilters();

    // Filter by Food category - use custom select locator (last button with border)
    const categorySelect = page.locator('button.w-full.border').last();
    await categorySelect.click();
    await page.locator('.z-50 .cursor-pointer').filter({ hasText: 'Food' }).click();

    // Should only see Food transaction
    await expect(page.locator('text=Groceries')).toBeVisible();
    await expect(page.locator('text=Bus ticket')).not.toBeVisible();
  });

  test('should filter transactions by date - today', async ({
    page,
    historyPage,
    dbHelper,
  }) => {
    // Seed data
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const catId = await dbHelper.seedCategory(testCategories.food());

    // Seed transaction with today's date
    await dbHelper.seedTransaction({
      type: 'expense',
      amount: 25,
      currency: 'USD',
      accountId,
      categoryId: catId,
      date: new Date(),
      comment: 'Today expense',
    });
    await dbHelper.refreshStoreData();

    // Navigate to history
    await historyPage.navigateTo('history');

    // Open filters and select "Today"
    await historyPage.toggleFilters();
    await page.locator('button.w-full.border').filter({ hasText: /this.*month|этот.*месяц/i }).click();
    await page.locator('.z-50 .cursor-pointer').filter({ hasText: /today|сегодня/i }).click();

    // Should see today's transaction
    await expect(page.locator('text=Today expense')).toBeVisible();
  });

  test('should filter transactions by date - this month', async ({
    page,
    historyPage,
    dbHelper,
  }) => {
    // Seed data
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const catId = await dbHelper.seedCategory(testCategories.food());

    // Seed transaction
    await dbHelper.seedTransaction({
      type: 'expense',
      amount: 75,
      currency: 'USD',
      accountId,
      categoryId: catId,
      date: new Date(),
      comment: 'Monthly expense',
    });
    await dbHelper.refreshStoreData();

    // Navigate to history - default filter is "This Month"
    await historyPage.navigateTo('history');

    // Should see this month's transaction (default filter)
    await expect(page.locator('text=Monthly expense')).toBeVisible();
  });

  test('should filter transactions by custom date range', async ({
    page,
    historyPage,
    dbHelper,
  }) => {
    // Seed data
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const catId = await dbHelper.seedCategory(testCategories.food());

    // Seed transaction
    await dbHelper.seedTransaction({
      type: 'expense',
      amount: 50,
      currency: 'USD',
      accountId,
      categoryId: catId,
      date: new Date(),
      comment: 'Date range test',
    });
    await dbHelper.refreshStoreData();

    // Navigate to history
    await historyPage.navigateTo('history');

    // Open filters and select "Custom Range"
    await historyPage.toggleFilters();
    await page.locator('button.w-full.border').filter({ hasText: /this.*month|этот.*месяц/i }).click();
    await page.locator('.z-50 .cursor-pointer').filter({ hasText: /custom|произвольн/i }).click();

    // Set date range to include today
    const today = new Date().toISOString().split('T')[0];
    await page.locator('input[type="date"]').first().fill(today);
    await page.locator('input[type="date"]').last().fill(today);

    // Should see the transaction
    await expect(page.locator('text=Date range test')).toBeVisible();
  });

  test('should search transactions by comment', async ({
    page,
    historyPage,
    dbHelper,
  }) => {
    // Seed data
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const foodId = await dbHelper.seedCategory(testCategories.food());
    const transportId = await dbHelper.seedCategory(testCategories.transport());

    // Seed transactions with different comments
    await dbHelper.seedTransaction({
      type: 'expense',
      amount: 15,
      currency: 'USD',
      accountId,
      categoryId: foodId,
      comment: 'Coffee at Starbucks',
    });
    await dbHelper.seedTransaction({
      type: 'expense',
      amount: 35,
      currency: 'USD',
      accountId,
      categoryId: transportId,
      comment: 'Uber to airport',
    });
    await dbHelper.refreshStoreData();

    // Navigate to history and search
    await historyPage.navigateTo('history');
    await historyPage.search('Starbucks');

    // Should only see Starbucks transaction
    await expect(page.locator('text=Coffee at Starbucks')).toBeVisible();
    await expect(page.locator('text=Uber to airport')).not.toBeVisible();
  });

  test('should search transactions by account name', async ({
    page,
    historyPage,
    dbHelper,
  }) => {
    // Seed data
    const walletId = await dbHelper.seedAccount({ ...testAccounts.usdCash(), name: 'Main Wallet' });
    const savingsId = await dbHelper.seedAccount({
      name: 'Savings',
      type: 'bank',
      currency: 'USD',
      balance: 500,
      color: '#22c55e',
      icon: 'piggy-bank',
      sortOrder: 1,
    });
    const catId = await dbHelper.seedCategory(testCategories.food());

    // Seed transactions from different accounts
    await dbHelper.seedTransaction({
      type: 'expense',
      amount: 40,
      currency: 'USD',
      accountId: walletId,
      categoryId: catId,
      comment: 'From wallet',
    });
    await dbHelper.seedTransaction({
      type: 'expense',
      amount: 60,
      currency: 'USD',
      accountId: savingsId,
      categoryId: catId,
      comment: 'From savings',
    });
    await dbHelper.refreshStoreData();

    // Navigate to history and search by account name
    await historyPage.navigateTo('history');
    await historyPage.search('Savings');

    // Should only see Savings transaction
    await expect(page.locator('text=From savings')).toBeVisible();
    await expect(page.locator('text=From wallet')).not.toBeVisible();
  });

  test('should combine multiple filters (type + account)', async ({
    page,
    historyPage,
    dbHelper,
  }) => {
    // Seed data
    const cashId = await dbHelper.seedAccount({ ...testAccounts.usdCash(), name: 'Cash' });
    const incomeId = await dbHelper.seedIncomeSource(testIncomeSources.salary());
    const catId = await dbHelper.seedCategory(testCategories.food());

    // Seed income and expense
    await dbHelper.seedTransaction({
      type: 'income',
      amount: 1000,
      currency: 'USD',
      accountId: cashId,
      incomeSourceId: incomeId,
      comment: 'Salary income',
    });
    await dbHelper.seedTransaction({
      type: 'expense',
      amount: 50,
      currency: 'USD',
      accountId: cashId,
      categoryId: catId,
      comment: 'Food expense',
    });
    await dbHelper.refreshStoreData();

    // Navigate to history
    await historyPage.navigateTo('history');

    // Filter by expense type
    await historyPage.filterByType('expense');

    // Open filters and filter by Cash account
    await historyPage.toggleFilters();
    await page.locator('button.w-full.border').filter({ hasText: /all.*accounts|все.*счета/i }).click();
    await page.locator('.z-50 .cursor-pointer').filter({ hasText: 'Cash' }).click();

    // Should only see the expense (income filtered out by type)
    await expect(page.locator('text=Food expense')).toBeVisible();
    await expect(page.locator('text=Salary income')).not.toBeVisible();
  });

  test('should show all transactions when clearing filters', async ({
    page,
    historyPage,
    dbHelper,
  }) => {
    // Seed data
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const incomeId = await dbHelper.seedIncomeSource(testIncomeSources.salary());
    const catId = await dbHelper.seedCategory(testCategories.food());

    // Seed income and expense
    await dbHelper.seedTransaction({
      type: 'income',
      amount: 500,
      currency: 'USD',
      accountId,
      incomeSourceId: incomeId,
      comment: 'Income transaction',
    });
    await dbHelper.seedTransaction({
      type: 'expense',
      amount: 100,
      currency: 'USD',
      accountId,
      categoryId: catId,
      comment: 'Expense transaction',
    });
    await dbHelper.refreshStoreData();

    // Navigate to history and filter by income only
    await historyPage.navigateTo('history');
    await historyPage.filterByType('income');

    // Should only see income
    await expect(page.locator('text=Income transaction')).toBeVisible();
    await expect(page.locator('text=Expense transaction')).not.toBeVisible();

    // Clear filter by selecting "All"
    await historyPage.filterByType('all');

    // Should see both transactions
    await expect(page.locator('text=Income transaction')).toBeVisible();
    await expect(page.locator('text=Expense transaction')).toBeVisible();
  });
});
