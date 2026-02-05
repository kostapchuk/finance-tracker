import { test, expect } from '../fixtures/test-base';
import { AccountForm } from '../page-objects/components/account-form';
import { testAccounts } from '../fixtures/test-data';

test.describe('Account Management', () => {
  test.beforeEach(async ({ setupCleanState }) => {
    await setupCleanState();
  });

  test('should create a cash account with USD currency', async ({ page, settingsPage }) => {
    const accountForm = new AccountForm(page);

    // Navigate to settings and accounts section
    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('accounts');
    await settingsPage.clickAdd();

    // Fill form
    await accountForm.fillName('My Cash Wallet');
    await accountForm.selectType('cash');
    await accountForm.selectCurrency('USD');
    await accountForm.fillBalance('500');
    await accountForm.save();

    // Verify account appears
    await expect(page.locator('text=My Cash Wallet')).toBeVisible();
    await expect(page.locator('text=/500.*\\$/i')).toBeVisible();
  });

  test('should create a bank account with EUR currency', async ({ page, settingsPage }) => {
    const accountForm = new AccountForm(page);

    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('accounts');
    await settingsPage.clickAdd();

    await accountForm.fillName('Euro Bank');
    await accountForm.selectType('bank');
    await accountForm.selectCurrency('EUR');
    await accountForm.fillBalance('2000');
    await accountForm.save();

    await expect(page.locator('text=Euro Bank')).toBeVisible();
  });

  test('should create a crypto wallet account', async ({ page, settingsPage }) => {
    const accountForm = new AccountForm(page);

    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('accounts');
    await settingsPage.clickAdd();

    await accountForm.fillName('BTC Holdings');
    await accountForm.selectType('crypto');
    await accountForm.selectCurrency('BTC');
    await accountForm.fillBalance('0.5');
    await accountForm.save();

    await expect(page.locator('text=BTC Holdings')).toBeVisible();
  });

  test('should create a credit card account with negative balance', async ({ page, settingsPage }) => {
    const accountForm = new AccountForm(page);

    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('accounts');
    await settingsPage.clickAdd();

    await accountForm.fillName('Visa Card');
    await accountForm.selectType('credit_card');
    await accountForm.selectCurrency('USD');
    await accountForm.fillBalance('-750');
    await accountForm.save();

    await expect(page.locator('text=Visa Card')).toBeVisible();
  });

  test('should edit existing account name and balance', async ({ page, settingsPage, dbHelper }) => {
    // Seed an account first
    const accountData = testAccounts.usdCash();
    await dbHelper.seedAccount(accountData);
    await dbHelper.refreshStoreData();
    await page.reload();

    const accountForm = new AccountForm(page);

    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('accounts');

    // Click edit on the account
    await settingsPage.editItem(accountData.name);

    // Edit fields
    await accountForm.fillName('Updated Cash');
    await accountForm.fillBalance('1500');
    await accountForm.save();

    // Verify changes
    await expect(page.locator('text=Updated Cash')).toBeVisible();
    await expect(page.locator('text=USD Cash')).not.toBeVisible();
  });

  test('should delete an account', async ({ page, settingsPage, dbHelper }) => {
    // Seed an account
    const accountData = testAccounts.usdCash();
    await dbHelper.seedAccount(accountData);
    await dbHelper.refreshStoreData();
    await page.reload();

    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('accounts');

    // Set up dialog handler to accept the native confirm dialog
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Click delete button on the account item (trash icon)
    await settingsPage.deleteItem(accountData.name);

    await page.waitForTimeout(500);

    // Verify account is gone
    await expect(page.locator(`text=${accountData.name}`)).not.toBeVisible();
  });

  test('should show account on dashboard after creation', async ({ page, settingsPage, dashboardPage }) => {
    const accountForm = new AccountForm(page);

    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('accounts');
    await settingsPage.clickAdd();

    await accountForm.fillName('Dashboard Test');
    await accountForm.selectType('bank');
    await accountForm.selectCurrency('USD');
    await accountForm.fillBalance('100');
    await accountForm.save();

    // Navigate to dashboard
    await dashboardPage.navigateTo('dashboard');

    // Verify account appears on dashboard
    await expect(dashboardPage.getAccountByName('Dashboard Test')).toBeVisible();
  });
});
