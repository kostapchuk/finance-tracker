import { test, expect } from '../fixtures/test-base';
import { LoanForm } from '../page-objects/components/loan-form';
import { PaymentDialog } from '../page-objects/components/payment-dialog';
import { testAccounts } from '../fixtures/test-data';

test.describe('Loan Management', () => {
  test.beforeEach(async ({ page, dbHelper }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dbHelper.setOnboardingComplete();
    await dbHelper.clearDatabase();
    await dbHelper.setMainCurrency('USD');
    await dbHelper.refreshStoreData();
    await page.reload();
  });

  test('should create a loan given (money lent out) - account balance decreases', async ({
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

    // Navigate to loans and add
    await loansPage.navigateTo('loans');
    await loansPage.clickAdd();

    // Fill form
    await loanForm.selectType('given');
    await loanForm.fillPersonName('John Doe');
    await loanForm.fillDescription('Vacation loan');
    await loanForm.fillAmount('500');
    await loanForm.selectAccount('USD Cash');
    await loanForm.save();

    // Verify loan appears in "Money Given" section
    await expect(loansPage.getLoanByPersonName('John Doe')).toBeVisible();

    // Verify account balance decreased (money went out)
    const newBalance = await dbHelper.getAccountBalance(accountId);
    expect(newBalance).toBe(initialBalance - 500);

    // Verify transaction was created
    const txCount = await dbHelper.getTransactionCount();
    expect(txCount).toBe(1);
  });

  test('should create a loan received (money borrowed) - account balance increases', async ({
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

    // Navigate to loans and add
    await loansPage.navigateTo('loans');
    await loansPage.clickAdd();

    // Fill form
    await loanForm.selectType('received');
    await loanForm.fillPersonName('Jane Smith');
    await loanForm.fillDescription('Personal loan');
    await loanForm.fillAmount('1000');
    await loanForm.selectAccount('USD Cash');
    await loanForm.save();

    // Verify loan appears in "Money Received" section
    await expect(loansPage.getLoanByPersonName('Jane Smith')).toBeVisible();

    // Verify account balance increased (money came in)
    const newBalance = await dbHelper.getAccountBalance(accountId);
    expect(newBalance).toBe(initialBalance + 1000);
  });

  test('should create multi-currency loan (EUR loan, USD account)', async ({
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

    // Navigate to loans and add
    await loansPage.navigateTo('loans');
    await loansPage.clickAdd();

    // Fill form with EUR currency for loan but USD account
    await loanForm.selectType('given');
    await loanForm.fillPersonName('Pierre');
    await loanForm.fillDescription('EUR loan');
    await loanForm.fillAmount('200');
    await loanForm.selectCurrency('EUR');
    await loanForm.selectAccount('USD Cash');

    // Should now show multi-currency mode
    const isMultiCurrency = await loanForm.isMultiCurrencyMode();
    expect(isMultiCurrency).toBe(true);

    // Fill account amount
    await loanForm.fillAccountAmount('220'); // USD equivalent
    await loanForm.save();

    // Verify account balance decreased by USD amount
    const newBalance = await dbHelper.getAccountBalance(accountId);
    expect(newBalance).toBe(initialBalance - 220);
  });

  test('should set due date for loan', async ({ page, loansPage, dbHelper }) => {
    // Seed account
    await dbHelper.seedAccount(testAccounts.usdCash());
    await dbHelper.refreshStoreData();
    await page.reload();

    const loanForm = new LoanForm(page);

    await loansPage.navigateTo('loans');
    await loansPage.clickAdd();

    await loanForm.selectType('given');
    await loanForm.fillPersonName('Bob');
    await loanForm.fillAmount('300');
    await loanForm.setDueDate('2025-06-15');
    await loanForm.selectAccount('USD Cash');
    await loanForm.save();

    await expect(loansPage.getLoanByPersonName('Bob')).toBeVisible();
  });

  test('should edit loan details', async ({ page, loansPage, dbHelper }) => {
    // Seed account and create a loan via UI
    await dbHelper.seedAccount(testAccounts.usdCash());
    await dbHelper.refreshStoreData();
    await page.reload();

    const loanForm = new LoanForm(page);
    const paymentDialog = new PaymentDialog(page);

    // Create loan
    await loansPage.navigateTo('loans');
    await loansPage.clickAdd();
    await loanForm.selectType('given');
    await loanForm.fillPersonName('Original Name');
    await loanForm.fillAmount('400');
    await loanForm.selectAccount('USD Cash');
    await loanForm.save();

    // Click on loan to open payment dialog
    await loansPage.clickLoan('Original Name');

    // Click edit loan button
    await paymentDialog.editLoan();

    // Edit the name
    await loanForm.fillPersonName('Updated Name');
    await loanForm.save();

    // Verify updated name
    await expect(loansPage.getLoanByPersonName('Updated Name')).toBeVisible();
  });

  test('should delete loan', async ({ page, loansPage, dbHelper }) => {
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
    await loanForm.fillPersonName('To Delete');
    await loanForm.fillAmount('250');
    await loanForm.selectAccount('USD Cash');
    await loanForm.save();

    // Verify balance decreased
    let balance = await dbHelper.getAccountBalance(accountId);
    expect(balance).toBe(initialBalance - 250);

    // Click on loan to open payment dialog
    await loansPage.clickLoan('To Delete');

    // Delete
    await paymentDialog.deleteLoan();

    // Handle confirmation
    const confirmButton = page.locator('button').filter({ hasText: /confirm|yes|да|ok/i });
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    }
    await page.waitForTimeout(500);

    // Verify loan is gone
    await expect(loansPage.getLoanByPersonName('To Delete')).not.toBeVisible();
  });

  test('should show loan summary amounts correctly', async ({ page, loansPage, dbHelper }) => {
    // Seed account
    await dbHelper.seedAccount(testAccounts.usdCash());
    await dbHelper.refreshStoreData();
    await page.reload();

    const loanForm = new LoanForm(page);

    // Create a loan given
    await loansPage.navigateTo('loans');
    await loansPage.clickAdd();
    await loanForm.selectType('given');
    await loanForm.fillPersonName('Person A');
    await loanForm.fillAmount('1000');
    await loanForm.selectAccount('USD Cash');
    await loanForm.save();

    // Create a loan received
    await loansPage.clickAdd();
    await loanForm.selectType('received');
    await loanForm.fillPersonName('Person B');
    await loanForm.fillAmount('500');
    await loanForm.selectAccount('USD Cash');
    await loanForm.save();

    // Verify "Owed to you" shows $1000
    await expect(loansPage.getOwedToYouAmount()).toContainText('1,000');

    // Verify "You owe" shows $500
    await expect(loansPage.getYouOweAmount()).toContainText('500');
  });
});
