import { test, expect } from '../fixtures/test-base';
import { IncomeSourceForm } from '../page-objects/components/income-source-form';
import { testIncomeSources } from '../fixtures/test-data';

test.describe('Income Source Management', () => {
  test.beforeEach(async ({ setupCleanState }) => {
    await setupCleanState();
  });

  test('should create an income source with USD currency', async ({ page, settingsPage }) => {
    const incomeForm = new IncomeSourceForm(page);

    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('income');
    await settingsPage.clickAdd();

    await incomeForm.fillName('Main Job');
    await incomeForm.selectCurrency('USD');
    await incomeForm.save();

    await expect(page.locator('text=Main Job')).toBeVisible();
  });

  test('should create an income source with EUR currency (different from mainCurrency)', async ({ page, settingsPage }) => {
    const incomeForm = new IncomeSourceForm(page);

    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('income');
    await settingsPage.clickAdd();

    await incomeForm.fillName('Freelance EUR');
    await incomeForm.selectCurrency('EUR');
    await incomeForm.save();

    await expect(page.locator('text=Freelance EUR')).toBeVisible();
  });

  test('should create multiple income sources with different currencies', async ({ page, settingsPage }) => {
    const incomeForm = new IncomeSourceForm(page);

    // Create first income source
    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('income');
    await settingsPage.clickAdd();

    await incomeForm.fillName('Primary Job');
    await incomeForm.selectCurrency('USD');
    await incomeForm.save();

    // Create second income source
    await settingsPage.clickAdd();
    await incomeForm.fillName('Side Project');
    await incomeForm.selectCurrency('EUR');
    await incomeForm.save();

    // Verify both appear
    await expect(page.locator('text=Primary Job')).toBeVisible();
    await expect(page.locator('text=Side Project')).toBeVisible();
  });

  test('should edit income source name', async ({ page, settingsPage, dbHelper }) => {
    // Seed an income source with unique name
    const incomeData = { ...testIncomeSources.salary(), name: 'Test Income' };
    await dbHelper.seedIncomeSource(incomeData);
    await dbHelper.refreshStoreData();
    await page.reload();

    const incomeForm = new IncomeSourceForm(page);

    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('income');
    await settingsPage.editItem(incomeData.name);

    await incomeForm.fillName('Updated Income');
    await incomeForm.save();

    await expect(page.locator('text=Updated Income')).toBeVisible();
    // Original name should be gone
    await expect(page.locator('p.font-medium:text-is("Test Income")')).not.toBeVisible();
  });

  test('should change income source currency', async ({ page, settingsPage, dbHelper }) => {
    // Seed an income source
    const incomeData = testIncomeSources.salary();
    await dbHelper.seedIncomeSource(incomeData);
    await dbHelper.refreshStoreData();
    await page.reload();

    const incomeForm = new IncomeSourceForm(page);

    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('income');
    await settingsPage.editItem(incomeData.name);

    await incomeForm.selectCurrency('GBP');
    await incomeForm.save();

    // Re-open the item to verify currency was saved
    await settingsPage.editItem(incomeData.name);
    // The select should show GBP
    await expect(page.locator('.fixed .shadow-lg.rounded-lg button.w-full.border')).toContainText('GBP');
  });

  test('should delete an income source', async ({ page, settingsPage, dbHelper }) => {
    // Seed an income source
    const incomeData = testIncomeSources.freelance();
    await dbHelper.seedIncomeSource(incomeData);
    await dbHelper.refreshStoreData();
    await page.reload();

    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('income');

    // Set up dialog handler to accept the native confirm dialog
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Click delete button (trash icon) on the income source item
    await settingsPage.deleteItem(incomeData.name);

    await page.waitForTimeout(500);

    await expect(page.locator(`text=${incomeData.name}`)).not.toBeVisible();
  });

  test('should show income source on dashboard after creation', async ({ page, settingsPage, dashboardPage }) => {
    const incomeForm = new IncomeSourceForm(page);

    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('income');
    await settingsPage.clickAdd();

    await incomeForm.fillName('Dashboard Income');
    await incomeForm.selectCurrency('USD');
    await incomeForm.save();

    // Navigate to dashboard
    await dashboardPage.navigateTo('dashboard');

    // Verify income source appears
    await expect(dashboardPage.getIncomeSourceByName('Dashboard Income')).toBeVisible();
  });
});
