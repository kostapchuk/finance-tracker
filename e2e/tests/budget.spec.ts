import { test, expect } from '../fixtures/test-base';
import { CategoryForm } from '../page-objects/components/category-form';
import { testAccounts } from '../fixtures/test-data';

test.describe('Budget Tracking', () => {
  test.beforeEach(async ({ setupCleanState }) => {
    await setupCleanState();
  });

  test('should create category with monthly budget', async ({ page, settingsPage }) => {
    const categoryForm = new CategoryForm(page);

    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('categories');
    await settingsPage.clickAdd();

    await categoryForm.fillName('Groceries');
    await categoryForm.fillBudget('500');
    await categoryForm.selectBudgetPeriod('monthly');
    await categoryForm.save();

    // Verify category was created
    await expect(page.locator('text=Groceries')).toBeVisible();

    // Click to edit and verify budget is saved
    await settingsPage.editItem('Groceries');

    // Budget input should show 500
    const budgetInput = page.locator('input[type="number"], input[inputmode="decimal"]').first();
    await expect(budgetInput).toHaveValue('500');
  });

  test('should create category with weekly budget', async ({ page, settingsPage }) => {
    const categoryForm = new CategoryForm(page);

    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('categories');
    await settingsPage.clickAdd();

    await categoryForm.fillName('Coffee');
    await categoryForm.fillBudget('50');
    await categoryForm.selectBudgetPeriod('weekly');
    await categoryForm.save();

    await expect(page.locator('text=Coffee')).toBeVisible();
  });

  test('should create category with yearly budget', async ({ page, settingsPage }) => {
    const categoryForm = new CategoryForm(page);

    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('categories');
    await settingsPage.clickAdd();

    await categoryForm.fillName('Vacation');
    await categoryForm.fillBudget('5000');
    await categoryForm.selectBudgetPeriod('yearly');
    await categoryForm.save();

    await expect(page.locator('text=Vacation')).toBeVisible();
  });

  test('should edit category budget amount', async ({ page, settingsPage, dbHelper }) => {
    // Seed category with budget
    await dbHelper.seedCategory({
      name: 'Entertainment',
      color: '#8b5cf6',
      icon: 'gamepad-2',
      categoryType: 'expense',
      budget: 200,
      budgetPeriod: 'monthly',
      sortOrder: 0,
    });
    await dbHelper.refreshStoreData();

    const categoryForm = new CategoryForm(page);

    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('categories');
    await settingsPage.editItem('Entertainment');

    // Update budget
    await categoryForm.fillBudget('350');
    await categoryForm.save();

    // Verify by opening edit again
    await settingsPage.editItem('Entertainment');
    const budgetInput = page.locator('input[type="number"], input[inputmode="decimal"]').first();
    await expect(budgetInput).toHaveValue('350');
  });

  test('should edit category budget period', async ({ page, settingsPage, dbHelper }) => {
    // Seed category with monthly budget
    await dbHelper.seedCategory({
      name: 'Dining Out',
      color: '#f97316',
      icon: 'utensils',
      categoryType: 'expense',
      budget: 300,
      budgetPeriod: 'monthly',
      sortOrder: 0,
    });
    await dbHelper.refreshStoreData();

    const categoryForm = new CategoryForm(page);

    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('categories');
    await settingsPage.editItem('Dining Out');

    // Change to weekly
    await categoryForm.selectBudgetPeriod('weekly');
    await categoryForm.save();

    // Verify category still exists
    await expect(page.locator('text=Dining Out')).toBeVisible();
  });

  test('should track expenses against budget on dashboard', async ({
    dashboardPage,
    dbHelper,
  }) => {
    // Seed account and category with budget
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const catId = await dbHelper.seedCategory({
      name: 'Shopping',
      color: '#ec4899',
      icon: 'shopping-bag',
      categoryType: 'expense',
      budget: 500,
      budgetPeriod: 'monthly',
      sortOrder: 0,
    });

    // Seed expenses directly
    await dbHelper.seedTransaction({
      type: 'expense',
      amount: 150,
      currency: 'USD',
      accountId,
      categoryId: catId,
      date: new Date(),
    });
    await dbHelper.seedTransaction({
      type: 'expense',
      amount: 100,
      currency: 'USD',
      accountId,
      categoryId: catId,
      date: new Date(),
    });
    await dbHelper.refreshStoreData();

    // Navigate to dashboard
    await dashboardPage.navigateTo('dashboard');

    // Category tile should show total spent ($250)
    const categoryTile = dashboardPage.getCategoryByName('Shopping');
    await expect(categoryTile).toContainText('250');
  });

  test('should show category spending in reports', async ({
    reportPage,
    dbHelper,
  }) => {
    // Seed account and categories with budgets
    const accountId = await dbHelper.seedAccount(testAccounts.usdCash());
    const groceriesId = await dbHelper.seedCategory({
      name: 'Groceries',
      color: '#22c55e',
      icon: 'shopping-cart',
      categoryType: 'expense',
      budget: 600,
      budgetPeriod: 'monthly',
      sortOrder: 0,
    });
    const transportId = await dbHelper.seedCategory({
      name: 'Transport',
      color: '#3b82f6',
      icon: 'car',
      categoryType: 'expense',
      budget: 200,
      budgetPeriod: 'monthly',
      sortOrder: 1,
    });

    // Seed expenses directly
    await dbHelper.seedTransaction({
      type: 'expense',
      amount: 300,
      currency: 'USD',
      accountId,
      categoryId: groceriesId,
      date: new Date(),
    });
    await dbHelper.seedTransaction({
      type: 'expense',
      amount: 75,
      currency: 'USD',
      accountId,
      categoryId: transportId,
      date: new Date(),
    });
    await dbHelper.refreshStoreData();

    // Navigate to reports
    await reportPage.navigateTo('report');

    // Should see spending by category
    const groceriesLegend = await reportPage.getCategoryLegendItem('Groceries');
    const transportLegend = await reportPage.getCategoryLegendItem('Transport');

    await expect(groceriesLegend).toBeVisible();
    await expect(transportLegend).toBeVisible();
    await expect(groceriesLegend).toContainText('300');
    await expect(transportLegend).toContainText('75');
  });

  test('should create category without budget', async ({ page, settingsPage }) => {
    const categoryForm = new CategoryForm(page);

    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('categories');
    await settingsPage.clickAdd();

    await categoryForm.fillName('Miscellaneous');
    // Don't fill budget
    await categoryForm.save();

    await expect(page.locator('text=Miscellaneous')).toBeVisible();
  });

  test('should remove budget from existing category', async ({ page, settingsPage, dbHelper }) => {
    // Seed category with budget
    await dbHelper.seedCategory({
      name: 'Subscriptions',
      color: '#6366f1',
      icon: 'tv',
      categoryType: 'expense',
      budget: 100,
      budgetPeriod: 'monthly',
      sortOrder: 0,
    });
    await dbHelper.refreshStoreData();

    const categoryForm = new CategoryForm(page);

    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('categories');
    await settingsPage.editItem('Subscriptions');

    // Clear budget
    await categoryForm.fillBudget('');
    await categoryForm.save();

    // Verify category still exists
    await expect(page.locator('text=Subscriptions')).toBeVisible();
  });

  test('should handle multiple categories with different budget periods', async ({
    page,
    settingsPage,
  }) => {
    const categoryForm = new CategoryForm(page);

    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('categories');

    // Create weekly budget category
    await settingsPage.clickAdd();
    await categoryForm.fillName('Coffee');
    await categoryForm.fillBudget('30');
    await categoryForm.selectBudgetPeriod('weekly');
    await categoryForm.save();

    // Create monthly budget category
    await settingsPage.clickAdd();
    await categoryForm.fillName('Groceries');
    await categoryForm.fillBudget('600');
    await categoryForm.selectBudgetPeriod('monthly');
    await categoryForm.save();

    // Create yearly budget category
    await settingsPage.clickAdd();
    await categoryForm.fillName('Insurance');
    await categoryForm.fillBudget('1200');
    await categoryForm.selectBudgetPeriod('yearly');
    await categoryForm.save();

    // Verify all categories exist
    await expect(page.locator('text=Coffee')).toBeVisible();
    await expect(page.locator('text=Groceries')).toBeVisible();
    await expect(page.locator('text=Insurance')).toBeVisible();
  });
});
