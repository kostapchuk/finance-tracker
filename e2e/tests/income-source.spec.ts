import { test, expect, type SyncMode } from '../fixtures/test-base'
import { IncomeSourceForm } from '../page-objects/components/income-source-form'
import { testIncomeSources } from '../fixtures/test-data'

const syncModes: SyncMode[] = ['sync-disabled', 'sync-enabled-online', 'sync-enabled-offline']

for (const mode of syncModes) {
  test.describe(`[${mode}] Income Source Management`, () => {
    test.beforeEach(async ({ setupCleanState }) => {
      await setupCleanState(mode)
    })

    test('should create an income source with USD currency', async ({
      page,
      settingsPage,
      syncHelper,
    }) => {
      const incomeForm = new IncomeSourceForm(page)

      await settingsPage.navigateTo('settings')
      await settingsPage.openSection('income')
      await settingsPage.clickAdd()

      await incomeForm.fillName('Main Job')
      await incomeForm.selectCurrency('USD')
      await incomeForm.save()

      await expect(page.locator('text=Main Job')).toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteSources = syncHelper.getMockRemoteData('income_sources')
        expect(remoteSources.length).toBe(1)
        expect(remoteSources[0].name).toBe('Main Job')
      }
    })

    test('should create an income source with EUR currency (different from mainCurrency)', async ({
      page,
      settingsPage,
      syncHelper,
    }) => {
      const incomeForm = new IncomeSourceForm(page)

      await settingsPage.navigateTo('settings')
      await settingsPage.openSection('income')
      await settingsPage.clickAdd()

      await incomeForm.fillName('Freelance EUR')
      await incomeForm.selectCurrency('EUR')
      await incomeForm.save()

      await expect(page.locator('text=Freelance EUR')).toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteSources = syncHelper.getMockRemoteData('income_sources')
        expect(remoteSources.length).toBe(1)
        expect(remoteSources[0].currency).toBe('EUR')
      }
    })

    test('should create multiple income sources with different currencies', async ({
      page,
      settingsPage,
      syncHelper,
    }) => {
      const incomeForm = new IncomeSourceForm(page)

      await settingsPage.navigateTo('settings')
      await settingsPage.openSection('income')
      await settingsPage.clickAdd()

      await incomeForm.fillName('Primary Job')
      await incomeForm.selectCurrency('USD')
      await incomeForm.save()

      await settingsPage.clickAdd()
      await incomeForm.fillName('Side Project')
      await incomeForm.selectCurrency('EUR')
      await incomeForm.save()

      await expect(page.locator('text=Primary Job')).toBeVisible()
      await expect(page.locator('text=Side Project')).toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteSources = syncHelper.getMockRemoteData('income_sources')
        expect(remoteSources.length).toBe(2)
      }
    })

    test('should edit income source name', async ({ page, settingsPage, dbHelper, syncHelper }) => {
      const incomeData = { ...testIncomeSources.salary(), name: 'Test Income' }
      await dbHelper.seedIncomeSource(incomeData)
      await dbHelper.refreshStoreData()
      await page.reload()

      const incomeForm = new IncomeSourceForm(page)

      await settingsPage.navigateTo('settings')
      await settingsPage.openSection('income')
      await settingsPage.editItem(incomeData.name)

      await incomeForm.fillName('Updated Income')
      await incomeForm.save()

      await expect(page.locator('text=Updated Income')).toBeVisible()
      await expect(page.locator('p.font-medium:text-is("Test Income")')).not.toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteSources = syncHelper.getMockRemoteData('income_sources')
        expect(remoteSources.length).toBe(1)
        expect(remoteSources[0].name).toBe('Updated Income')
      }
    })

    test('should change income source currency', async ({
      page,
      settingsPage,
      dbHelper,
      syncHelper,
    }) => {
      const incomeData = testIncomeSources.salary()
      await dbHelper.seedIncomeSource(incomeData)
      await dbHelper.refreshStoreData()
      await page.reload()

      const incomeForm = new IncomeSourceForm(page)

      await settingsPage.navigateTo('settings')
      await settingsPage.openSection('income')
      await settingsPage.editItem(incomeData.name)

      await incomeForm.selectCurrency('GBP')
      await incomeForm.save()

      await settingsPage.editItem(incomeData.name)
      await expect(page.locator('.fixed .shadow-lg.rounded-lg button.w-full.border')).toContainText(
        'GBP'
      )

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteSources = syncHelper.getMockRemoteData('income_sources')
        expect(remoteSources[0].currency).toBe('GBP')
      }
    })

    test('should delete an income source', async ({ page, settingsPage, dbHelper, syncHelper }) => {
      const incomeData = testIncomeSources.freelance()
      await dbHelper.seedIncomeSource(incomeData)
      await dbHelper.refreshStoreData()
      await page.reload()

      page.on('dialog', async (dialog) => {
        await dialog.accept()
      })

      await settingsPage.navigateTo('settings')
      await settingsPage.openSection('income')

      await settingsPage.deleteItem(incomeData.name)

      await page.waitForTimeout(500)

      await expect(page.locator(`text=${incomeData.name}`)).not.toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteSources = syncHelper.getMockRemoteData('income_sources')
        expect(remoteSources.length).toBe(0)
      }
    })

    test('should show income source on dashboard after creation', async ({
      page,
      settingsPage,
      dashboardPage,
      syncHelper,
    }) => {
      const incomeForm = new IncomeSourceForm(page)

      await settingsPage.navigateTo('settings')
      await settingsPage.openSection('income')
      await settingsPage.clickAdd()

      await incomeForm.fillName('Dashboard Income')
      await incomeForm.selectCurrency('USD')
      await incomeForm.save()

      await dashboardPage.navigateTo('dashboard')

      await expect(dashboardPage.getIncomeSourceByName('Dashboard Income')).toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteSources = syncHelper.getMockRemoteData('income_sources')
        expect(remoteSources.length).toBe(1)
      }
    })

    test('should persist income source after offline and back online', async ({
      page,
      settingsPage,
      syncHelper,
    }) => {
      if (mode !== 'sync-enabled-offline') {
        test.skip()
        return
      }

      const incomeForm = new IncomeSourceForm(page)

      await settingsPage.navigateTo('settings')
      await settingsPage.openSection('income')
      await settingsPage.clickAdd()

      await incomeForm.fillName('Offline Income')
      await incomeForm.selectCurrency('USD')
      await incomeForm.save()

      await expect(page.locator('text=Offline Income')).toBeVisible()

      const queueCount = await syncHelper.getSyncQueueCount()
      expect(queueCount).toBeGreaterThan(0)

      await syncHelper.goOnline()
      await syncHelper.waitForSyncToComplete()

      const finalQueueCount = await syncHelper.getSyncQueueCount()
      expect(finalQueueCount).toBe(0)

      const remoteSources = syncHelper.getMockRemoteData('income_sources')
      expect(remoteSources.length).toBe(1)
      expect(remoteSources[0].name).toBe('Offline Income')
    })
  })
}
