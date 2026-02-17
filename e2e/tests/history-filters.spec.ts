import { test, expect, type SyncMode } from '../fixtures/test-base'
import { testAccounts, testCategories, testIncomeSources } from '../fixtures/test-data'

const syncModes: SyncMode[] = ['sync-disabled', 'sync-enabled-online', 'sync-enabled-offline']

for (const mode of syncModes) {
  test.describe(`[${mode}] History Page - Advanced Filters`, () => {
    test.beforeEach(async ({ setupCleanState }) => {
      await setupCleanState(mode)
    })

    test('should filter transactions by account', async ({
      page,
      historyPage,
      dbHelper,
      syncHelper,
    }) => {
      const cashId = await seedAccount({ ...testAccounts.usdCash(), name: 'Cash Wallet' })
      const bankId = await seedAccount({
        name: 'Bank Account',
        type: 'bank',
        currency: 'USD',
        balance: 1000,
        color: '#3b82f6',
        icon: 'landmark',
        sortOrder: 1,
      })
      const catId = await dbHelper.seedCategory(testCategories.food())

      await dbHelper.seedTransaction({
        type: 'expense',
        amount: 50,
        currency: 'USD',
        accountId: cashId,
        categoryId: catId,
        comment: 'Cash purchase',
      })
      await dbHelper.seedTransaction({
        type: 'expense',
        amount: 100,
        currency: 'USD',
        accountId: bankId,
        categoryId: catId,
        comment: 'Card purchase',
      })
      await dbHelper.refreshStoreData()

      await historyPage.navigateTo('history')

      await expect(page.locator('text=Cash purchase')).toBeVisible()
      await expect(page.locator('text=Card purchase')).toBeVisible()

      await historyPage.toggleFilters()

      await page
        .locator('button[class*="border"]')
        .filter({ hasText: /all.*accounts|все.*счета/i })
        .click()
      await page.locator('[role="option"]').filter({ hasText: 'Cash Wallet' }).click()

      await expect(page.locator('text=Cash purchase')).toBeVisible()
      await expect(page.locator('text=Card purchase')).not.toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
      }
    })

    test('should filter transactions by category', async ({
      page,
      historyPage,
      dbHelper,
      syncHelper,
    }) => {
      const accountId = await seedAccount(testAccounts.usdCash())
      const foodId = await dbHelper.seedCategory(testCategories.food())
      const transportId = await dbHelper.seedCategory(testCategories.transport())

      await dbHelper.seedTransaction({
        type: 'expense',
        amount: 30,
        currency: 'USD',
        accountId,
        categoryId: foodId,
        comment: 'Groceries',
      })
      await dbHelper.seedTransaction({
        type: 'expense',
        amount: 20,
        currency: 'USD',
        accountId,
        categoryId: transportId,
        comment: 'Bus ticket',
      })
      await dbHelper.refreshStoreData()

      await historyPage.navigateTo('history')
      await historyPage.filterByType('expense')

      await historyPage.toggleFilters()

      const categorySelect = page.locator('button[class*="border"]').last()
      await categorySelect.click()
      await page.locator('[role="option"]').filter({ hasText: 'Food' }).click()

      await expect(page.locator('text=Groceries')).toBeVisible()
      await expect(page.locator('text=Bus ticket')).not.toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
      }
    })

    test('should filter transactions by date - today', async ({
      page,
      historyPage,
      dbHelper,
      syncHelper,
    }) => {
      const accountId = await seedAccount(testAccounts.usdCash())
      const catId = await dbHelper.seedCategory(testCategories.food())

      await dbHelper.seedTransaction({
        type: 'expense',
        amount: 25,
        currency: 'USD',
        accountId,
        categoryId: catId,
        date: new Date(),
        comment: 'Today expense',
      })
      await dbHelper.refreshStoreData()

      await historyPage.navigateTo('history')

      await historyPage.toggleFilters()
      await page
        .locator('button[class*="border"]')
        .filter({ hasText: /this.*month|этот.*месяц/i })
        .click()
      await page
        .locator('[role="option"]')
        .filter({ hasText: /today|сегодня/i })
        .click()

      await expect(page.locator('text=Today expense')).toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
      }
    })

    test('should filter transactions by date - this month', async ({
      page,
      historyPage,
      dbHelper,
      syncHelper,
    }) => {
      const accountId = await seedAccount(testAccounts.usdCash())
      const catId = await dbHelper.seedCategory(testCategories.food())

      await dbHelper.seedTransaction({
        type: 'expense',
        amount: 75,
        currency: 'USD',
        accountId,
        categoryId: catId,
        date: new Date(),
        comment: 'Monthly expense',
      })
      await dbHelper.refreshStoreData()

      await historyPage.navigateTo('history')

      await expect(page.locator('text=Monthly expense')).toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
      }
    })

    test('should filter transactions by custom date range', async ({
      page,
      historyPage,
      dbHelper,
      syncHelper,
    }) => {
      const accountId = await seedAccount(testAccounts.usdCash())
      const catId = await dbHelper.seedCategory(testCategories.food())

      await dbHelper.seedTransaction({
        type: 'expense',
        amount: 50,
        currency: 'USD',
        accountId,
        categoryId: catId,
        date: new Date(),
        comment: 'Date range test',
      })
      await dbHelper.refreshStoreData()

      await historyPage.navigateTo('history')

      await historyPage.toggleFilters()
      await page
        .locator('button[class*="border"]')
        .filter({ hasText: /this.*month|этот.*месяц/i })
        .click()
      await page
        .locator('[role="option"]')
        .filter({ hasText: /custom|произвольн/i })
        .click()

      const today = new Date().toISOString().split('T')[0]
      await page.locator('input[type="date"]').first().fill(today)
      await page.locator('input[type="date"]').last().fill(today)

      await expect(page.locator('text=Date range test')).toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
      }
    })

    test('should search transactions by comment', async ({
      page,
      historyPage,
      dbHelper,
      syncHelper,
    }) => {
      const accountId = await seedAccount(testAccounts.usdCash())
      const foodId = await dbHelper.seedCategory(testCategories.food())
      const transportId = await dbHelper.seedCategory(testCategories.transport())

      await dbHelper.seedTransaction({
        type: 'expense',
        amount: 15,
        currency: 'USD',
        accountId,
        categoryId: foodId,
        comment: 'Coffee at Starbucks',
      })
      await dbHelper.seedTransaction({
        type: 'expense',
        amount: 35,
        currency: 'USD',
        accountId,
        categoryId: transportId,
        comment: 'Uber to airport',
      })
      await dbHelper.refreshStoreData()

      await historyPage.navigateTo('history')
      await historyPage.search('Starbucks')

      await expect(page.locator('text=Coffee at Starbucks')).toBeVisible()
      await expect(page.locator('text=Uber to airport')).not.toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
      }
    })

    test('should search transactions by account name', async ({
      page,
      historyPage,
      dbHelper,
      syncHelper,
    }) => {
      const walletId = await seedAccount({
        ...testAccounts.usdCash(),
        name: 'Main Wallet',
      })
      const savingsId = await seedAccount({
        name: 'Savings',
        type: 'bank',
        currency: 'USD',
        balance: 500,
        color: '#22c55e',
        icon: 'piggy-bank',
        sortOrder: 1,
      })
      const catId = await dbHelper.seedCategory(testCategories.food())

      await dbHelper.seedTransaction({
        type: 'expense',
        amount: 40,
        currency: 'USD',
        accountId: walletId,
        categoryId: catId,
        comment: 'From wallet',
      })
      await dbHelper.seedTransaction({
        type: 'expense',
        amount: 60,
        currency: 'USD',
        accountId: savingsId,
        categoryId: catId,
        comment: 'From savings',
      })
      await dbHelper.refreshStoreData()

      await historyPage.navigateTo('history')
      await historyPage.search('Savings')

      await expect(page.locator('text=From savings')).toBeVisible()
      await expect(page.locator('text=From wallet')).not.toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
      }
    })

    test('should combine multiple filters (type + account)', async ({
      page,
      historyPage,
      dbHelper,
      syncHelper,
    }) => {
      const cashId = await seedAccount({ ...testAccounts.usdCash(), name: 'Cash' })
      const incomeId = await dbHelper.seedIncomeSource(testIncomeSources.salary())
      const catId = await dbHelper.seedCategory(testCategories.food())

      await dbHelper.seedTransaction({
        type: 'income',
        amount: 1000,
        currency: 'USD',
        accountId: cashId,
        incomeSourceId: incomeId,
        comment: 'Salary income',
      })
      await dbHelper.seedTransaction({
        type: 'expense',
        amount: 50,
        currency: 'USD',
        accountId: cashId,
        categoryId: catId,
        comment: 'Food expense',
      })
      await dbHelper.refreshStoreData()

      await historyPage.navigateTo('history')

      await historyPage.filterByType('expense')

      await historyPage.toggleFilters()
      await page
        .locator('button[class*="border"]')
        .filter({ hasText: /all.*accounts|все.*счета/i })
        .click()
      await page.locator('[role="option"]').filter({ hasText: 'Cash' }).click()

      await expect(page.locator('text=Food expense')).toBeVisible()
      await expect(page.locator('text=Salary income')).not.toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
      }
    })

    test('should show all transactions when clearing filters', async ({
      page,
      historyPage,
      dbHelper,
      syncHelper,
    }) => {
      const accountId = await seedAccount(testAccounts.usdCash())
      const incomeId = await dbHelper.seedIncomeSource(testIncomeSources.salary())
      const catId = await dbHelper.seedCategory(testCategories.food())

      await dbHelper.seedTransaction({
        type: 'income',
        amount: 500,
        currency: 'USD',
        accountId,
        incomeSourceId: incomeId,
        comment: 'Income transaction',
      })
      await dbHelper.seedTransaction({
        type: 'expense',
        amount: 100,
        currency: 'USD',
        accountId,
        categoryId: catId,
        comment: 'Expense transaction',
      })
      await dbHelper.refreshStoreData()

      await historyPage.navigateTo('history')
      await historyPage.filterByType('income')

      await expect(page.locator('text=Income transaction')).toBeVisible()
      await expect(page.locator('text=Expense transaction')).not.toBeVisible()

      await historyPage.filterByType('all')

      await expect(page.locator('text=Income transaction')).toBeVisible()
      await expect(page.locator('text=Expense transaction')).toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
      }
    })
  })
}
