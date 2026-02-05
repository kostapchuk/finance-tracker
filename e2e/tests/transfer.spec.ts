import { test, expect } from '../fixtures/test-base';
import { QuickTransactionModal } from '../page-objects/components/quick-transaction-modal';
import { testAccounts } from '../fixtures/test-data';

test.describe('Transfer Transactions', () => {
  test.beforeEach(async ({ setupCleanState }) => {
    await setupCleanState();
  });

  test('should transfer between accounts with same currency (single input)', async ({
    page,
    dashboardPage,
    dbHelper,
  }) => {
    // Seed two USD accounts
    const fromAccountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const toAccountId = await dbHelper.seedAccount({
      name: 'USD Savings',
      type: 'bank',
      currency: 'USD',
      balance: 500,
      color: '#3b82f6',
      icon: 'piggy-bank',
      sortOrder: 1,
    });
    await dbHelper.refreshStoreData();
    await page.reload();

    const fromInitial = await dbHelper.getAccountBalance(fromAccountId);
    const toInitial = await dbHelper.getAccountBalance(toAccountId);
    const modal = new QuickTransactionModal(page);

    // Drag from account to account
    await dashboardPage.navigateTo('dashboard');
    await dashboardPage.dragAccountToAccount('USD Cash', 'USD Savings');

    // Verify modal opens
    await expect(modal.getModal()).toBeVisible();

    // Should be single currency mode
    const isMultiCurrency = await modal.isMultiCurrencyMode();
    expect(isMultiCurrency).toBe(false);

    // Enter amount and save
    await modal.enterAmount('200');
    await modal.save();

    // Verify balances
    const fromNew = await dbHelper.getAccountBalance(fromAccountId);
    const toNew = await dbHelper.getAccountBalance(toAccountId);
    expect(fromNew).toBe(fromInitial - 200);
    expect(toNew).toBe(toInitial + 200);
  });

  test('should transfer between accounts with different currencies (dual inputs)', async ({
    page,
    dashboardPage,
    dbHelper,
  }) => {
    // Seed USD and EUR accounts
    const usdAccountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const eurAccountId = await dbHelper.seedAccount(testAccounts.eurBank());
    await dbHelper.refreshStoreData();
    await page.reload();

    const usdInitial = await dbHelper.getAccountBalance(usdAccountId);
    const eurInitial = await dbHelper.getAccountBalance(eurAccountId);
    const modal = new QuickTransactionModal(page);

    // Drag USD to EUR
    await dashboardPage.navigateTo('dashboard');
    await dashboardPage.dragAccountToAccount('USD Cash', 'EUR Bank');

    // Verify modal opens with multi-currency mode
    await expect(modal.getModal()).toBeVisible();
    const isMultiCurrency = await modal.isMultiCurrencyMode();
    expect(isMultiCurrency).toBe(true);

    // Enter both amounts (USD source, EUR target)
    await modal.enterAmount('110'); // USD
    await modal.enterSecondAmount('100'); // EUR
    await modal.save();

    // Verify balances
    const usdNew = await dbHelper.getAccountBalance(usdAccountId);
    const eurNew = await dbHelper.getAccountBalance(eurAccountId);
    expect(usdNew).toBe(usdInitial - 110);
    expect(eurNew).toBe(eurInitial + 100);
  });

  test('should transfer from EUR to USD account', async ({ page, dashboardPage, dbHelper }) => {
    // Seed EUR and USD accounts
    const eurAccountId = await dbHelper.seedAccount(testAccounts.eurBank());
    const usdAccountId = await dbHelper.seedAccount(testAccounts.usdCash());
    await dbHelper.refreshStoreData();
    await page.reload();

    const eurInitial = await dbHelper.getAccountBalance(eurAccountId);
    const usdInitial = await dbHelper.getAccountBalance(usdAccountId);
    const modal = new QuickTransactionModal(page);

    // Drag EUR to USD
    await dashboardPage.navigateTo('dashboard');
    await dashboardPage.dragAccountToAccount('EUR Bank', 'USD Cash');

    await expect(modal.getModal()).toBeVisible();

    // Enter both amounts
    await modal.enterAmount('100'); // EUR
    await modal.enterSecondAmount('110'); // USD
    await modal.save();

    // Verify balances
    const eurNew = await dbHelper.getAccountBalance(eurAccountId);
    const usdNew = await dbHelper.getAccountBalance(usdAccountId);
    expect(eurNew).toBe(eurInitial - 100);
    expect(usdNew).toBe(usdInitial + 110);
  });

  test('should transfer to crypto account (USD to BTC)', async ({ page, dashboardPage, dbHelper }) => {
    // Seed USD and BTC accounts
    const usdAccountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const btcAccountId = await dbHelper.seedAccount(testAccounts.btcCrypto());
    await dbHelper.refreshStoreData();
    await page.reload();

    const usdInitial = await dbHelper.getAccountBalance(usdAccountId);
    const btcInitial = await dbHelper.getAccountBalance(btcAccountId);
    const modal = new QuickTransactionModal(page);

    // Drag USD to BTC
    await dashboardPage.navigateTo('dashboard');
    await dashboardPage.dragAccountToAccount('USD Cash', 'BTC Wallet');

    await expect(modal.getModal()).toBeVisible();

    // Enter both amounts
    await modal.enterAmount('1000'); // USD
    await modal.enterSecondAmount('0.025'); // BTC
    await modal.save();

    // Verify balances
    const usdNew = await dbHelper.getAccountBalance(usdAccountId);
    const btcNew = await dbHelper.getAccountBalance(btcAccountId);
    expect(usdNew).toBe(usdInitial - 1000);
    expect(btcNew).toBeCloseTo(btcInitial + 0.025, 8);
  });

  test('should record transfer with comment', async ({ page, dashboardPage, historyPage, dbHelper }) => {
    const fromAccountId = await dbHelper.seedAccount(testAccounts.usdCash());
    await dbHelper.seedAccount({
      name: 'Emergency Fund',
      type: 'bank',
      currency: 'USD',
      balance: 1000,
      color: '#ef4444',
      icon: 'shield',
      sortOrder: 1,
    });
    await dbHelper.refreshStoreData();
    await page.reload();

    const modal = new QuickTransactionModal(page);

    await dashboardPage.navigateTo('dashboard');
    await dashboardPage.dragAccountToAccount('USD Cash', 'Emergency Fund');

    await modal.enterAmount('300');
    await modal.enterComment('Monthly savings transfer');
    await modal.save();

    // Verify in history
    await historyPage.navigateTo('history');
    await expect(page.locator('text=Monthly savings transfer')).toBeVisible();
  });

  test('should show transfer in history with both accounts', async ({
    page,
    dashboardPage,
    historyPage,
    dbHelper,
  }) => {
    await dbHelper.seedAccount(testAccounts.usdCash());
    await dbHelper.seedAccount({
      name: 'Checking',
      type: 'bank',
      currency: 'USD',
      balance: 500,
      color: '#8b5cf6',
      icon: 'credit-card',
      sortOrder: 1,
    });
    await dbHelper.refreshStoreData();
    await page.reload();

    const modal = new QuickTransactionModal(page);

    await dashboardPage.navigateTo('dashboard');
    await dashboardPage.dragAccountToAccount('USD Cash', 'Checking');

    await modal.enterAmount('150');
    await modal.save();

    // Navigate to history and filter by transfers
    await historyPage.navigateTo('history');
    await historyPage.filterByType('transfers');

    // Verify transfer appears
    await expect(page.locator('text=/USD Cash.*Checking|Checking.*USD Cash/i')).toBeVisible();
  });
});
