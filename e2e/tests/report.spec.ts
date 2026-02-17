import { test, expect, type SyncMode } from '../fixtures/test-base'
import { testAccounts, testCategories, testIncomeSources } from '../fixtures/test-data'

const syncModes: SyncMode[] = ['sync-disabled', 'sync-enabled-online', 'sync-enabled-offline']

for (const mode of syncModes) {
  test.describe(`[${mode}] Reports Page`, () => {
    test.beforeEach(async ({ setupCleanState }) => {
      await setupCleanState(mode)
    })

    test('should show empty state when no transactions exist', async ({
      reportPage,
      syncHelper,
    }) => {
      await reportPage.navigateTo('report')

      await expect(reportPage.getIncomeAmount()).toContainText('0')
      await expect(reportPage.getExpensesAmount()).toContainText('0')

      await expect(reportPage.getNoExpenseDataMessage()).toBeVisible()
      await expect(reportPage.getNoTransactionDataMessage()).toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
      }
    })

    test('should display monthly income correctly', async ({
      reportPage,
      dbHelper,
      syncHelper,
    }) => {
      const accountId = await seedAccount(testAccounts.usdCash())
      const incomeId = await dbHelper.seedIncomeSource(testIncomeSources.salary())

      await dbHelper.seedTransaction({
        type: 'income',
        amount: 2500,
        currency: 'USD',
        accountId,
        incomeSourceId: incomeId,
        date: new Date(),
        comment: 'Monthly salary',
      })
      await dbHelper.refreshStoreData()

      await reportPage.navigateTo('report')

      await expect(reportPage.getIncomeAmount()).toContainText('2,500')

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
      }
    })

    test('should display monthly expenses correctly', async ({
      reportPage,
      dbHelper,
      syncHelper,
    }) => {
      const accountId = await seedAccount(testAccounts.usdCash())
      const catId = await dbHelper.seedCategory(testCategories.food())

      await dbHelper.seedTransaction({
        type: 'expense',
        amount: 150,
        currency: 'USD',
        accountId,
        categoryId: catId,
        date: new Date(),
        comment: 'Groceries',
      })
      await dbHelper.refreshStoreData()

      await reportPage.navigateTo('report')

      await expect(reportPage.getExpensesAmount()).toContainText('150')

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
      }
    })

    test('should calculate net flow correctly (income - expenses)', async ({
      reportPage,
      dbHelper,
      syncHelper,
    }) => {
      const accountId = await seedAccount(testAccounts.usdCash())
      const incomeId = await dbHelper.seedIncomeSource(testIncomeSources.salary())
      const catId = await dbHelper.seedCategory(testCategories.food())

      await dbHelper.seedTransaction({
        type: 'income',
        amount: 3000,
        currency: 'USD',
        accountId,
        incomeSourceId: incomeId,
        date: new Date(),
      })

      await dbHelper.seedTransaction({
        type: 'expense',
        amount: 800,
        currency: 'USD',
        accountId,
        categoryId: catId,
        date: new Date(),
      })
      await dbHelper.refreshStoreData()

      await reportPage.navigateTo('report')

      await expect(reportPage.getNetFlowAmount()).toContainText('2,200')

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
      }
    })

    test('should show spending by category chart with data', async ({
      reportPage,
      dbHelper,
      syncHelper,
    }) => {
      const accountId = await seedAccount(testAccounts.usdCash())
      const foodId = await dbHelper.seedCategory(testCategories.food())
      const transportId = await dbHelper.seedCategory(testCategories.transport())

      await dbHelper.seedTransaction({
        type: 'expense',
        amount: 200,
        currency: 'USD',
        accountId,
        categoryId: foodId,
        date: new Date(),
      })
      await dbHelper.seedTransaction({
        type: 'expense',
        amount: 100,
        currency: 'USD',
        accountId,
        categoryId: transportId,
        date: new Date(),
      })
      await dbHelper.refreshStoreData()

      await reportPage.navigateTo('report')

      await expect(reportPage.getCategoryPieChart()).toBeVisible()

      const foodLegend = await reportPage.getCategoryLegendItem('Food')
      const transportLegend = await reportPage.getCategoryLegendItem('Transport')
      await expect(foodLegend).toBeVisible()
      await expect(transportLegend).toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
      }
    })

    test('should show 6-month trend chart with data', async ({
      reportPage,
      dbHelper,
      syncHelper,
    }) => {
      const accountId = await seedAccount(testAccounts.usdCash())
      const incomeId = await dbHelper.seedIncomeSource(testIncomeSources.salary())
      const catId = await dbHelper.seedCategory(testCategories.food())

      await dbHelper.seedTransaction({
        type: 'income',
        amount: 1000,
        currency: 'USD',
        accountId,
        incomeSourceId: incomeId,
        date: new Date(),
      })
      await dbHelper.seedTransaction({
        type: 'expense',
        amount: 300,
        currency: 'USD',
        accountId,
        categoryId: catId,
        date: new Date(),
      })
      await dbHelper.refreshStoreData()

      await reportPage.navigateTo('report')

      await expect(reportPage.getTrendBars().first()).toBeVisible()

      await expect(reportPage.getTrendLegend()).toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
      }
    })

    test('should navigate to previous month', async ({ reportPage, syncHelper }) => {
      await reportPage.navigateTo('report')

      const currentMonthText = await reportPage.getCurrentMonthText().textContent()

      await reportPage.goToPreviousMonth()

      const newMonthText = await reportPage.getCurrentMonthText().textContent()
      expect(newMonthText).not.toBe(currentMonthText)

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
      }
    })

    test('should navigate to next month', async ({ reportPage, syncHelper }) => {
      await reportPage.navigateTo('report')

      await reportPage.goToPreviousMonth()
      const prevMonthText = await reportPage.getCurrentMonthText().textContent()

      await reportPage.goToNextMonth()

      const newMonthText = await reportPage.getCurrentMonthText().textContent()
      expect(newMonthText).not.toBe(prevMonthText)

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
      }
    })

    test('should show different data when navigating months', async ({
      reportPage,
      dbHelper,
      syncHelper,
    }) => {
      const accountId = await seedAccount(testAccounts.usdCash())
      const incomeId = await dbHelper.seedIncomeSource(testIncomeSources.salary())

      await dbHelper.seedTransaction({
        type: 'income',
        amount: 5000,
        currency: 'USD',
        accountId,
        incomeSourceId: incomeId,
        date: new Date(),
      })
      await dbHelper.refreshStoreData()

      await reportPage.navigateTo('report')
      await expect(reportPage.getIncomeAmount()).toContainText('5,000')

      await reportPage.goToPreviousMonth()
      await expect(reportPage.getIncomeAmount()).toContainText('0')

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
      }
    })

    test('should display total balance from all accounts', async ({
      reportPage,
      dbHelper,
      syncHelper,
    }) => {
      await seedAccount({ ...testAccounts.usdCash(), balance: 1000 })
      await seedAccount({
        name: 'Savings',
        type: 'bank',
        currency: 'USD',
        balance: 2500,
        color: '#3b82f6',
        icon: 'piggy-bank',
        sortOrder: 1,
      })
      await dbHelper.refreshStoreData()

      await reportPage.navigateTo('report')

      await expect(reportPage.getTotalBalanceAmount()).toContainText('3,500')

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
      }
    })
  })
}
