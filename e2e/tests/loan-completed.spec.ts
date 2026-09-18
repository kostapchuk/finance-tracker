import { test, expect } from '../fixtures/test-base';
import { testAccounts } from '../fixtures/test-data';
import type { TestLoan, TestTransaction } from '../fixtures/test-data';

async function seedCompletedLoan(
  dbHelper: import('../helpers/indexeddb.helper').IndexedDBHelper,
  accountId: number,
  personName: string,
  amount: number,
  paidDate: Date
): Promise<number> {
  const loan: TestLoan = {
    type: 'given',
    personName,
    description: '',
    amount,
    currency: 'USD',
    paidAmount: amount,
    status: 'fully_paid',
    accountId,
  };
  const loanId = await dbHelper.seedLoan(loan);

  const payment: TestTransaction = {
    type: 'loan_payment',
    amount,
    currency: 'USD',
    date: paidDate,
    loanId,
    accountId,
    comment: `Payment from ${personName}`,
  };
  await dbHelper.seedTransaction(payment);

  return loanId;
}

test.describe('Completed Loans', () => {
  test.beforeEach(async ({ setupCleanState }) => {
    await setupCleanState();
  });

  test('should open a payment history view when a completed loan is clicked', async ({
    page,
    loansPage,
    dbHelper,
  }) => {
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    await seedCompletedLoan(dbHelper, accountId, 'Completed Alice', 250, new Date());
    await dbHelper.refreshStoreData();
    await page.reload();

    await loansPage.navigateTo('loans');
    await expect(loansPage.getCompletedLoans()).toHaveCount(1);

    await loansPage.clickCompletedLoan('Completed Alice');

    await expect(loansPage.getLoanDetailDialog()).toBeVisible();
    await expect(loansPage.getLoanDetailDialog()).toContainText('Completed Alice');
    await expect(loansPage.getLoanDetailPayments()).toHaveCount(1);
  });

  test('should navigate to history and open the transaction when a payment row is clicked', async ({
    page,
    loansPage,
    dbHelper,
  }) => {
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    await seedCompletedLoan(dbHelper, accountId, 'Completed Bob', 400, new Date());
    await dbHelper.refreshStoreData();
    await page.reload();

    await loansPage.navigateTo('loans');
    await loansPage.clickCompletedLoan('Completed Bob');
    await loansPage.clickLoanDetailPayment(0);

    // Left the Loans page for History, and the transaction's edit dialog is open
    await expect(page.locator('h1').filter({ hasText: /history|история/i })).toBeVisible();
    const dialog = page.locator('.fixed .shadow-lg.rounded-lg');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Completed Bob');
  });

  test('should paginate completed loans the same way history does', async ({
    page,
    loansPage,
    dbHelper,
  }) => {
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const now = new Date();
    for (let i = 0; i < 60; i++) {
      // Spread across the current month so all 60 land in the default filter
      const paidDate = new Date(now.getFullYear(), now.getMonth(), 1 + (i % 27));
      await seedCompletedLoan(dbHelper, accountId, `Paid Loan ${i}`, 10, paidDate);
    }
    await dbHelper.refreshStoreData();
    await page.reload();

    await loansPage.navigateTo('loans');

    const initialCount = await loansPage.getCompletedCount();
    expect(initialCount).toBe(50);

    await loansPage.scrollToBottom();
    await loansPage.waitForMoreCompletedLoans(initialCount);

    const finalCount = await loansPage.getCompletedCount();
    expect(finalCount).toBe(60);

    await expect(page.locator('text=/showing all|показаны все/i')).toBeVisible();
  });

  test('should only count a loan as completed this month once it was last paid off in it', async ({
    page,
    loansPage,
    dbHelper,
  }) => {
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    await seedCompletedLoan(dbHelper, accountId, 'Paid Last Month', 100, lastMonth);
    await dbHelper.refreshStoreData();
    await page.reload();

    await loansPage.navigateTo('loans');

    await expect(page.locator('text=/no completed loans in this period|нет завершённых долгов/i')).toBeVisible();
    await expect(loansPage.getCompletedLoans()).toHaveCount(0);
  });
});
