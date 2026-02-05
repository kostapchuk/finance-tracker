import { test, expect } from '../fixtures/test-base';
import { testAccounts, testCategories, testIncomeSources } from '../fixtures/test-data';

test.describe('Transaction Edit/Delete', () => {
  test.beforeEach(async ({ setupCleanState }) => {
    await setupCleanState();
  });

  test('should edit income transaction amount from history', async ({
    page,
    historyPage,
    dbHelper,
  }) => {
    // Seed account and income source
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const incomeId = await dbHelper.seedIncomeSource(testIncomeSources.salary());

    // Seed an income transaction
    await dbHelper.seedTransaction({
      type: 'income',
      amount: 1000,
      currency: 'USD',
      accountId,
      incomeSourceId: incomeId,
      date: new Date(),
      comment: 'Initial salary',
    });
    // Also update the account balance to reflect the income
    await dbHelper.updateAccountBalance(accountId, 2000); // 1000 initial + 1000 income
    await dbHelper.refreshStoreData();

    // Navigate to history and click transaction to edit
    await historyPage.navigateTo('history');
    await historyPage.filterByType('income');
    await historyPage.clickTransactionByComment('Initial salary');
    await page.waitForTimeout(300);

    // Find the amount input (text input with inputMode="decimal")
    const amountInput = page.locator('input[inputmode="decimal"]').first();
    await amountInput.click();
    await amountInput.fill('1500');

    // Click Update button
    await page.locator('button').filter({ hasText: /update|обновить/i }).click();
    await page.waitForTimeout(500);

    // Verify balance was updated correctly (original was 2000, changed by +500 = 2500)
    const finalBalance = await dbHelper.getAccountBalance(accountId);
    expect(finalBalance).toBe(2500);
  });

  test('should edit expense transaction comment', async ({
    page,
    historyPage,
    dbHelper,
  }) => {
    // Seed account and category
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const catId = await dbHelper.seedCategory(testCategories.food());

    // Seed an expense transaction
    await dbHelper.seedTransaction({
      type: 'expense',
      amount: 50,
      currency: 'USD',
      accountId,
      categoryId: catId,
      date: new Date(),
      comment: 'Old comment',
    });
    await dbHelper.updateAccountBalance(accountId, 950); // 1000 - 50 expense
    await dbHelper.refreshStoreData();

    // Navigate to history and click transaction to edit
    await historyPage.navigateTo('history');
    await historyPage.filterByType('expense');
    await historyPage.clickTransactionByComment('Old comment');
    await page.waitForTimeout(300);

    // Find the comment textarea and update it
    const commentTextarea = page.locator('textarea');
    await commentTextarea.click();
    await commentTextarea.fill('Updated grocery shopping');

    // Click Update button
    await page.locator('button').filter({ hasText: /update|обновить/i }).click();
    await page.waitForTimeout(500);

    // Verify updated comment appears in history
    await expect(page.locator('text=Updated grocery shopping')).toBeVisible();
    await expect(page.locator('text=Old comment')).not.toBeVisible();
  });

  test('should edit transfer transaction amounts for multi-currency', async ({
    page,
    historyPage,
    dbHelper,
  }) => {
    // Seed two accounts
    const usdAccountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const eurAccountId = await dbHelper.seedAccount(testAccounts.eurBank());

    // Seed a transfer transaction (USD -> EUR)
    await dbHelper.seedTransaction({
      type: 'transfer',
      amount: 100,
      currency: 'USD',
      accountId: usdAccountId,
      toAccountId: eurAccountId,
      toAmount: 90,
      date: new Date(),
      comment: 'Initial transfer',
    });
    // Update balances to reflect transfer
    await dbHelper.updateAccountBalance(usdAccountId, 900); // 1000 - 100
    await dbHelper.updateAccountBalance(eurAccountId, 2090); // 2000 + 90
    await dbHelper.refreshStoreData();

    // Navigate to history and filter by transfers
    await historyPage.navigateTo('history');
    await historyPage.filterByType('transfers');
    await historyPage.clickTransactionByComment('Initial transfer');
    await page.waitForTimeout(300);

    // Find the amount inputs and update them
    const amountInputs = page.locator('input[inputmode="decimal"]');
    await amountInputs.first().click();
    await amountInputs.first().fill('150');
    await amountInputs.nth(1).click();
    await amountInputs.nth(1).fill('135');

    // Click Update button
    await page.locator('button').filter({ hasText: /update|обновить/i }).click();
    await page.waitForTimeout(500);

    // Verify balances after edit
    const usdBalance = await dbHelper.getAccountBalance(usdAccountId);
    const eurBalance = await dbHelper.getAccountBalance(eurAccountId);
    expect(usdBalance).toBe(850); // 1000 - 150
    expect(eurBalance).toBe(2135); // 2000 + 135
  });

  test('should delete income transaction and reverse balance', async ({
    page,
    historyPage,
    dbHelper,
  }) => {
    // Seed account and income source
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const incomeId = await dbHelper.seedIncomeSource(testIncomeSources.salary());

    // Initial balance is 1000, seed an income transaction
    await dbHelper.seedTransaction({
      type: 'income',
      amount: 2000,
      currency: 'USD',
      accountId,
      incomeSourceId: incomeId,
      date: new Date(),
      comment: 'To be deleted',
    });
    await dbHelper.updateAccountBalance(accountId, 3000); // 1000 + 2000 income
    await dbHelper.refreshStoreData();

    const balanceAfterCreate = await dbHelper.getAccountBalance(accountId);
    expect(balanceAfterCreate).toBe(3000);

    // Set up dialog handler BEFORE clicking delete
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Navigate to history and click transaction to open edit view
    await historyPage.navigateTo('history');
    await historyPage.filterByType('income');
    await historyPage.clickTransactionByComment('To be deleted');
    await page.waitForTimeout(300);

    // Find and click delete button (trash icon)
    await page.locator('button').filter({ has: page.locator('.lucide-trash-2') }).click();
    await page.waitForTimeout(500);

    // Verify balance was reversed
    const finalBalance = await dbHelper.getAccountBalance(accountId);
    expect(finalBalance).toBe(1000);

    // Verify transaction is gone
    const txCount = await dbHelper.getTransactionCount();
    expect(txCount).toBe(0);
  });

  test('should delete expense transaction and reverse balance', async ({
    page,
    historyPage,
    dbHelper,
  }) => {
    // Seed account and category
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const catId = await dbHelper.seedCategory(testCategories.food());

    // Seed an expense transaction
    await dbHelper.seedTransaction({
      type: 'expense',
      amount: 75,
      currency: 'USD',
      accountId,
      categoryId: catId,
      date: new Date(),
      comment: 'Expense to delete',
    });
    await dbHelper.updateAccountBalance(accountId, 925); // 1000 - 75
    await dbHelper.refreshStoreData();

    const balanceAfterCreate = await dbHelper.getAccountBalance(accountId);
    expect(balanceAfterCreate).toBe(925);

    // Set up dialog handler BEFORE clicking delete
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Navigate to history and click transaction to open edit view
    await historyPage.navigateTo('history');
    await historyPage.filterByType('expense');
    await historyPage.clickTransactionByComment('Expense to delete');
    await page.waitForTimeout(300);

    // Find and click delete button (trash icon)
    await page.locator('button').filter({ has: page.locator('.lucide-trash-2') }).click();
    await page.waitForTimeout(500);

    // Verify balance was reversed
    const finalBalance = await dbHelper.getAccountBalance(accountId);
    expect(finalBalance).toBe(1000);
  });

  test('should delete transfer and reverse both account balances', async ({
    page,
    historyPage,
    dbHelper,
  }) => {
    // Seed two accounts
    const usdAccountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const eurAccountId = await dbHelper.seedAccount(testAccounts.eurBank());

    // Seed a transfer transaction
    await dbHelper.seedTransaction({
      type: 'transfer',
      amount: 100,
      currency: 'USD',
      accountId: usdAccountId,
      toAccountId: eurAccountId,
      toAmount: 90,
      date: new Date(),
      comment: 'Transfer to delete',
    });
    // Update balances to reflect transfer
    await dbHelper.updateAccountBalance(usdAccountId, 900); // 1000 - 100
    await dbHelper.updateAccountBalance(eurAccountId, 2090); // 2000 + 90
    await dbHelper.refreshStoreData();

    // Set up dialog handler BEFORE clicking delete
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Navigate to history and filter by transfers
    await historyPage.navigateTo('history');
    await historyPage.filterByType('transfers');
    await historyPage.clickTransactionByComment('Transfer to delete');
    await page.waitForTimeout(300);

    // Find and click delete button (trash icon)
    await page.locator('button').filter({ has: page.locator('.lucide-trash-2') }).click();
    await page.waitForTimeout(500);

    // Verify both balances were reversed
    const usdFinal = await dbHelper.getAccountBalance(usdAccountId);
    const eurFinal = await dbHelper.getAccountBalance(eurAccountId);
    expect(usdFinal).toBe(1000); // Original balance restored
    expect(eurFinal).toBe(2000); // Original balance restored
  });
});
