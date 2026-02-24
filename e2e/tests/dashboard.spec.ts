import { test, expect, type SyncMode } from '../fixtures/test-base'
import { testAccounts, testCategories, testIncomeSources } from '../fixtures/test-data'
import { AccountForm } from '../page-objects/components/account-form'
import { IncomeSourceForm } from '../page-objects/components/income-source-form'

const syncModes: SyncMode[] = [
  'sync-disabled',
  'sync-disabled-offline',
  'sync-enabled-online',
  'sync-enabled-offline',
]

for (const mode of syncModes) {
  test.describe(`[${mode}] Dashboard`, () => {
    test.beforeEach(async ({ setupCleanState }) => {
      await setupCleanState(mode)
    })

    test('should create income transaction via UI drag-and-drop', async ({
      page,
      dashboardPage,
      historyPage,
      reportPage,
      syncHelper,
    }) => {
      const mode = syncHelper.getMode()
      if (mode?.endsWith('-offline')) {
        await syncHelper.goOffline()
      }

      await dashboardPage.navigateTo('dashboard')

      // Create account via UI
      const accountForm = new AccountForm(page)
      await dashboardPage.getAddAccountButton().click()
      await accountForm.fillName('USD Cash')
      await accountForm.selectType('cash')
      await accountForm.selectCurrency('USD')
      await accountForm.fillBalance('1000')
      await accountForm.save()
      await expect(dashboardPage.getAccountByName('USD Cash')).toBeVisible({ timeout: 5000 })

      // Create income source via UI
      const incomeForm = new IncomeSourceForm(page)
      await dashboardPage.getAddIncomeSourceButton().click()
      await incomeForm.fillName('Salary')
      await incomeForm.selectCurrency('USD')
      await incomeForm.save()
      await expect(dashboardPage.getIncomeSourceByName('Salary')).toBeVisible({ timeout: 5000 })

      // Perform drag and drop
      await dashboardPage.dragIncomeToAccount('Salary', 'USD Cash')

      // Fill amount and save
      const amountInputs = page.locator('input[inputmode="decimal"], input[inputMode="decimal"]')
      await expect(amountInputs.first()).toBeVisible({ timeout: 2000 })

      const inputCount = await amountInputs.count()
      await amountInputs.first().fill('500')
      if (inputCount > 1) {
        await amountInputs.nth(1).fill('500')
      }

      await page
        .locator('button')
        .filter({ hasText: /save|сохранить/i })
        .click()
      await page.waitForTimeout(500)

      // Verify via UI: History page shows transaction
      await historyPage.navigateTo('history')

      // Verify transaction is visible in the full list (no filter)
      await expect(historyPage.getTransactionByTitle('Salary')).toBeVisible()

      // Also verify with income filter applied
      await historyPage.filterByType('income')
      await expect(historyPage.getTransactionByTitle('Salary')).toBeVisible()

      // Verify history page inflows summary
      const inflowsText = await historyPage.getInflowsAmount().textContent()
      expect(inflowsText).toContain('500')

      // Verify via UI: Report page shows income
      await reportPage.navigateTo('report')
      const incomeAmount = await reportPage.getIncomeAmount().textContent()
      expect(incomeAmount).toContain('500')

      // For sync-enabled-online, wait for sync and verify remote data
      if (mode === 'sync-enabled-online') {
        await syncHelper.waitForSyncToComplete()
        const remoteTransactions = syncHelper.getMockRemoteData('transactions')
        expect(remoteTransactions.length).toBeGreaterThanOrEqual(1)
      }

      // For offline modes: verify persistence after going online
      if (mode?.endsWith('-offline')) {
        await syncHelper.goOnline()

        // For sync-enabled-offline, wait for sync to complete
        if (mode === 'sync-enabled-offline') {
          await syncHelper.waitForSyncToComplete()
        }

        await page.reload()
        await page.waitForLoadState('networkidle')
        await page.waitForSelector('nav', { state: 'visible', timeout: 10000 })

        // Verify data persisted via UI after going online
        await historyPage.navigateTo('history')

        // Verify transaction is visible in the full list (no filter)
        await expect(historyPage.getTransactionByTitle('Salary')).toBeVisible()

        // Also verify with income filter applied
        await historyPage.filterByType('income')
        await expect(historyPage.getTransactionByTitle('Salary')).toBeVisible()

        const inflowsAfterOnline = await historyPage.getInflowsAmount().textContent()
        expect(inflowsAfterOnline).toContain('500')

        await reportPage.navigateTo('report')
        const incomeAfterOnline = await reportPage.getIncomeAmount().textContent()
        expect(incomeAfterOnline).toContain('500')
      }
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
