import { test, expect, type SyncMode } from '../fixtures/test-base'
import { testAccounts, testCategories, testIncomeSources } from '../fixtures/test-data'

const syncModes: SyncMode[] = [
  'sync-disabled',
  'sync-disabled-offline',
  'sync-enabled-online',
  'sync-enabled-offline',
]

for (const mode of syncModes) {
  test.describe(`[${mode}] Transaction Edit/Delete`, () => {
    test.beforeEach(async ({ setupCleanState }) => {
      await setupCleanState(mode)
    })

    test('should edit transfer transaction amounts for multi-currency', async ({
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

      // Navigate and edit
      await historyPage.navigateTo('history')
      await historyPage.filterByType('transfers')
      await historyPage.clickTransactionByComment('Initial transfer')
      await page.waitForTimeout(300)

      const amountInputs = page.locator('input[inputmode="decimal"]')
      await amountInputs.first().click()
      await amountInputs.first().fill('150')
      await amountInputs.nth(1).click()
      await amountInputs.nth(1).fill('135')

      await page
        .locator('button')
        .filter({ hasText: /update|обновить/i })
        .click()
      await page.waitForTimeout(500)

      // 1. Verify both account balances updated
      const usdBalance = await dbHelper.getAccountBalance(usdAccountId)
      const eurBalance = await dbHelper.getAccountBalance(eurAccountId)
      expect(usdBalance).toBe(850)
      expect(eurBalance).toBe(2135)

      // 2. Verify transfer still visible in history
      await historyPage.navigateTo('history')
      await historyPage.filterByType('transfers')
      await expect(historyPage.getTransactionByTitle('Initial transfer')).toBeVisible()

      if (mode.startsWith('sync-enabled')) {
        await syncHelper.waitForSyncToComplete()
        const remoteTransactions = syncHelper.getMockRemoteData('transactions')
        expect(remoteTransactions[0].amount).toBe(150)
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
        amount: 100,
        currency: 'USD',
        accountId: usdAccountId,
        toAccountId: eurAccountId,
        toAmount: 90,
        date: new Date(),
        comment: 'Transfer to delete',
      })
      await dbHelper.updateAccountBalance(usdAccountId, 900)
      await dbHelper.updateAccountBalance(eurAccountId, 2090)
      await dbHelper.refreshStoreData()

      page.on('dialog', async (dialog) => {
        await dialog.accept()
      })

      // Navigate and delete
      await historyPage.navigateTo('history')
      await historyPage.filterByType('transfers')
      await historyPage.clickTransactionByComment('Transfer to delete')
      await page.waitForTimeout(300)

      await page
        .locator('button')
        .filter({ has: page.locator('.lucide-trash-2') })
        .click()
      await page.waitForTimeout(500)

      // 1. Verify both account balances reversed
      const usdFinal = await dbHelper.getAccountBalance(usdAccountId)
      const eurFinal = await dbHelper.getAccountBalance(eurAccountId)
      expect(usdFinal).toBe(1000)
      expect(eurFinal).toBe(2000)

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

    test('should persist edited transaction after offline and back online', async ({
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

      const accountId = await seedAccount(testAccounts.usdCash())
      const incomeId = await dbHelper.seedIncomeSource(testIncomeSources.salary())

      await dbHelper.seedTransaction({
        type: 'income',
        amount: 500,
        currency: 'USD',
        accountId,
        incomeSourceId: incomeId,
        date: new Date(),
        comment: 'Offline edit test',
      })
      await dbHelper.updateAccountBalance(accountId, 1500)
      await dbHelper.refreshStoreData()

      // Navigate and edit
      await historyPage.navigateTo('history')
      await historyPage.filterByType('income')
      await historyPage.clickTransactionByComment('Offline edit test')
      await page.waitForTimeout(300)

      const amountInput = page.locator('input[inputmode="decimal"]').first()
      await amountInput.click()
      await amountInput.fill('750')

      await page
        .locator('button')
        .filter({ hasText: /update|обновить/i })
        .click()
      await page.waitForTimeout(500)

      // 1. Capture state before going online
      const balanceBeforeOnline = await dbHelper.getAccountBalance(accountId)
      const txCountBeforeOnline = await dbHelper.getTransactionCount()

      // 2. Verify sync queue has pending items
      const queueCount = await syncHelper.getSyncQueueCount()
      expect(queueCount).toBeGreaterThan(0)

      // 3. Go online and verify sync completes
      await syncHelper.goOnline()
      await syncHelper.waitForSyncToComplete()

      const finalQueueCount = await syncHelper.getSyncQueueCount()
      expect(finalQueueCount).toBe(0)

      // 4. Reload page and verify data persists
      await page.reload()
      await page.waitForLoadState('networkidle')
      await page.waitForSelector('nav', { state: 'visible', timeout: 10000 })

      // 5. Verify balance unchanged after reload
      const balanceAfterReload = await dbHelper.getAccountBalance(accountId)
      expect(balanceAfterReload).toBe(balanceBeforeOnline)

      // 6. Verify transaction count unchanged
      const txCountAfterReload = await dbHelper.getTransactionCount()
      expect(txCountAfterReload).toBe(txCountBeforeOnline)

      // 7. Verify transaction still in history with updated amount
      await historyPage.navigateTo('history')
      await historyPage.filterByType('income')
      await expect(historyPage.getTransactionByTitle('Salary')).toBeVisible()

      // 8. Verify remote data
      const remoteTransactions = syncHelper.getMockRemoteData('transactions')
      expect(remoteTransactions[0].amount).toBe(750)
    })

    test('should persist edited transaction in offline mode without sync', async ({
      page,
      historyPage,
      dbHelper,
      seedAccount,
    }) => {
      if (mode !== 'sync-disabled-offline') {
        test.skip()
        return
      }

      const accountId = await seedAccount(testAccounts.usdCash())
      const incomeId = await dbHelper.seedIncomeSource(testIncomeSources.salary())

      await dbHelper.seedTransaction({
        type: 'income',
        amount: 400,
        currency: 'USD',
        accountId,
        incomeSourceId: incomeId,
        date: new Date(),
        comment: 'Offline no sync edit',
      })
      await dbHelper.updateAccountBalance(accountId, 1400)
      await dbHelper.refreshStoreData()

      // Navigate and edit
      await historyPage.navigateTo('history')
      await historyPage.filterByType('income')
      await historyPage.clickTransactionByComment('Offline no sync edit')
      await page.waitForTimeout(300)

      const amountInput = page.locator('input[inputmode="decimal"]').first()
      await amountInput.click()
      await amountInput.fill('600')

      await page
        .locator('button')
        .filter({ hasText: /update|обновить/i })
        .click()
      await page.waitForTimeout(500)

      // 1. Capture state before reload
      const balanceBeforeReload = await dbHelper.getAccountBalance(accountId)
      const txCountBeforeReload = await dbHelper.getTransactionCount()

      // 2. Verify transaction in history
      await historyPage.navigateTo('history')
      await historyPage.filterByType('income')
      await expect(historyPage.getTransactionByTitle('Salary')).toBeVisible()

      // 3. Reload page and verify data persists
      await page.reload()
      await page.waitForLoadState('networkidle')
      await page.waitForSelector('nav', { state: 'visible', timeout: 10000 })

      // 4. Verify balance unchanged after reload
      const balanceAfterReload = await dbHelper.getAccountBalance(accountId)
      expect(balanceAfterReload).toBe(balanceBeforeReload)

      // 5. Verify transaction count unchanged
      const txCountAfterReload = await dbHelper.getTransactionCount()
      expect(txCountAfterReload).toBe(txCountBeforeReload)

      // 6. Verify transaction still in history
      await historyPage.navigateTo('history')
      await historyPage.filterByType('income')
      await expect(historyPage.getTransactionByTitle('Salary')).toBeVisible()
    })

    test('should delete transaction with temp ID (offline-created transaction)', async ({
      page,
      historyPage,
      dbHelper,
      syncHelper,
      seedAccount,
      seedCategory,
    }) => {
      // This test is specifically for the bug fix where temp ID transactions couldn't be deleted
      // We only test in sync-disabled mode to avoid interference from sync logic
      // The core fix is in the delete function which handles temp IDs regardless of sync state
      if (mode.startsWith('sync-enabled')) {
        test.skip()
        return
      }

      const accountId = await seedAccount(testAccounts.usdCash())
      const catId = await seedCategory(testCategories.food())
      await dbHelper.refreshStoreData()

      // Create a transaction with a temp ID (simulating offline creation)
      // Use temp_ prefix like the app does
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

      await page.evaluate(
        async ({ transactionData, tempId }) => {
          const request = indexedDB.open('FinanceTrackerCache')
          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
          })
          const tx = db.transaction('transactions', 'readwrite')
          const store = tx.objectStore('transactions')
          const now = new Date()
          await new Promise<void>((resolve, reject) => {
            const addRequest = store.add({
              id: tempId,
              ...transactionData,
              date: new Date(),
              userId: 'test-user-id',
              createdAt: now,
              updatedAt: now,
            })
            addRequest.onsuccess = () => {
              db.close()
              resolve()
            }
            addRequest.onerror = () => {
              db.close()
              reject(addRequest.error)
            }
          })
        },
        {
          transactionData: {
            type: 'expense',
            amount: 50,
            currency: 'USD',
            accountId,
            categoryId: catId,
            comment: 'Temp ID transaction',
          },
          tempId,
        }
      )

      // Update account balance to match
      await dbHelper.updateAccountBalance(accountId, 950)
      await dbHelper.refreshStoreData()

      // Verify transaction was created with temp ID
      const txCountAfterCreate = await dbHelper.getTransactionCount()
      expect(txCountAfterCreate).toBe(1)

      // Navigate to history and delete the transaction
      await historyPage.navigateTo('history')

      // Accept the confirmation dialog
      page.on('dialog', async (dialog) => {
        await dialog.accept()
      })

      // Click on the transaction to open edit modal
      await historyPage.clickTransactionByComment('Temp ID transaction')
      await page.waitForTimeout(300)

      // Click delete button
      await page
        .locator('button')
        .filter({ has: page.locator('.lucide-trash-2') })
        .click()
      await page.waitForTimeout(500)

      // 1. Verify transaction was deleted locally
      const txCountAfterDelete = await dbHelper.getTransactionCount()
      expect(txCountAfterDelete).toBe(0)

      // 2. Verify account balance was reversed
      const finalBalance = await dbHelper.getAccountBalance(accountId)
      expect(finalBalance).toBe(1000)

      // 3. Verify transaction no longer in history
      await historyPage.navigateTo('history')
      await expect(historyPage.getTransactionByTitle('Temp ID transaction')).not.toBeVisible()
    })

    test('should show newly created offline transaction in history', async ({
      page,
      historyPage,
      dashboardPage,
      dbHelper,
      syncHelper,
      seedAccount,
      seedCategory,
    }) => {
      if (mode.startsWith('sync-enabled')) {
        test.skip()
        return
      }

      const accountId = await seedAccount(testAccounts.usdCash())
      const catId = await seedCategory(testCategories.food())
      await dbHelper.refreshStoreData()

      // Create a transaction with a temp ID (simulating offline creation)
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

      await page.evaluate(
        async ({ transactionData, tempId }) => {
          const request = indexedDB.open('FinanceTrackerCache')
          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
          })
          const tx = db.transaction('transactions', 'readwrite')
          const store = tx.objectStore('transactions')
          const now = new Date()
          await new Promise<void>((resolve, reject) => {
            const addRequest = store.add({
              id: tempId,
              ...transactionData,
              date: new Date(),
              userId: 'test-user-id',
              createdAt: now,
              updatedAt: now,
            })
            addRequest.onsuccess = () => {
              db.close()
              resolve()
            }
            addRequest.onerror = () => {
              db.close()
              reject(addRequest.error)
            }
          })
        },
        {
          transactionData: {
            type: 'expense',
            amount: 75,
            currency: 'USD',
            accountId,
            categoryId: catId,
            comment: 'New offline transaction',
          },
          tempId,
        }
      )

      // Verify transaction was created
      const txCountAfterCreate = await dbHelper.getTransactionCount()
      expect(txCountAfterCreate).toBe(1)

      // Navigate to history - the transaction should be visible
      await historyPage.navigateTo('history')

      // Wait for transactions to load
      await page.waitForTimeout(500)

      // The new transaction should be visible in history
      await expect(page.locator('text=New offline transaction')).toBeVisible({ timeout: 5000 })
    })

    test('should show transaction immediately after creating while on history page', async ({
      page,
      historyPage,
      dbHelper,
      syncHelper,
      seedAccount,
      seedCategory,
    }) => {
      if (mode.startsWith('sync-enabled')) {
        test.skip()
        return
      }

      const accountId = await seedAccount(testAccounts.usdCash())
      const catId = await seedCategory(testCategories.food())
      await dbHelper.refreshStoreData()

      // First navigate to history page
      await historyPage.navigateTo('history')
      await page.waitForTimeout(500)

      // Verify initial count
      const initialCount = await dbHelper.getTransactionCount()
      expect(initialCount).toBe(0)

      // Create a transaction via direct IndexedDB access (simulating modal save)
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

      await page.evaluate(
        async ({ transactionData, tempId }) => {
          const request = indexedDB.open('FinanceTrackerCache')
          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
          })
          const tx = db.transaction('transactions', 'readwrite')
          const store = tx.objectStore('transactions')
          const now = new Date()
          await new Promise<void>((resolve, reject) => {
            const addRequest = store.add({
              id: tempId,
              ...transactionData,
              date: new Date(),
              userId: 'test-user-id',
              createdAt: now,
              updatedAt: now,
            })
            addRequest.onsuccess = () => {
              db.close()
              resolve()
            }
            addRequest.onerror = () => {
              db.close()
              reject(addRequest.error)
            }
          })
        },
        {
          transactionData: {
            type: 'expense',
            amount: 99,
            currency: 'USD',
            accountId,
            categoryId: catId,
            comment: 'Immediate show test',
          },
          tempId,
        }
      )

      // Verify transaction was created in DB
      const txCountAfterCreate = await dbHelper.getTransactionCount()
      expect(txCountAfterCreate).toBe(1)

      // Reload the page to simulate what happens when React Query updates
      // Note: page reload resets to Dashboard, so we need to navigate back to History
      await dbHelper.refreshStoreData()

      // Navigate to History again after reload
      await historyPage.navigateTo('history')
      await page.waitForTimeout(500)

      // The transaction should now be visible
      await expect(page.locator('text=Immediate show test')).toBeVisible({ timeout: 5000 })
    })

    test('should sync temp ID transaction when coming online', async ({
      page,
      historyPage,
      dbHelper,
      syncHelper,
      seedAccount,
      seedCategory,
    }) => {
      if (mode !== 'sync-enabled-offline') {
        test.skip()
        return
      }

      const accountId = await seedAccount(testAccounts.usdCash())
      const catId = await seedCategory(testCategories.food())
      await dbHelper.refreshStoreData()

      // Create a transaction with a temp ID (simulating offline creation)
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

      await page.evaluate(
        async ({ transactionData, tempId }) => {
          const request = indexedDB.open('FinanceTrackerCache')
          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
          })
          const tx = db.transaction('transactions', 'readwrite')
          const store = tx.objectStore('transactions')
          const now = new Date()
          await new Promise<void>((resolve, reject) => {
            const addRequest = store.add({
              id: tempId,
              ...transactionData,
              date: new Date(),
              userId: 'test-user-id',
              createdAt: now,
              updatedAt: now,
            })
            addRequest.onsuccess = () => {
              db.close()
              resolve()
            }
            addRequest.onerror = () => {
              db.close()
              reject(addRequest.error)
            }
          })
        },
        {
          transactionData: {
            type: 'expense',
            amount: 80,
            currency: 'USD',
            accountId,
            categoryId: catId,
            comment: 'Sync temp ID test',
          },
          tempId,
        }
      )

      // Update account balance
      await dbHelper.updateAccountBalance(accountId, 920)
      await dbHelper.refreshStoreData()

      // 1. Verify transaction was created
      const txCountAfterCreate = await dbHelper.getTransactionCount()
      expect(txCountAfterCreate).toBe(1)

      // 2. Navigate to history and verify it's visible
      await historyPage.navigateTo('history')
      await expect(page.locator('text=Sync temp ID test')).toBeVisible({ timeout: 5000 })

      // 3. Capture state before going online
      const balanceBeforeOnline = await dbHelper.getAccountBalance(accountId)
      const txCountBeforeOnline = await dbHelper.getTransactionCount()

      // 4. Verify sync queue has pending items
      const queueCount = await syncHelper.getSyncQueueCount()
      expect(queueCount).toBeGreaterThan(0)

      // 5. Go online and verify sync completes
      await syncHelper.goOnline()
      await syncHelper.waitForSyncToComplete()

      const finalQueueCount = await syncHelper.getSyncQueueCount()
      expect(finalQueueCount).toBe(0)

      // 6. Reload page and verify data persists
      await page.reload()
      await page.waitForLoadState('networkidle')
      await page.waitForSelector('nav', { state: 'visible', timeout: 10000 })

      // 7. Verify balance unchanged after reload
      const balanceAfterReload = await dbHelper.getAccountBalance(accountId)
      expect(balanceAfterReload).toBe(balanceBeforeOnline)

      // 8. Verify transaction count unchanged
      const txCountAfterReload = await dbHelper.getTransactionCount()
      expect(txCountAfterReload).toBe(txCountBeforeOnline)

      // 9. Verify transaction still in history
      await historyPage.navigateTo('history')
      await expect(page.locator('text=Sync temp ID test')).toBeVisible({ timeout: 5000 })

      // 10. Verify remote data
      const remoteTransactions = syncHelper.getMockRemoteData('transactions')
      expect(remoteTransactions.length).toBe(1)
      expect(remoteTransactions[0].amount).toBe(80)
      expect(remoteTransactions[0].comment).toBe('Sync temp ID test')
    })

    test('should persist temp ID transaction in offline mode without sync', async ({
      page,
      historyPage,
      dbHelper,
      seedAccount,
      seedCategory,
    }) => {
      if (mode !== 'sync-disabled-offline') {
        test.skip()
        return
      }

      const accountId = await seedAccount(testAccounts.usdCash())
      const catId = await seedCategory(testCategories.food())
      await dbHelper.refreshStoreData()

      // Create a transaction with a temp ID (simulating offline creation)
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

      await page.evaluate(
        async ({ transactionData, tempId }) => {
          const request = indexedDB.open('FinanceTrackerCache')
          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
          })
          const tx = db.transaction('transactions', 'readwrite')
          const store = tx.objectStore('transactions')
          const now = new Date()
          await new Promise<void>((resolve, reject) => {
            const addRequest = store.add({
              id: tempId,
              ...transactionData,
              date: new Date(),
              userId: 'test-user-id',
              createdAt: now,
              updatedAt: now,
            })
            addRequest.onsuccess = () => {
              db.close()
              resolve()
            }
            addRequest.onerror = () => {
              db.close()
              reject(addRequest.error)
            }
          })
        },
        {
          transactionData: {
            type: 'expense',
            amount: 65,
            currency: 'USD',
            accountId,
            categoryId: catId,
            comment: 'Offline no sync temp ID',
          },
          tempId,
        }
      )

      // Update account balance
      await dbHelper.updateAccountBalance(accountId, 935)
      await dbHelper.refreshStoreData()

      // 1. Verify transaction was created
      const txCountAfterCreate = await dbHelper.getTransactionCount()
      expect(txCountAfterCreate).toBe(1)

      // 2. Navigate to history and verify it's visible
      await historyPage.navigateTo('history')
      await expect(page.locator('text=Offline no sync temp ID')).toBeVisible({ timeout: 5000 })

      // 3. Capture state before reload
      const balanceBeforeReload = await dbHelper.getAccountBalance(accountId)
      const txCountBeforeReload = await dbHelper.getTransactionCount()

      // 4. Reload page and verify data persists
      await page.reload()
      await page.waitForLoadState('networkidle')
      await page.waitForSelector('nav', { state: 'visible', timeout: 10000 })

      // 5. Verify balance unchanged after reload
      const balanceAfterReload = await dbHelper.getAccountBalance(accountId)
      expect(balanceAfterReload).toBe(balanceBeforeReload)

      // 6. Verify transaction count unchanged
      const txCountAfterReload = await dbHelper.getTransactionCount()
      expect(txCountAfterReload).toBe(txCountBeforeReload)

      // 7. Verify transaction still in history
      await historyPage.navigateTo('history')
      await expect(page.locator('text=Offline no sync temp ID')).toBeVisible({ timeout: 5000 })
    })
  })
}
