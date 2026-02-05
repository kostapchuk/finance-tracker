import { test, expect } from '../fixtures/test-base';
import { QuickTransactionModal } from '../page-objects/components/quick-transaction-modal';
import { testAccounts, testIncomeSources } from '../fixtures/test-data';

test.describe('Income Transactions', () => {
  test.beforeEach(async ({ setupCleanState }) => {
    await setupCleanState();
  });

  test('should record income by dragging income source to account (same currency)', async ({
    page,
    dashboardPage,
    dbHelper,
  }) => {
    // Seed data
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const sourceId = await dbHelper.seedIncomeSource(testIncomeSources.salary());
    await dbHelper.refreshStoreData();
    await page.reload();

    const initialBalance = await dbHelper.getAccountBalance(accountId);
    const modal = new QuickTransactionModal(page);

    // Drag income source to account
    await dashboardPage.navigateTo('dashboard');
    await dashboardPage.dragIncomeToAccount('Salary', 'USD Cash');

    // Verify modal opens
    await expect(modal.getModal()).toBeVisible();

    // Enter amount and save
    await modal.enterAmount('1500');
    await modal.enterComment('January salary');
    await modal.save();

    // Verify balance increased
    const newBalance = await dbHelper.getAccountBalance(accountId);
    expect(newBalance).toBe(initialBalance + 1500);

    // Verify transaction count
    const txCount = await dbHelper.getTransactionCount();
    expect(txCount).toBe(1);
  });

  test('should record income with different currencies (source EUR, account USD)', async ({
    page,
    dashboardPage,
    dbHelper,
  }) => {
    // Seed data - EUR source, USD account
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    await dbHelper.seedIncomeSource(testIncomeSources.freelance()); // EUR currency
    await dbHelper.refreshStoreData();
    await page.reload();

    const initialBalance = await dbHelper.getAccountBalance(accountId);
    const modal = new QuickTransactionModal(page);

    // Drag income source to account
    await dashboardPage.navigateTo('dashboard');
    await dashboardPage.dragIncomeToAccount('Freelance', 'USD Cash');

    // Verify modal opens with multi-currency mode
    await expect(modal.getModal()).toBeVisible();
    const isMultiCurrency = await modal.isMultiCurrencyMode();
    expect(isMultiCurrency).toBe(true);

    // Enter amounts (EUR amount and USD account amount)
    await modal.enterAmount('100'); // EUR
    await modal.enterSecondAmount('110'); // USD (account currency)
    await modal.save();

    // Verify balance increased by USD amount
    const newBalance = await dbHelper.getAccountBalance(accountId);
    expect(newBalance).toBe(initialBalance + 110);
  });

  test('should record income to EUR account from EUR source (same non-USD currency)', async ({
    page,
    dashboardPage,
    dbHelper,
  }) => {
    // Seed EUR account and EUR source
    const accountId = await dbHelper.seedAccount(testAccounts.eurBank());
    await dbHelper.seedIncomeSource(testIncomeSources.freelance()); // EUR
    await dbHelper.refreshStoreData();
    await page.reload();

    const initialBalance = await dbHelper.getAccountBalance(accountId);
    const modal = new QuickTransactionModal(page);

    await dashboardPage.navigateTo('dashboard');
    await dashboardPage.dragIncomeToAccount('Freelance', 'EUR Bank');

    await expect(modal.getModal()).toBeVisible();

    // Should be single currency mode (both EUR)
    await modal.enterAmount('500');
    await modal.save();

    const newBalance = await dbHelper.getAccountBalance(accountId);
    expect(newBalance).toBe(initialBalance + 500);
  });

  test('should record income with comment', async ({ page, dashboardPage, historyPage, dbHelper }) => {
    // Seed data
    await dbHelper.seedAccount(testAccounts.usdCash());
    await dbHelper.seedIncomeSource(testIncomeSources.salary());
    await dbHelper.refreshStoreData();
    await page.reload();

    const modal = new QuickTransactionModal(page);

    await dashboardPage.navigateTo('dashboard');
    await dashboardPage.dragIncomeToAccount('Salary', 'USD Cash');

    await modal.enterAmount('2000');
    await modal.enterComment('February paycheck');
    await modal.save();

    // Navigate to history to verify comment
    await historyPage.navigateTo('history');
    await expect(page.locator('text=February paycheck')).toBeVisible();
  });

  test('should record income with custom date', async ({ page, dashboardPage, dbHelper }) => {
    // Seed data
    await dbHelper.seedAccount(testAccounts.usdCash());
    await dbHelper.seedIncomeSource(testIncomeSources.salary());
    await dbHelper.refreshStoreData();
    await page.reload();

    const modal = new QuickTransactionModal(page);

    await dashboardPage.navigateTo('dashboard');
    await dashboardPage.dragIncomeToAccount('Salary', 'USD Cash');

    await modal.enterAmount('1000');
    await modal.setDate('2024-01-15');
    await modal.save();

    // Verify transaction was created
    const txCount = await dbHelper.getTransactionCount();
    expect(txCount).toBe(1);
  });
});
