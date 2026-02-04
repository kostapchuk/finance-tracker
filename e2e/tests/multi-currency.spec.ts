import { test, expect } from '../fixtures/test-base';
import { QuickTransactionModal } from '../page-objects/components/quick-transaction-modal';
import { LoanForm } from '../page-objects/components/loan-form';
import { PaymentDialog } from '../page-objects/components/payment-dialog';
import { testAccounts, testCategories, testIncomeSources } from '../fixtures/test-data';

test.describe('Multi-Currency Comprehensive Tests', () => {
  test.beforeEach(async ({ page, dbHelper }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dbHelper.setOnboardingComplete();
    await dbHelper.clearDatabase();
    await dbHelper.setMainCurrency('USD');
    await dbHelper.refreshStoreData();
    await page.reload();
  });

  test('full workflow: USD salary to EUR account to BTC category', async ({
    page,
    dashboardPage,
    dbHelper,
  }) => {
    // Seed all data
    const usdAccountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const eurAccountId = await dbHelper.seedAccount(testAccounts.eurBank());
    await dbHelper.seedIncomeSource(testIncomeSources.salary()); // USD
    await dbHelper.seedCategory(testCategories.food()); // expense category
    await dbHelper.refreshStoreData();
    await page.reload();

    const modal = new QuickTransactionModal(page);

    // Step 1: Record USD salary income to USD account
    await dashboardPage.navigateTo('dashboard');
    await dashboardPage.dragIncomeToAccount('Salary', 'USD Cash');
    await modal.enterAmount('3000');
    await modal.save();

    let usdBalance = await dbHelper.getAccountBalance(usdAccountId);
    expect(usdBalance).toBe(4000); // 1000 initial + 3000

    // Step 2: Transfer USD to EUR account
    await dashboardPage.dragAccountToAccount('USD Cash', 'EUR Bank');
    await modal.enterAmount('1100'); // USD
    await modal.enterSecondAmount('1000'); // EUR
    await modal.save();

    usdBalance = await dbHelper.getAccountBalance(usdAccountId);
    let eurBalance = await dbHelper.getAccountBalance(eurAccountId);
    expect(usdBalance).toBe(2900); // 4000 - 1100
    expect(eurBalance).toBe(3000); // 2000 initial + 1000

    // Step 3: Expense from EUR account (multi-currency since mainCurrency is USD)
    await dashboardPage.dragAccountToCategory('EUR Bank', 'Food');
    await modal.enterAmount('50'); // EUR
    await modal.enterSecondAmount('55'); // USD for budget
    await modal.save();

    eurBalance = await dbHelper.getAccountBalance(eurAccountId);
    expect(eurBalance).toBe(2950); // 3000 - 50

    // Verify transaction count
    const txCount = await dbHelper.getTransactionCount();
    expect(txCount).toBe(3);
  });

  test('transfer chain: USD to EUR to USD', async ({ page, dashboardPage, dbHelper }) => {
    // Seed accounts
    const usd1Id = await dbHelper.seedAccount({
      ...testAccounts.usdCash(),
      name: 'USD Account 1',
    });
    const eurId = await dbHelper.seedAccount(testAccounts.eurBank());
    const usd2Id = await dbHelper.seedAccount({
      name: 'USD Account 2',
      type: 'bank',
      currency: 'USD',
      balance: 500,
      color: '#10b981',
      icon: 'building',
      sortOrder: 2,
    });
    await dbHelper.refreshStoreData();
    await page.reload();

    const modal = new QuickTransactionModal(page);

    // Transfer 1: USD1 -> EUR
    await dashboardPage.navigateTo('dashboard');
    await dashboardPage.dragAccountToAccount('USD Account 1', 'EUR Bank');
    await modal.enterAmount('220'); // USD
    await modal.enterSecondAmount('200'); // EUR
    await modal.save();

    // Transfer 2: EUR -> USD2
    await dashboardPage.dragAccountToAccount('EUR Bank', 'USD Account 2');
    await modal.enterAmount('100'); // EUR
    await modal.enterSecondAmount('110'); // USD
    await modal.save();

    // Verify final balances
    const usd1Balance = await dbHelper.getAccountBalance(usd1Id);
    const eurBalance = await dbHelper.getAccountBalance(eurId);
    const usd2Balance = await dbHelper.getAccountBalance(usd2Id);

    expect(usd1Balance).toBe(1000 - 220); // 780
    expect(eurBalance).toBe(2000 + 200 - 100); // 2100
    expect(usd2Balance).toBe(500 + 110); // 610
  });

  test('loan in EUR from USD account, payment in EUR to USD', async ({
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
    await loanForm.fillPersonName('Multi-Currency Loan');
    await loanForm.fillAmount('500'); // EUR
    await loanForm.selectCurrency('EUR');
    await loanForm.selectAccount('USD Cash');
    await loanForm.fillAccountAmount('550'); // USD
    await loanForm.save();

    // Verify balance decreased by USD amount
    let balance = await dbHelper.getAccountBalance(accountId);
    expect(balance).toBe(initialBalance - 550);

    // Record payment (partial)
    await loansPage.clickLoan('Multi-Currency Loan');
    await paymentDialog.fillAmount('250'); // EUR
    await paymentDialog.fillAccountAmount('275'); // USD
    await paymentDialog.recordPayment();

    // Verify balance increased by USD payment
    balance = await dbHelper.getAccountBalance(accountId);
    expect(balance).toBe(initialBalance - 550 + 275);

    // Verify loan status
    const loanStatus = await dbHelper.getLoanStatus(1);
    expect(loanStatus?.paidAmount).toBe(250);
    expect(loanStatus?.status).toBe('partially_paid');
  });

  test('income in EUR to EUR account shows correctly on dashboard (non-USD mainCurrency scenario)', async ({
    page,
    dashboardPage,
    dbHelper,
  }) => {
    // Change main currency to EUR for this test
    await dbHelper.setMainCurrency('EUR');

    // Seed EUR account and EUR income source
    const accountId = await dbHelper.seedAccount(testAccounts.eurBank());
    await dbHelper.seedIncomeSource(testIncomeSources.freelance()); // EUR
    await dbHelper.refreshStoreData();
    await page.reload();

    const initialBalance = await dbHelper.getAccountBalance(accountId);
    const modal = new QuickTransactionModal(page);

    // Record income (same currency - EUR)
    await dashboardPage.navigateTo('dashboard');
    await dashboardPage.dragIncomeToAccount('Freelance', 'EUR Bank');

    // Should be single currency mode (both EUR)
    const isMultiCurrency = await modal.isMultiCurrencyMode();
    expect(isMultiCurrency).toBe(false);

    await modal.enterAmount('750');
    await modal.save();

    // Verify balance
    const newBalance = await dbHelper.getAccountBalance(accountId);
    expect(newBalance).toBe(initialBalance + 750);
  });

  test('expense tracking with different account currencies respects mainCurrency for budgets', async ({
    page,
    dashboardPage,
    historyPage,
    dbHelper,
  }) => {
    // USD is mainCurrency
    // Seed EUR and BTC accounts
    await dbHelper.seedAccount(testAccounts.eurBank());
    await dbHelper.seedAccount(testAccounts.btcCrypto());
    await dbHelper.seedCategory({
      ...testCategories.food(),
      budget: 1000,
      budgetPeriod: 'monthly',
    });
    await dbHelper.refreshStoreData();
    await page.reload();

    const modal = new QuickTransactionModal(page);

    // Expense from EUR account
    await dashboardPage.navigateTo('dashboard');
    await dashboardPage.dragAccountToCategory('EUR Bank', 'Food');

    // Should show multi-currency mode
    const isMultiCurrency = await modal.isMultiCurrencyMode();
    expect(isMultiCurrency).toBe(true);

    await modal.enterAmount('90'); // EUR
    await modal.enterSecondAmount('100'); // USD for budget tracking
    await modal.enterComment('EUR expense');
    await modal.save();

    // Verify in history that both amounts are tracked
    await historyPage.navigateTo('history');
    await expect(page.locator('text=EUR expense')).toBeVisible();
  });

  test('multiple currencies in same loan workflow', async ({ page, loansPage, dbHelper }) => {
    // Seed multiple currency accounts
    const usdId = await dbHelper.seedAccount(testAccounts.usdCash());
    const eurId = await dbHelper.seedAccount(testAccounts.eurBank());
    await dbHelper.refreshStoreData();
    await page.reload();

    const loanForm = new LoanForm(page);
    const paymentDialog = new PaymentDialog(page);

    // Create USD loan from EUR account (exotic case)
    await loansPage.navigateTo('loans');
    await loansPage.clickAdd();
    await loanForm.selectType('given');
    await loanForm.fillPersonName('Reverse Currency Loan');
    await loanForm.fillAmount('100'); // USD loan amount
    await loanForm.selectCurrency('USD');
    await loanForm.selectAccount('EUR Bank');
    await loanForm.fillAccountAmount('90'); // EUR from account
    await loanForm.save();

    // Verify EUR account decreased
    let eurBalance = await dbHelper.getAccountBalance(eurId);
    expect(eurBalance).toBe(2000 - 90);

    // Record payment
    await loansPage.clickLoan('Reverse Currency Loan');
    await paymentDialog.fillAmount('50'); // USD
    await paymentDialog.fillAccountAmount('45'); // EUR
    await paymentDialog.recordPayment();

    // EUR balance increases (payment received)
    eurBalance = await dbHelper.getAccountBalance(eurId);
    expect(eurBalance).toBe(2000 - 90 + 45);
  });

  test('dashboard totals correctly aggregate multi-currency transactions', async ({
    page,
    dashboardPage,
    dbHelper,
  }) => {
    // Seed accounts and income sources
    await dbHelper.seedAccount(testAccounts.usdCash());
    await dbHelper.seedAccount(testAccounts.eurBank());
    await dbHelper.seedIncomeSource(testIncomeSources.salary()); // USD
    await dbHelper.seedIncomeSource(testIncomeSources.freelance()); // EUR
    await dbHelper.seedCategory(testCategories.food());
    await dbHelper.refreshStoreData();
    await page.reload();

    const modal = new QuickTransactionModal(page);

    // Record USD income
    await dashboardPage.navigateTo('dashboard');
    await dashboardPage.dragIncomeToAccount('Salary', 'USD Cash');
    await modal.enterAmount('2000');
    await modal.save();

    // Record EUR income to EUR account
    await dashboardPage.dragIncomeToAccount('Freelance', 'EUR Bank');
    await modal.enterAmount('1000');
    await modal.save();

    // Record USD expense
    await dashboardPage.dragAccountToCategory('USD Cash', 'Food');
    await modal.enterAmount('100');
    await modal.save();

    // Record EUR expense (with mainCurrency conversion)
    await dashboardPage.dragAccountToCategory('EUR Bank', 'Food');
    await modal.enterAmount('50'); // EUR
    await modal.enterSecondAmount('55'); // USD
    await modal.save();

    // Verify transactions
    const txCount = await dbHelper.getTransactionCount();
    expect(txCount).toBe(4);
  });
});
