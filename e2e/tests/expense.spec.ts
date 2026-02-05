import { test, expect } from '../fixtures/test-base';
import { QuickTransactionModal } from '../page-objects/components/quick-transaction-modal';
import { testAccounts, testCategories } from '../fixtures/test-data';

test.describe('Expense Transactions', () => {
  test.beforeEach(async ({ setupCleanState }) => {
    await setupCleanState();
  });

  test('should record expense by dragging account to category (same currency)', async ({
    page,
    dashboardPage,
    dbHelper,
  }) => {
    // Seed data
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    await dbHelper.seedCategory(testCategories.food());
    await dbHelper.refreshStoreData();
    await page.reload();

    const initialBalance = await dbHelper.getAccountBalance(accountId);
    const modal = new QuickTransactionModal(page);

    // Drag account to category
    await dashboardPage.navigateTo('dashboard');
    await dashboardPage.dragAccountToCategory('USD Cash', 'Food');

    // Verify modal opens
    await expect(modal.getModal()).toBeVisible();

    // Enter amount and save
    await modal.enterAmount('50');
    await modal.enterComment('Grocery shopping');
    await modal.save();

    // Verify balance decreased
    const newBalance = await dbHelper.getAccountBalance(accountId);
    expect(newBalance).toBe(initialBalance - 50);

    // Verify transaction count
    const txCount = await dbHelper.getTransactionCount();
    expect(txCount).toBe(1);
  });

  test('should record expense with multi-currency (EUR account, USD mainCurrency)', async ({
    page,
    dashboardPage,
    dbHelper,
  }) => {
    // Seed EUR account (mainCurrency is USD)
    const accountId = await dbHelper.seedAccount(testAccounts.eurBank());
    await dbHelper.seedCategory(testCategories.food());
    await dbHelper.refreshStoreData();
    await page.reload();

    const initialBalance = await dbHelper.getAccountBalance(accountId);
    const modal = new QuickTransactionModal(page);

    // Drag account to category
    await dashboardPage.navigateTo('dashboard');
    await dashboardPage.dragAccountToCategory('EUR Bank', 'Food');

    // Verify modal opens with multi-currency mode
    await expect(modal.getModal()).toBeVisible();
    const isMultiCurrency = await modal.isMultiCurrencyMode();
    expect(isMultiCurrency).toBe(true);

    // Enter amounts (EUR account amount and USD mainCurrency amount)
    await modal.enterAmount('45'); // EUR
    await modal.enterSecondAmount('50'); // USD for budget tracking
    await modal.save();

    // Verify balance decreased by EUR amount
    const newBalance = await dbHelper.getAccountBalance(accountId);
    expect(newBalance).toBe(initialBalance - 45);
  });

  test('should record expense from credit card', async ({ page, dashboardPage, dbHelper }) => {
    // Seed credit card (negative balance)
    const accountId = await dbHelper.seedAccount(testAccounts.creditCard());
    await dbHelper.seedCategory(testCategories.entertainment());
    await dbHelper.refreshStoreData();
    await page.reload();

    const initialBalance = await dbHelper.getAccountBalance(accountId);
    const modal = new QuickTransactionModal(page);

    await dashboardPage.navigateTo('dashboard');
    await dashboardPage.dragAccountToCategory('Credit Card', 'Entertainment');

    await modal.enterAmount('100');
    await modal.save();

    // Credit card balance should become more negative
    const newBalance = await dbHelper.getAccountBalance(accountId);
    expect(newBalance).toBe(initialBalance - 100);
  });

  test('should record expense with comment', async ({ page, dashboardPage, historyPage, dbHelper }) => {
    await dbHelper.seedAccount(testAccounts.usdCash());
    await dbHelper.seedCategory(testCategories.transport());
    await dbHelper.refreshStoreData();
    await page.reload();

    const modal = new QuickTransactionModal(page);

    await dashboardPage.navigateTo('dashboard');
    await dashboardPage.dragAccountToCategory('USD Cash', 'Transport');

    await modal.enterAmount('35');
    await modal.enterComment('Uber ride to airport');
    await modal.save();

    // Verify in history
    await historyPage.navigateTo('history');
    await expect(page.locator('text=Uber ride to airport')).toBeVisible();
  });

  test('should record multiple expenses to the same category', async ({
    page,
    dashboardPage,
    dbHelper,
  }) => {
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    await dbHelper.seedCategory(testCategories.food());
    await dbHelper.refreshStoreData();
    await page.reload();

    const initialBalance = await dbHelper.getAccountBalance(accountId);
    const modal = new QuickTransactionModal(page);

    // First expense
    await dashboardPage.navigateTo('dashboard');
    await dashboardPage.dragAccountToCategory('USD Cash', 'Food');
    await modal.enterAmount('25');
    await modal.save();

    // Second expense
    await dashboardPage.dragAccountToCategory('USD Cash', 'Food');
    await modal.enterAmount('30');
    await modal.save();

    // Verify total balance change
    const newBalance = await dbHelper.getAccountBalance(accountId);
    expect(newBalance).toBe(initialBalance - 55);

    // Verify transaction count
    const txCount = await dbHelper.getTransactionCount();
    expect(txCount).toBe(2);
  });

  test('should update category tile amount on dashboard after expense', async ({
    page,
    dashboardPage,
    dbHelper,
  }) => {
    await dbHelper.seedAccount(testAccounts.usdCash());
    await dbHelper.seedCategory(testCategories.food());
    await dbHelper.refreshStoreData();
    await page.reload();

    const modal = new QuickTransactionModal(page);

    await dashboardPage.navigateTo('dashboard');

    // Record expense
    await dashboardPage.dragAccountToCategory('USD Cash', 'Food');
    await modal.enterAmount('75');
    await modal.save();

    // Verify category tile shows the expense amount
    const categoryTile = dashboardPage.getCategoryByName('Food');
    await expect(categoryTile).toContainText('75');
  });
});
