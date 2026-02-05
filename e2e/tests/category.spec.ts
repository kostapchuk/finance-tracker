import { test, expect } from '../fixtures/test-base';
import { CategoryForm } from '../page-objects/components/category-form';
import { testCategories } from '../fixtures/test-data';

test.describe('Category Management', () => {
  test.beforeEach(async ({ setupCleanState }) => {
    await setupCleanState();
  });

  test('should create a category without budget', async ({ page, settingsPage }) => {
    const categoryForm = new CategoryForm(page);

    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('categories');
    await settingsPage.clickAdd();

    await categoryForm.fillName('Groceries');
    await categoryForm.save();

    await expect(page.locator('text=Groceries')).toBeVisible();
  });

  test('should create a category with monthly budget', async ({ page, settingsPage }) => {
    const categoryForm = new CategoryForm(page);

    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('categories');
    await settingsPage.clickAdd();

    await categoryForm.fillName('Transportation');
    await categoryForm.fillBudget('500');
    await categoryForm.selectBudgetPeriod('monthly');
    await categoryForm.save();

    await expect(page.locator('text=Transportation')).toBeVisible();
  });

  test('should create a category with weekly budget', async ({ page, settingsPage }) => {
    const categoryForm = new CategoryForm(page);

    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('categories');
    await settingsPage.clickAdd();

    await categoryForm.fillName('Entertainment');
    await categoryForm.fillBudget('100');
    await categoryForm.selectBudgetPeriod('weekly');
    await categoryForm.save();

    await expect(page.locator('text=Entertainment')).toBeVisible();
  });

  test('should create a category with yearly budget', async ({ page, settingsPage }) => {
    const categoryForm = new CategoryForm(page);

    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('categories');
    await settingsPage.clickAdd();

    await categoryForm.fillName('Vacation');
    await categoryForm.fillBudget('3000');
    await categoryForm.selectBudgetPeriod('yearly');
    await categoryForm.save();

    await expect(page.locator('text=Vacation')).toBeVisible();
  });

  test('should edit category name and budget', async ({ page, settingsPage, dbHelper }) => {
    // Seed a category
    const categoryData = testCategories.food();
    await dbHelper.seedCategory(categoryData);
    await dbHelper.refreshStoreData();
    await page.reload();

    const categoryForm = new CategoryForm(page);

    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('categories');
    await settingsPage.editItem(categoryData.name);

    await categoryForm.fillName('Food & Dining');
    await categoryForm.fillBudget('800');
    await categoryForm.save();

    await expect(page.locator('text=Food & Dining')).toBeVisible();
    await expect(page.locator('text=Food')).not.toBeVisible();
  });

  test('should delete a category', async ({ page, settingsPage, dbHelper }) => {
    // Seed a category
    const categoryData = testCategories.transport();
    await dbHelper.seedCategory(categoryData);
    await dbHelper.refreshStoreData();
    await page.reload();

    const categoryForm = new CategoryForm(page);

    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('categories');
    await settingsPage.editItem(categoryData.name);
    await categoryForm.delete();

    // Handle confirmation if any
    const confirmButton = page.locator('button').filter({ hasText: /confirm|yes|да|подтвердить/i });
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    }

    await page.waitForTimeout(500);

    await expect(page.locator(`text=${categoryData.name}`)).not.toBeVisible();
  });

  test('should show category on dashboard after creation', async ({ page, settingsPage, dashboardPage }) => {
    const categoryForm = new CategoryForm(page);

    await settingsPage.navigateTo('settings');
    await settingsPage.openSection('categories');
    await settingsPage.clickAdd();

    await categoryForm.fillName('Test Category');
    await categoryForm.save();

    // Navigate to dashboard
    await dashboardPage.navigateTo('dashboard');

    // Verify category appears in expenses section
    await expect(dashboardPage.getCategoryByName('Test Category')).toBeVisible();
  });
});
