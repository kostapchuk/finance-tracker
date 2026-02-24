import { test, expect, type SyncMode } from '../fixtures/test-base'
import { testAccounts } from '../fixtures/test-data'

const syncModes: SyncMode[] = [
  'sync-disabled',
  'sync-disabled-offline',
  'sync-enabled-online',
  'sync-enabled-offline',
]

for (const mode of syncModes) {
  test.describe(`[${mode}] Transfer`, () => {
    test.beforeEach(async ({ setupCleanState }) => {
      await setupCleanState(mode)
    })

    test('should create transfer between accounts with same currency', async ({
      page,
      historyPage,
      reportPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      const usdCashId = await seedAccount(testAccounts.usdCash())
      const usdBankId = await dbHelper.seedAccount({
        name: 'USD Bank',
        type: 'bank',
        currency: 'USD',
        balance: 500,
        color: '#3b82f6',
        icon: 'landmark',
        sortOrder: 1,
      })

      await dbHelper.seedTransaction({
        type: 'transfer',
        amount: 100,
        currency: 'USD',
        accountId: usdCashId,
        toAccountId: usdBankId,
        date: new Date(),
        comment: 'Same currency transfer',
      })
      await dbHelper.updateAccountBalance(usdCashId, 900)
      await dbHelper.updateAccountBalance(usdBankId, 600)
      await dbHelper.refreshStoreData()
      await page.reload()
      await page.waitForLoadState('networkidle')

      // 1. Verify transfer appears in history page
      await historyPage.navigateTo('history')
      await historyPage.filterByType('transfers')
      await expect(historyPage.getTransactionByTitle('Same currency transfer')).toBeVisible()

      // 2. Verify account balances
      const cashBalance = await dbHelper.getAccountBalance(usdCashId)
      const bankBalance = await dbHelper.getAccountBalance(usdBankId)
      expect(cashBalance).toBe(900)
      expect(bankBalance).toBe(600)

      // 3. Verify transaction count
      const txCount = await dbHelper.getTransactionCount()
      expect(txCount).toBe(1)

      if (mode.startsWith('sync-enabled')) {
        await syncHelper.waitForSyncToComplete()
        const remoteTransactions = syncHelper.getMockRemoteData('transactions')
        expect(remoteTransactions.length).toBe(1)
        expect(remoteTransactions[0].type).toBe('transfer')
      }
    })

    test('should create transfer between accounts with different currencies', async ({
      page,
      historyPage,
      reportPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      const usdAccountId = await seedAccount(testAccounts.usdCash())
      const eurAccountId = await seedAccount(testAccounts.eurBank())

      await dbHelper.seedTransaction({
        type: 'transfer',
        amount: 100,
        currency: 'USD',
        accountId: usdAccountId,
        toAccountId: eurAccountId,
        toAmount: 90,
        date: new Date(),
        comment: 'Multi-currency transfer',
      })
      await dbHelper.updateAccountBalance(usdAccountId, 900)
      await dbHelper.updateAccountBalance(eurAccountId, 2090)
      await dbHelper.refreshStoreData()
      await page.reload()
      await page.waitForLoadState('networkidle')

      // 1. Verify transfer appears in history page
      await historyPage.navigateTo('history')
      await historyPage.filterByType('transfers')
      await expect(historyPage.getTransactionByTitle('Multi-currency transfer')).toBeVisible()

      // 2. Verify account balances
      const usdBalance = await dbHelper.getAccountBalance(usdAccountId)
      const eurBalance = await dbHelper.getAccountBalance(eurAccountId)
      expect(usdBalance).toBe(900)
      expect(eurBalance).toBe(2090)

      // 3. Verify transaction count
      const txCount = await dbHelper.getTransactionCount()
      expect(txCount).toBe(1)

      if (mode.startsWith('sync-enabled')) {
        await syncHelper.waitForSyncToComplete()
        const remoteTransactions = syncHelper.getMockRemoteData('transactions')
        expect(remoteTransactions.length).toBe(1)
        expect(remoteTransactions[0].toAmount).toBe(90)
      }
    })

    test('should edit transfer and update both account balances', async ({
      page,
      historyPage,
      reportPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      const usdAccountId = await seedAccount(testAccounts.usdCash())
      const eurAccountId = await seedAccount(testAccounts.eurBank())

      await dbHelper.seedTransaction({
        type: 'transfer',
        amount: 100,
        currency: 'USD',
        accountId: usdAccountId,
        toAccountId: eurAccountId,
        toAmount: 90,
        date: new Date(),
        comment: 'Initial transfer',
      })
      await dbHelper.updateAccountBalance(usdAccountId, 900)
      await dbHelper.updateAccountBalance(eurAccountId, 2090)
      await dbHelper.refreshStoreData()
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Edit the transfer
      await historyPage.navigateTo('history')
      await historyPage.filterByType('transfers')
      await historyPage.clickTransactionByComment('Initial transfer')
      await page.waitForTimeout(300)

      const amountInputs = page.locator('input[inputmode="decimal"]')
      await amountInputs.first().fill('150')
      await amountInputs.nth(1).fill('135')

      await page
        .locator('button')
        .filter({ hasText: /update|обновить/i })
        .click()
      await page.waitForTimeout(500)

      // 1. Verify account balances updated
      const usdBalance = await dbHelper.getAccountBalance(usdAccountId)
      const eurBalance = await dbHelper.getAccountBalance(eurAccountId)
      expect(usdBalance).toBe(850)
      expect(eurBalance).toBe(2135)

      // 2. Verify transfer still visible in history with updated values
      await historyPage.navigateTo('history')
      await historyPage.filterByType('transfers')
      await expect(historyPage.getTransactionByTitle('Initial transfer')).toBeVisible()

      if (mode.startsWith('sync-enabled')) {
        await syncHelper.waitForSyncToComplete()
        const remoteTransactions = syncHelper.getMockRemoteData('transactions')
        expect(remoteTransactions[0].amount).toBe(150)
        expect(remoteTransactions[0].toAmount).toBe(135)
      }
    })

    test('should delete transfer and reverse both account balances', async ({
      page,
      historyPage,
      reportPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      const usdAccountId = await seedAccount(testAccounts.usdCash())
      const eurAccountId = await seedAccount(testAccounts.eurBank())

      await dbHelper.seedTransaction({
        type: 'transfer',
        amount: 200,
        currency: 'USD',
        accountId: usdAccountId,
        toAccountId: eurAccountId,
        toAmount: 180,
        date: new Date(),
        comment: 'Transfer to delete',
      })
      await dbHelper.updateAccountBalance(usdAccountId, 800)
      await dbHelper.updateAccountBalance(eurAccountId, 2180)
      await dbHelper.refreshStoreData()
      await page.reload()
      await page.waitForLoadState('networkidle')

      page.on('dialog', async (dialog) => {
        await dialog.accept()
      })

      // Delete the transfer
      await historyPage.navigateTo('history')
      await historyPage.filterByType('transfers')
      await historyPage.clickTransactionByComment('Transfer to delete')
      await page.waitForTimeout(300)

      await page
        .locator('button')
        .filter({ has: page.locator('.lucide-trash-2') })
        .click()
      await page.waitForTimeout(500)

      // 1. Verify account balances restored
      const usdBalance = await dbHelper.getAccountBalance(usdAccountId)
      const eurBalance = await dbHelper.getAccountBalance(eurAccountId)
      expect(usdBalance).toBe(1000)
      expect(eurBalance).toBe(2000)

      // 2. Verify transfer no longer in history
      await historyPage.navigateTo('history')
      await historyPage.filterByType('transfers')
      await expect(historyPage.getTransactionByTitle('Transfer to delete')).not.toBeVisible()

      // 3. Verify transaction count is 0
      const txCount = await dbHelper.getTransactionCount()
      expect(txCount).toBe(0)

      if (mode.startsWith('sync-enabled')) {
        await syncHelper.waitForSyncToComplete()
        const remoteTransactions = syncHelper.getMockRemoteData('transactions')
        expect(remoteTransactions.length).toBe(0)
      }
    })

    test('should show transfer with correct amounts in history', async ({
      page,
      historyPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      const usdAccountId = await seedAccount(testAccounts.usdCash())
      const eurAccountId = await seedAccount(testAccounts.eurBank())

      await dbHelper.seedTransaction({
        type: 'transfer',
        amount: 250,
        currency: 'USD',
        accountId: usdAccountId,
        toAccountId: eurAccountId,
        toAmount: 225,
        date: new Date(),
        comment: 'Display test transfer',
      })
      await dbHelper.updateAccountBalance(usdAccountId, 750)
      await dbHelper.updateAccountBalance(eurAccountId, 2225)
      await dbHelper.refreshStoreData()
      await page.reload()
      await page.waitForLoadState('networkidle')

      // 1. Verify transfer visible in history
      await historyPage.navigateTo('history')
      await historyPage.filterByType('transfers')
      await expect(historyPage.getTransactionByTitle('Display test transfer')).toBeVisible()

      // 2. Verify amounts displayed
      const historyItem = page.locator('text=/250|225/')
      await expect(historyItem.first()).toBeVisible()

      if (mode.startsWith('sync-enabled')) {
        await syncHelper.waitForSyncToComplete()
        const remoteTransactions = syncHelper.getMockRemoteData('transactions')
        expect(remoteTransactions.length).toBe(1)
      }
    })

    test('should persist transfer after offline and back online', async ({
      page,
      historyPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      if (mode !== 'sync-enabled-offline') {
        test.skip()
        return
      }

      const usdAccountId = await seedAccount(testAccounts.usdCash())
      const eurAccountId = await seedAccount(testAccounts.eurBank())

      await dbHelper.seedTransaction({
        type: 'transfer',
        amount: 300,
        currency: 'USD',
        accountId: usdAccountId,
        toAccountId: eurAccountId,
        toAmount: 270,
        date: new Date(),
        comment: 'Offline transfer',
      })
      await dbHelper.updateAccountBalance(usdAccountId, 700)
      await dbHelper.updateAccountBalance(eurAccountId, 2270)
      await dbHelper.refreshStoreData()

      // 1. Verify transfer visible in history
      await historyPage.navigateTo('history')
      await historyPage.filterByType('transfers')
      await expect(historyPage.getTransactionByTitle('Offline transfer')).toBeVisible()

      // 2. Capture state before going online
      const usdBalanceBeforeOnline = await dbHelper.getAccountBalance(usdAccountId)
      const eurBalanceBeforeOnline = await dbHelper.getAccountBalance(eurAccountId)
      const txCountBeforeOnline = await dbHelper.getTransactionCount()

      // 3. Verify sync queue has pending items
      const queueCount = await syncHelper.getSyncQueueCount()
      expect(queueCount).toBeGreaterThan(0)

      // 4. Go online and verify sync completes
      await syncHelper.goOnline()
      await syncHelper.waitForSyncToComplete()

      const finalQueueCount = await syncHelper.getSyncQueueCount()
      expect(finalQueueCount).toBe(0)

      // 5. Reload page and verify data persists
      await page.reload()
      await page.waitForLoadState('networkidle')
      await page.waitForSelector('nav', { state: 'visible', timeout: 10000 })

      // 6. Verify balances unchanged after reload
      const usdBalanceAfterReload = await dbHelper.getAccountBalance(usdAccountId)
      const eurBalanceAfterReload = await dbHelper.getAccountBalance(eurAccountId)
      expect(usdBalanceAfterReload).toBe(usdBalanceBeforeOnline)
      expect(eurBalanceAfterReload).toBe(eurBalanceBeforeOnline)

      // 7. Verify transaction count unchanged
      const txCountAfterReload = await dbHelper.getTransactionCount()
      expect(txCountAfterReload).toBe(txCountBeforeOnline)

      // 8. Verify transfer still in history
      await historyPage.navigateTo('history')
      await historyPage.filterByType('transfers')
      await expect(historyPage.getTransactionByTitle('Offline transfer')).toBeVisible()

      // 9. Verify remote data
      const remoteTransactions = syncHelper.getMockRemoteData('transactions')
      expect(remoteTransactions.length).toBe(1)
      expect(remoteTransactions[0].comment).toBe('Offline transfer')
    })

    test('should persist transfer in offline mode without sync', async ({
      page,
      historyPage,
      dbHelper,
      seedAccount,
    }) => {
      if (mode !== 'sync-disabled-offline') {
        test.skip()
        return
      }

      const usdAccountId = await seedAccount(testAccounts.usdCash())
      const eurAccountId = await seedAccount(testAccounts.eurBank())

      await dbHelper.seedTransaction({
        type: 'transfer',
        amount: 250,
        currency: 'USD',
        accountId: usdAccountId,
        toAccountId: eurAccountId,
        toAmount: 225,
        date: new Date(),
        comment: 'Offline no sync transfer',
      })
      await dbHelper.updateAccountBalance(usdAccountId, 750)
      await dbHelper.updateAccountBalance(eurAccountId, 2225)
      await dbHelper.refreshStoreData()

      // 1. Verify transfer visible in history
      await historyPage.navigateTo('history')
      await historyPage.filterByType('transfers')
      await expect(historyPage.getTransactionByTitle('Offline no sync transfer')).toBeVisible()

      // 2. Capture state before reload
      const usdBalanceBeforeReload = await dbHelper.getAccountBalance(usdAccountId)
      const eurBalanceBeforeReload = await dbHelper.getAccountBalance(eurAccountId)
      const txCountBeforeReload = await dbHelper.getTransactionCount()

      // 3. Reload page and verify data persists
      await page.reload()
      await page.waitForLoadState('networkidle')
      await page.waitForSelector('nav', { state: 'visible', timeout: 10000 })

      // 4. Verify balances unchanged after reload
      const usdBalanceAfterReload = await dbHelper.getAccountBalance(usdAccountId)
      const eurBalanceAfterReload = await dbHelper.getAccountBalance(eurAccountId)
      expect(usdBalanceAfterReload).toBe(usdBalanceBeforeReload)
      expect(eurBalanceAfterReload).toBe(eurBalanceBeforeReload)

      // 5. Verify transaction count unchanged
      const txCountAfterReload = await dbHelper.getTransactionCount()
      expect(txCountAfterReload).toBe(txCountBeforeReload)

      // 6. Verify transfer still in history
      await historyPage.navigateTo('history')
      await historyPage.filterByType('transfers')
      await expect(historyPage.getTransactionByTitle('Offline no sync transfer')).toBeVisible()
    })
  })
}
