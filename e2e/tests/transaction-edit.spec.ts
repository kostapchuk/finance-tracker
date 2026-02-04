import { test, expect } from '../fixtures/test-base';
import { QuickTransactionModal } from '../page-objects/components/quick-transaction-modal';
import { testAccounts, testCategories, testIncomeSources } from '../fixtures/test-data';

test.describe('Transaction Edit/Delete', () => {
  test.beforeEach(async ({ page, dbHelper }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dbHelper.setOnboardingComplete();
    await dbHelper.clearDatabase();
    await dbHelper.setMainCurrency('USD');
    await dbHelper.refreshStoreData();
    await page.reload();
  });

  test('should edit income transaction amount from history', async ({
    page,
    dashboardPage,
    historyPage,
    dbHelper,
  }) => {
    // Seed and create an income transaction
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    await dbHelper.seedIncomeSource(testIncomeSources.salary());
    await dbHelper.refreshStoreData();
    await page.reload();

    const initialBalance = await dbHelper.getAccountBalance(accountId);
    const modal = new QuickTransactionModal(page);

    // Create income
    await dashboardPage.navigateTo('dashboard');
    await dashboardPage.dragIncomeToAccount('Salary', 'USD Cash');
    await modal.enterAmount('1000');
    await modal.enterComment('Initial salary');
    await modal.save();

    const balanceAfterCreate = await dbHelper.getAccountBalance(accountId);
    expect(balanceAfterCreate).toBe(initialBalance + 1000);

    // Navigate to history and edit
    await historyPage.navigateTo('history');
    await historyPage.clickTransactionByComment('Initial salary');

    // Edit amount
    await modal.enterAmount('1500');
    await modal.save();

    // Verify balance was updated correctly
    const finalBalance = await dbHelper.getAccountBalance(accountId);
    expect(finalBalance).toBe(initialBalance + 1500);
  });

  test('should edit expense transaction comment', async ({
    page,
    dashboardPage,
    historyPage,
    dbHelper,
  }) => {
    // Seed and create an expense
    await dbHelper.seedAccount(testAccounts.usdCash());
    await dbHelper.seedCategory(testCategories.food());
    await dbHelper.refreshStoreData();
    await page.reload();

    const modal = new QuickTransactionModal(page);

    // Create expense
    await dashboardPage.navigateTo('dashboard');
    await dashboardPage.dragAccountToCategory('USD Cash', 'Food');
    await modal.enterAmount('50');
    await modal.enterComment('Old comment');
    await modal.save();

    // Navigate to history and edit
    await historyPage.navigateTo('history');
    await historyPage.clickTransactionByComment('Old comment');

    // Edit comment
    await modal.enterComment('Updated grocery shopping');
    await modal.save();

    // Verify updated comment appears
    await expect(page.locator('text=Updated grocery shopping')).toBeVisible();
    await expect(page.locator('text=Old comment')).not.toBeVisible();
  });

  test('should edit transfer transaction amounts for multi-currency', async ({
    page,
    dashboardPage,
    historyPage,
    dbHelper,
  }) => {
    // Seed accounts
    const usdAccountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const eurAccountId = await dbHelper.seedAccount(testAccounts.eurBank());
    await dbHelper.refreshStoreData();
    await page.reload();

    const usdInitial = await dbHelper.getAccountBalance(usdAccountId);
    const eurInitial = await dbHelper.getAccountBalance(eurAccountId);
    const modal = new QuickTransactionModal(page);

    // Create transfer
    await dashboardPage.navigateTo('dashboard');
    await dashboardPage.dragAccountToAccount('USD Cash', 'EUR Bank');
    await modal.enterAmount('100'); // USD
    await modal.enterSecondAmount('90'); // EUR
    await modal.enterComment('Initial transfer');
    await modal.save();

    // Verify initial transfer
    let usdBalance = await dbHelper.getAccountBalance(usdAccountId);
    let eurBalance = await dbHelper.getAccountBalance(eurAccountId);
    expect(usdBalance).toBe(usdInitial - 100);
    expect(eurBalance).toBe(eurInitial + 90);

    // Navigate to history and edit
    await historyPage.navigateTo('history');
    await historyPage.filterByType('transfers');
    await historyPage.clickTransactionByComment('Initial transfer');

    // Edit amounts
    await modal.enterAmount('150'); // USD
    await modal.enterSecondAmount('135'); // EUR
    await modal.save();

    // Verify balances after edit
    usdBalance = await dbHelper.getAccountBalance(usdAccountId);
    eurBalance = await dbHelper.getAccountBalance(eurAccountId);
    expect(usdBalance).toBe(usdInitial - 150);
    expect(eurBalance).toBe(eurInitial + 135);
  });

  test('should delete income transaction and reverse balance', async ({
    page,
    dashboardPage,
    historyPage,
    dbHelper,
  }) => {
    // Seed and create an income
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    await dbHelper.seedIncomeSource(testIncomeSources.salary());
    await dbHelper.refreshStoreData();
    await page.reload();

    const initialBalance = await dbHelper.getAccountBalance(accountId);
    const modal = new QuickTransactionModal(page);

    // Create income
    await dashboardPage.navigateTo('dashboard');
    await dashboardPage.dragIncomeToAccount('Salary', 'USD Cash');
    await modal.enterAmount('2000');
    await modal.enterComment('To be deleted');
    await modal.save();

    const balanceAfterCreate = await dbHelper.getAccountBalance(accountId);
    expect(balanceAfterCreate).toBe(initialBalance + 2000);

    // Navigate to history and delete
    await historyPage.navigateTo('history');
    await historyPage.clickTransactionByComment('To be deleted');

    // Delete
    await modal.delete();

    // Handle confirmation
    const confirmButton = page.locator('button').filter({ hasText: /confirm|yes|да|ok/i });
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    }
    await page.waitForTimeout(500);

    // Verify balance was reversed
    const finalBalance = await dbHelper.getAccountBalance(accountId);
    expect(finalBalance).toBe(initialBalance);

    // Verify transaction is gone
    const txCount = await dbHelper.getTransactionCount();
    expect(txCount).toBe(0);
  });

  test('should delete expense transaction and reverse balance', async ({
    page,
    dashboardPage,
    historyPage,
    dbHelper,
  }) => {
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    await dbHelper.seedCategory(testCategories.food());
    await dbHelper.refreshStoreData();
    await page.reload();

    const initialBalance = await dbHelper.getAccountBalance(accountId);
    const modal = new QuickTransactionModal(page);

    // Create expense
    await dashboardPage.navigateTo('dashboard');
    await dashboardPage.dragAccountToCategory('USD Cash', 'Food');
    await modal.enterAmount('75');
    await modal.enterComment('Expense to delete');
    await modal.save();

    const balanceAfterCreate = await dbHelper.getAccountBalance(accountId);
    expect(balanceAfterCreate).toBe(initialBalance - 75);

    // Delete from history
    await historyPage.navigateTo('history');
    await historyPage.clickTransactionByComment('Expense to delete');
    await modal.delete();

    const confirmButton = page.locator('button').filter({ hasText: /confirm|yes|да|ok/i });
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    }
    await page.waitForTimeout(500);

    // Verify balance was reversed
    const finalBalance = await dbHelper.getAccountBalance(accountId);
    expect(finalBalance).toBe(initialBalance);
  });

  test('should delete transfer and reverse both account balances', async ({
    page,
    dashboardPage,
    historyPage,
    dbHelper,
  }) => {
    const usdAccountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const eurAccountId = await dbHelper.seedAccount(testAccounts.eurBank());
    await dbHelper.refreshStoreData();
    await page.reload();

    const usdInitial = await dbHelper.getAccountBalance(usdAccountId);
    const eurInitial = await dbHelper.getAccountBalance(eurAccountId);
    const modal = new QuickTransactionModal(page);

    // Create transfer
    await dashboardPage.navigateTo('dashboard');
    await dashboardPage.dragAccountToAccount('USD Cash', 'EUR Bank');
    await modal.enterAmount('100');
    await modal.enterSecondAmount('90');
    await modal.enterComment('Transfer to delete');
    await modal.save();

    // Delete from history
    await historyPage.navigateTo('history');
    await historyPage.filterByType('transfers');
    await historyPage.clickTransactionByComment('Transfer to delete');
    await modal.delete();

    const confirmButton = page.locator('button').filter({ hasText: /confirm|yes|да|ok/i });
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    }
    await page.waitForTimeout(500);

    // Verify both balances were reversed
    const usdFinal = await dbHelper.getAccountBalance(usdAccountId);
    const eurFinal = await dbHelper.getAccountBalance(eurAccountId);
    expect(usdFinal).toBe(usdInitial);
    expect(eurFinal).toBe(eurInitial);
  });
});
