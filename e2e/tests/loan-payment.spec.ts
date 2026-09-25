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
    await dbHelper.seedAccount(testAccounts.usdCash());
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

    // Record payment (comment field not available for new payments)
    await loansPage.clickLoan('History Test');
    await paymentDialog.fillAmount('100');
    await paymentDialog.recordPayment();

    // Navigate to history and filter by loans
    await historyPage.navigateTo('history');
    await historyPage.filterByType('loans');

    // Verify payment appears (auto-generated comment includes "Payment received from")
    await expect(page.locator('text=Payment received from History Test')).toBeVisible();
  });

  test('should record payment to different account than loan account', async ({
    page,
    loansPage,
    dbHelper,
  }) => {
    // Seed two accounts: USD Cash and EUR Bank
    const usdAccountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const eurAccountId = await dbHelper.seedAccount(testAccounts.eurBank());
    await dbHelper.refreshStoreData();
    await page.reload();

    const initialUsdBalance = await dbHelper.getAccountBalance(usdAccountId);
    const initialEurBalance = await dbHelper.getAccountBalance(eurAccountId);
    const loanForm = new LoanForm(page);
    const paymentDialog = new PaymentDialog(page);

    // Create loan given from USD Cash account
    await loansPage.navigateTo('loans');
    await loansPage.clickAdd();
    await loanForm.selectType('given');
    await loanForm.fillPersonName('Different Account Test');
    await loanForm.fillAmount('500');
    await loanForm.selectAccount('USD Cash');
    await loanForm.save();

    // USD balance should have decreased
    let usdBalance = await dbHelper.getAccountBalance(usdAccountId);
    expect(usdBalance).toBe(initialUsdBalance - 500);

    // EUR balance should be unchanged
    let eurBalance = await dbHelper.getAccountBalance(eurAccountId);
    expect(eurBalance).toBe(initialEurBalance);

    // Click loan to open payment dialog
    await loansPage.clickLoan('Different Account Test');

    // Select EUR Bank as payment account (multi-currency)
    await paymentDialog.selectAccount('EUR Bank');

    // Fill amounts (loan currency USD -> account currency EUR)
    await paymentDialog.fillAmount('200'); // USD
    await paymentDialog.fillAccountAmount('180'); // EUR

    await paymentDialog.recordPayment();

    // USD balance should remain unchanged (payment went to EUR account)
    usdBalance = await dbHelper.getAccountBalance(usdAccountId);
    expect(usdBalance).toBe(initialUsdBalance - 500);

    // EUR balance should increase (payment received in EUR account)
    eurBalance = await dbHelper.getAccountBalance(eurAccountId);
    expect(eurBalance).toBe(initialEurBalance + 180);

    // Verify loan status
    const loanStatus = await dbHelper.getLoanStatus(1);
    expect(loanStatus?.paidAmount).toBe(200);
    expect(loanStatus?.status).toBe('partially_paid');
  });

  test('should record payment to different account with same currency', async ({
    page,
    loansPage,
    dbHelper,
  }) => {
    // Seed two USD accounts
    const cashAccountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const creditAccountId = await dbHelper.seedAccount(testAccounts.creditCard());
    await dbHelper.refreshStoreData();
    await page.reload();

    const initialCashBalance = await dbHelper.getAccountBalance(cashAccountId);
    const initialCreditBalance = await dbHelper.getAccountBalance(creditAccountId);
    const loanForm = new LoanForm(page);
    const paymentDialog = new PaymentDialog(page);

    // Create loan given from USD Cash
    await loansPage.navigateTo('loans');
    await loansPage.clickAdd();
    await loanForm.selectType('given');
    await loanForm.fillPersonName('Same Currency Different Account');
    await loanForm.fillAmount('300');
    await loanForm.selectAccount('USD Cash');
    await loanForm.save();

    // Cash balance decreased
    let cashBalance = await dbHelper.getAccountBalance(cashAccountId);
    expect(cashBalance).toBe(initialCashBalance - 300);

    // Click loan
    await loansPage.clickLoan('Same Currency Different Account');

    // Select Credit Card as payment account
    await paymentDialog.selectAccount('Credit Card');

    // Fill amount (same currency, no dual input needed)
    await paymentDialog.fillAmount('150');

    await paymentDialog.recordPayment();

    // Cash balance unchanged
    cashBalance = await dbHelper.getAccountBalance(cashAccountId);
    expect(cashBalance).toBe(initialCashBalance - 300);

    // Credit Card balance increased (money returned to this account)
    const creditBalance = await dbHelper.getAccountBalance(creditAccountId);
    expect(creditBalance).toBe(initialCreditBalance + 150);

    // Verify loan status
    const loanStatus = await dbHelper.getLoanStatus(1);
    expect(loanStatus?.paidAmount).toBe(150);
  });

  test('should record payment using the main-currency amount field (loan and account share a non-main currency)', async ({
    page,
    loansPage,
    dbHelper,
  }) => {
    // Main currency is USD (set by setupCleanState). Loan and its account are
    // both EUR, so neither can serve as the main-currency total directly —
    // the payment dialog must show a manual USD conversion field.
    const accountId = await dbHelper.seedAccount(testAccounts.eurBank());
    await dbHelper.seedLoan({
      type: 'given',
      personName: 'Main Currency Field Test',
      description: '',
      amount: 500,
      currency: 'EUR',
      paidAmount: 0,
      status: 'active',
      accountId,
    });
    await dbHelper.refreshStoreData();
    await page.reload();

    const initialBalance = await dbHelper.getAccountBalance(accountId);
    const paymentDialog = new PaymentDialog(page);

    await loansPage.navigateTo('loans');
    await loansPage.clickLoan('Main Currency Field Test');

    // Single amount field (loan currency === account currency), plus the
    // separate main-currency field since neither is USD.
    await paymentDialog.fillAmount('200'); // EUR
    await paymentDialog.fillMainCurrencyAmount('220'); // USD equivalent

    await paymentDialog.recordPayment();

    // The EUR account balance moves by the EUR payment amount.
    const balance = await dbHelper.getAccountBalance(accountId);
    expect(balance).toBe(initialBalance + 200);

    // The loan's paidAmount is tracked in the loan's own currency (EUR), not
    // the manually-entered USD conversion.
    const loanStatus = await dbHelper.getLoanStatus(1);
    expect(loanStatus?.paidAmount).toBe(200);
    expect(loanStatus?.status).toBe('partially_paid');
  });

  test('should record payment when loan, account and main currency are all different', async ({
    page,
    loansPage,
    dbHelper,
  }) => {
    // Main currency is USD. Loan is BTC, paid from a EUR account — three
    // distinct currencies, so both the account-amount field (BTC -> EUR)
    // and the main-currency field (-> USD) must appear together.
    const accountId = await dbHelper.seedAccount(testAccounts.eurBank());
    await dbHelper.seedLoan({
      type: 'given',
      personName: 'Triple Currency Test',
      description: '',
      amount: 0.1,
      currency: 'BTC',
      paidAmount: 0,
      status: 'active',
      accountId,
    });
    await dbHelper.refreshStoreData();
    await page.reload();

    const initialBalance = await dbHelper.getAccountBalance(accountId);
    const paymentDialog = new PaymentDialog(page);

    await loansPage.navigateTo('loans');
    await loansPage.clickLoan('Triple Currency Test');

    await paymentDialog.fillAmount('0.05'); // BTC
    await paymentDialog.fillAccountAmount('3000'); // EUR
    await paymentDialog.fillMainCurrencyAmount('3300'); // USD

    await paymentDialog.recordPayment();

    // EUR account balance moves by the EUR amount.
    const balance = await dbHelper.getAccountBalance(accountId);
    expect(balance).toBe(initialBalance + 3000);

    // paidAmount is tracked in the loan's own currency (BTC).
    const loanStatus = await dbHelper.getLoanStatus(1);
    expect(loanStatus?.paidAmount).toBe(0.05);
    expect(loanStatus?.status).toBe('partially_paid');
  });
});
