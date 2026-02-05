import { test, expect } from '../fixtures/test-base';
import { LoanForm } from '../page-objects/components/loan-form';
import { PaymentDialog } from '../page-objects/components/payment-dialog';
import { testAccounts } from '../fixtures/test-data';

test.describe('Loan Payments', () => {
  test.beforeEach(async ({ setupCleanState }) => {
    await setupCleanState();
  });

  test('should record partial payment on loan given - balance increases', async ({
    page,
    loansPage,
    dbHelper,
  }) => {
    // Seed account and create loan
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    await dbHelper.refreshStoreData();
    await page.reload();

    const initialBalance = await dbHelper.getAccountBalance(accountId);
    const loanForm = new LoanForm(page);
    const paymentDialog = new PaymentDialog(page);

    // Create loan given
    await loansPage.navigateTo('loans');
    await loansPage.clickAdd();
    await loanForm.selectType('given');
    await loanForm.fillPersonName('John');
    await loanForm.fillAmount('500');
    await loanForm.selectAccount('USD Cash');
    await loanForm.save();

    // Balance should have decreased
    let balance = await dbHelper.getAccountBalance(accountId);
    expect(balance).toBe(initialBalance - 500);

    // Click loan to open payment dialog
    await loansPage.clickLoan('John');

    // Record partial payment
    await paymentDialog.fillAmount('200');
    await paymentDialog.recordPayment();

    // Balance should increase (money returned)
    balance = await dbHelper.getAccountBalance(accountId);
    expect(balance).toBe(initialBalance - 500 + 200);

    // Verify loan status shows partial payment
    const loanStatus = await dbHelper.getLoanStatus(1);
    expect(loanStatus?.paidAmount).toBe(200);
    expect(loanStatus?.status).toBe('partially_paid');
  });

  test('should record partial payment on loan received - balance decreases', async ({
    page,
    loansPage,
    dbHelper,
  }) => {
    // Seed account and create loan
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    await dbHelper.refreshStoreData();
    await page.reload();

    const initialBalance = await dbHelper.getAccountBalance(accountId);
    const loanForm = new LoanForm(page);
    const paymentDialog = new PaymentDialog(page);

    // Create loan received
    await loansPage.navigateTo('loans');
    await loansPage.clickAdd();
    await loanForm.selectType('received');
    await loanForm.fillPersonName('Jane');
    await loanForm.fillAmount('1000');
    await loanForm.selectAccount('USD Cash');
    await loanForm.save();

    // Balance should have increased
    let balance = await dbHelper.getAccountBalance(accountId);
    expect(balance).toBe(initialBalance + 1000);

    // Click loan to open payment dialog
    await loansPage.clickLoan('Jane');

    // Record partial payment
    await paymentDialog.fillAmount('300');
    await paymentDialog.recordPayment();

    // Balance should decrease (paying back)
    balance = await dbHelper.getAccountBalance(accountId);
    expect(balance).toBe(initialBalance + 1000 - 300);
  });

  test('should record full payment - loan status becomes fully_paid', async ({
    page,
    loansPage,
    dbHelper,
  }) => {
    // Seed account and create loan
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    await dbHelper.refreshStoreData();
    await page.reload();

    const loanForm = new LoanForm(page);
    const paymentDialog = new PaymentDialog(page);

    // Create loan given
    await loansPage.navigateTo('loans');
    await loansPage.clickAdd();
    await loanForm.selectType('given');
    await loanForm.fillPersonName('Full Payment Test');
    await loanForm.fillAmount('300');
    await loanForm.selectAccount('USD Cash');
    await loanForm.save();

    // Click loan to open payment dialog
    await loansPage.clickLoan('Full Payment Test');

    // Record full payment
    await paymentDialog.fillAmount('300');
    await paymentDialog.recordPayment();

    // Verify loan is fully paid
    const loanStatus = await dbHelper.getLoanStatus(1);
    expect(loanStatus?.paidAmount).toBe(300);
    expect(loanStatus?.status).toBe('fully_paid');

    // Loan should move to completed section
    await expect(loansPage.getCompletedSection()).toBeVisible();
  });

  test('should use pay remaining button for full payment', async ({
    page,
    loansPage,
    dbHelper,
  }) => {
    // Seed account and create loan
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    await dbHelper.refreshStoreData();
    await page.reload();

    const initialBalance = await dbHelper.getAccountBalance(accountId);
    const loanForm = new LoanForm(page);
    const paymentDialog = new PaymentDialog(page);

    // Create loan given
    await loansPage.navigateTo('loans');
    await loansPage.clickAdd();
    await loanForm.selectType('given');
    await loanForm.fillPersonName('Pay Remaining Test');
    await loanForm.fillAmount('400');
    await loanForm.selectAccount('USD Cash');
    await loanForm.save();

    // Click loan
    await loansPage.clickLoan('Pay Remaining Test');

    // Use pay remaining button
    await paymentDialog.payRemaining();

    // Verify full balance change
    const balance = await dbHelper.getAccountBalance(accountId);
    expect(balance).toBe(initialBalance - 400 + 400); // loan given minus, payment plus

    // Verify fully paid status
    const loanStatus = await dbHelper.getLoanStatus(1);
    expect(loanStatus?.status).toBe('fully_paid');
  });

  test('should record multi-currency payment (EUR loan, USD account)', async ({
    page,
    loansPage,
    dbHelper,
  }) => {
    // Seed USD account
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    await dbHelper.refreshStoreData();
    await page.reload();

    const initialBalance = await dbHelper.getAccountBalance(accountId);
    const loanForm = new LoanForm(page);
    const paymentDialog = new PaymentDialog(page);

    // Create EUR loan from USD account
    await loansPage.navigateTo('loans');
    await loansPage.clickAdd();
    await loanForm.selectType('given');
    await loanForm.fillPersonName('EUR Payment Test');
    await loanForm.fillAmount('200');
    await loanForm.selectCurrency('EUR');
    await loanForm.selectAccount('USD Cash');
    await loanForm.fillAccountAmount('220');
    await loanForm.save();

    // Balance decreased by USD amount
    let balance = await dbHelper.getAccountBalance(accountId);
    expect(balance).toBe(initialBalance - 220);

    // Click loan
    await loansPage.clickLoan('EUR Payment Test');

    // Record partial payment (multi-currency)
    await paymentDialog.fillAmount('100'); // EUR
    await paymentDialog.fillAccountAmount('110'); // USD

    await paymentDialog.recordPayment();

    // Balance should increase by USD payment amount
    balance = await dbHelper.getAccountBalance(accountId);
    expect(balance).toBe(initialBalance - 220 + 110);
  });

  test('should record multiple payments on same loan', async ({
    page,
    loansPage,
    dbHelper,
  }) => {
    // Seed account
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    await dbHelper.refreshStoreData();
    await page.reload();

    const initialBalance = await dbHelper.getAccountBalance(accountId);
    const loanForm = new LoanForm(page);
    const paymentDialog = new PaymentDialog(page);

    // Create loan
    await loansPage.navigateTo('loans');
    await loansPage.clickAdd();
    await loanForm.selectType('given');
    await loanForm.fillPersonName('Multiple Payments');
    await loanForm.fillAmount('600');
    await loanForm.selectAccount('USD Cash');
    await loanForm.save();

    // First payment
    await loansPage.clickLoan('Multiple Payments');
    await paymentDialog.fillAmount('200');
    await paymentDialog.recordPayment();

    // Second payment
    await loansPage.clickLoan('Multiple Payments');
    await paymentDialog.fillAmount('150');
    await paymentDialog.recordPayment();

    // Verify total paid amount
    const loanStatus = await dbHelper.getLoanStatus(1);
    expect(loanStatus?.paidAmount).toBe(350);
    expect(loanStatus?.status).toBe('partially_paid');

    // Verify balance
    const balance = await dbHelper.getAccountBalance(accountId);
    expect(balance).toBe(initialBalance - 600 + 350);
  });

  test('should show payment in transaction history', async ({
    page,
    loansPage,
    historyPage,
    dbHelper,
  }) => {
    // Seed account
    await dbHelper.seedAccount(testAccounts.usdCash());
    await dbHelper.refreshStoreData();
    await page.reload();

    const loanForm = new LoanForm(page);
    const paymentDialog = new PaymentDialog(page);

    // Create loan
    await loansPage.navigateTo('loans');
    await loansPage.clickAdd();
    await loanForm.selectType('given');
    await loanForm.fillPersonName('History Test');
    await loanForm.fillAmount('500');
    await loanForm.selectAccount('USD Cash');
    await loanForm.save();

    // Record payment
    await loansPage.clickLoan('History Test');
    await paymentDialog.fillAmount('100');
    await paymentDialog.fillComment('First payment');
    await paymentDialog.recordPayment();

    // Navigate to history and filter by loans
    await historyPage.navigateTo('history');
    await historyPage.filterByType('loans');

    // Verify payment appears
    await expect(page.locator('text=First payment')).toBeVisible();
  });
});
