import { test, expect, type SyncMode } from '../fixtures/test-base'
import { testAccounts, testCategories, testIncomeSources } from '../fixtures/test-data'

const syncModes: SyncMode[] = ['sync-disabled', 'sync-enabled-online', 'sync-enabled-offline']

for (const mode of syncModes) {
  test.describe(`[${mode}] Dashboard`, () => {
    test.beforeEach(async ({ setupCleanState }) => {
      await setupCleanState(mode)
    })

    test('should show all items when data exists', async ({
      page,
      dashboardPage,
      seedAccount,
      seedCategory,
      dbHelper,
    }) => {
      await seedAccount(testAccounts.usdCash())
      await seedCategory(testCategories.food())
      await dbHelper.seedIncomeSource(testIncomeSources.salary())
      await dbHelper.refreshStoreData()
      await page.reload()
      await page.waitForLoadState('networkidle')

      await dashboardPage.navigateTo('dashboard')

      await expect(dashboardPage.getAccountByName('USD Cash')).toBeVisible()
      await expect(dashboardPage.getCategoryByName('Food')).toBeVisible()
      await expect(dashboardPage.getIncomeSourceByName('Salary')).toBeVisible()
    })

    test('should hide accounts with hiddenFromDashboard flag', async ({
      page,
      dashboardPage,
      dbHelper,
      seedAccount,
    }) => {
      const visibleAccountId = await seedAccount(testAccounts.usdCash())

      const hiddenAccount = testAccounts.eurBank()
      hiddenAccount.name = 'Hidden EUR'
      const hiddenAccountId = await dbHelper.seedAccount(hiddenAccount)

      await dbHelper.updateAccount(hiddenAccountId, { hiddenFromDashboard: true })
      await dbHelper.refreshStoreData()
      await page.reload()
      await page.waitForLoadState('networkidle')

      await dashboardPage.navigateTo('dashboard')

      await expect(dashboardPage.getAccountByName('USD Cash')).toBeVisible()
      await expect(dashboardPage.getAccountByName('Hidden EUR')).not.toBeVisible()
    })

    test('should hide categories with hiddenFromDashboard flag', async ({
      page,
      dashboardPage,
      dbHelper,
      seedAccount,
      seedCategory,
    }) => {
      await seedAccount(testAccounts.usdCash())

      const visibleCatId = await seedCategory(testCategories.food())

      const hiddenCat = testCategories.transport()
      hiddenCat.name = 'Hidden Transport'
      const hiddenCatId = await dbHelper.seedCategory(hiddenCat)

      await dbHelper.updateCategory(hiddenCatId, { hiddenFromDashboard: true })
      await dbHelper.refreshStoreData()
      await page.reload()
      await page.waitForLoadState('networkidle')

      await dashboardPage.navigateTo('dashboard')

      await expect(dashboardPage.getCategoryByName('Food')).toBeVisible()
      await expect(dashboardPage.getCategoryByName('Hidden Transport')).not.toBeVisible()
    })

    test('should hide income sources with hiddenFromDashboard flag', async ({
      page,
      dashboardPage,
      dbHelper,
      seedAccount,
      seedCategory,
    }) => {
      await seedAccount(testAccounts.usdCash())
      await seedCategory(testCategories.food())

      const visibleId = await dbHelper.seedIncomeSource(testIncomeSources.salary())

      const hiddenSource = testIncomeSources.freelance()
      hiddenSource.name = 'Hidden Income'
      const hiddenId = await dbHelper.seedIncomeSource(hiddenSource)

      await dbHelper.updateIncomeSource(hiddenId, { hiddenFromDashboard: true })
      await dbHelper.refreshStoreData()
      await page.reload()
      await page.waitForLoadState('networkidle')

      await dashboardPage.navigateTo('dashboard')

      await expect(dashboardPage.getIncomeSourceByName('Salary')).toBeVisible()
      await expect(dashboardPage.getIncomeSourceByName('Hidden Income')).not.toBeVisible()
    })

    test('should calculate section totals correctly', async ({
      page,
      dashboardPage,
      seedAccount,
      seedCategory,
      dbHelper,
    }) => {
      await seedAccount({ ...testAccounts.usdCash(), balance: 500 })
      await seedCategory(testCategories.food())
      await dbHelper.seedIncomeSource(testIncomeSources.salary())
      await dbHelper.refreshStoreData()
      await page.reload()
      await page.waitForLoadState('networkidle')

      await dashboardPage.navigateTo('dashboard')

      const accountsSection = dashboardPage.getAccountsSection()
      await expect(accountsSection).toContainText(/\$?\s*500/)
    })
  })
}
