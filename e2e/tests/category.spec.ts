import { test, expect, type SyncMode } from '../fixtures/test-base'
import { CategoryForm } from '../page-objects/components/category-form'
import { testCategories } from '../fixtures/test-data'

const syncModes: SyncMode[] = ['sync-disabled', 'sync-enabled-online', 'sync-enabled-offline']

for (const mode of syncModes) {
  test.describe(`[${mode}] Category Management`, () => {
    test.beforeEach(async ({ setupCleanState }) => {
      await setupCleanState(mode)
    })

    test('should create a category without budget', async ({ page, settingsPage, syncHelper }) => {
      const categoryForm = new CategoryForm(page)

      await settingsPage.navigateTo('settings')
      await settingsPage.openSection('categories')
      await settingsPage.clickAdd()

      await categoryForm.fillName('Shopping')
      await categoryForm.save()

      await expect(page.locator('text=Shopping')).toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteCategories = syncHelper.getMockRemoteData('categories')
        expect(remoteCategories.length).toBe(1)
        expect(remoteCategories[0].name).toBe('Shopping')
      }
    })

    test('should create a category with monthly budget', async ({
      page,
      settingsPage,
      syncHelper,
    }) => {
      const categoryForm = new CategoryForm(page)

      await settingsPage.navigateTo('settings')
      await settingsPage.openSection('categories')
      await settingsPage.clickAdd()

      await categoryForm.fillName('Transportation')
      await categoryForm.fillBudget('500')
      await categoryForm.selectBudgetPeriod('monthly')
      await categoryForm.save()

      await expect(page.locator('text=Transportation')).toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteCategories = syncHelper.getMockRemoteData('categories')
        expect(remoteCategories.length).toBe(1)
        expect(remoteCategories[0].budget).toBe(500)
        expect(remoteCategories[0].budgetPeriod).toBe('monthly')
      }
    })

    test('should create a category with weekly budget', async ({
      page,
      settingsPage,
      syncHelper,
    }) => {
      const categoryForm = new CategoryForm(page)

      await settingsPage.navigateTo('settings')
      await settingsPage.openSection('categories')
      await settingsPage.clickAdd()

      await categoryForm.fillName('Entertainment')
      await categoryForm.fillBudget('100')
      await categoryForm.selectBudgetPeriod('weekly')
      await categoryForm.save()

      await expect(page.locator('text=Entertainment')).toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteCategories = syncHelper.getMockRemoteData('categories')
        expect(remoteCategories[0].budgetPeriod).toBe('weekly')
      }
    })

    test('should create a category with yearly budget', async ({
      page,
      settingsPage,
      syncHelper,
    }) => {
      const categoryForm = new CategoryForm(page)

      await settingsPage.navigateTo('settings')
      await settingsPage.openSection('categories')
      await settingsPage.clickAdd()

      await categoryForm.fillName('Vacation')
      await categoryForm.fillBudget('3000')
      await categoryForm.selectBudgetPeriod('yearly')
      await categoryForm.save()

      await expect(page.locator('text=Vacation')).toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteCategories = syncHelper.getMockRemoteData('categories')
        expect(remoteCategories[0].budgetPeriod).toBe('yearly')
      }
    })

    test('should edit category name and budget', async ({
      page,
      settingsPage,
      dbHelper,
      syncHelper,
    }) => {
      const categoryData = testCategories.food()
      await dbHelper.seedCategory(categoryData)
      await dbHelper.refreshStoreData()
      await page.reload()

      const categoryForm = new CategoryForm(page)

      await settingsPage.navigateTo('settings')
      await settingsPage.openSection('categories')
      await settingsPage.editItem(categoryData.name)

      await categoryForm.fillName('Food & Dining')
      await categoryForm.fillBudget('800')
      await categoryForm.save()

      await expect(page.locator('text=Food & Dining')).toBeVisible()
      await expect(page.locator('p.font-medium:text-is("Food")')).not.toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteCategories = syncHelper.getMockRemoteData('categories')
        expect(remoteCategories.length).toBe(1)
        expect(remoteCategories[0].name).toBe('Food & Dining')
        expect(remoteCategories[0].budget).toBe(800)
      }
    })

    test('should delete a category', async ({ page, settingsPage, dbHelper, syncHelper }) => {
      const categoryData = testCategories.transport()
      await dbHelper.seedCategory(categoryData)
      await dbHelper.refreshStoreData()
      await page.reload()

      page.on('dialog', async (dialog) => {
        await dialog.accept()
      })

      await settingsPage.navigateTo('settings')
      await settingsPage.openSection('categories')

      await settingsPage.deleteItem(categoryData.name)

      await page.waitForTimeout(500)

      await expect(page.locator(`text=${categoryData.name}`)).not.toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteCategories = syncHelper.getMockRemoteData('categories')
        expect(remoteCategories.length).toBe(0)
      }
    })

    test('should show category on dashboard after creation', async ({
      page,
      settingsPage,
      dashboardPage,
      syncHelper,
    }) => {
      const categoryForm = new CategoryForm(page)

      await settingsPage.navigateTo('settings')
      await settingsPage.openSection('categories')
      await settingsPage.clickAdd()

      await categoryForm.fillName('Test Category')
      await categoryForm.save()

      await dashboardPage.navigateTo('dashboard')

      await expect(dashboardPage.getCategoryByName('Test Category')).toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteCategories = syncHelper.getMockRemoteData('categories')
        expect(remoteCategories.length).toBe(1)
      }
    })

    test('should persist category after offline and back online', async ({
      page,
      settingsPage,
      syncHelper,
    }) => {
      if (mode !== 'sync-enabled-offline') {
        test.skip()
        return
      }

      const categoryForm = new CategoryForm(page)

      await settingsPage.navigateTo('settings')
      await settingsPage.openSection('categories')
      await settingsPage.clickAdd()

      await categoryForm.fillName('Offline Category')
      await categoryForm.fillBudget('200')
      await categoryForm.selectBudgetPeriod('monthly')
      await categoryForm.save()

      await expect(page.locator('text=Offline Category')).toBeVisible()

      const queueCount = await syncHelper.getSyncQueueCount()
      expect(queueCount).toBeGreaterThan(0)

      await syncHelper.goOnline()
      await syncHelper.waitForSyncToComplete()

      const finalQueueCount = await syncHelper.getSyncQueueCount()
      expect(finalQueueCount).toBe(0)

      const remoteCategories = syncHelper.getMockRemoteData('categories')
      expect(remoteCategories.length).toBe(1)
      expect(remoteCategories[0].name).toBe('Offline Category')
    })
  })
}
