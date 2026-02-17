import { test, expect, type SyncMode } from '../fixtures/test-base'
import { testAccounts, testCategories, testIncomeSources } from '../fixtures/test-data'

const syncModes: SyncMode[] = ['sync-disabled', 'sync-enabled-online', 'sync-enabled-offline']

for (const mode of syncModes) {
  test.describe(`[${mode}] Transaction Edit/Delete`, () => {
    test.beforeEach(async ({ setupCleanState }) => {
      await setupCleanState(mode)
    })

    test('should edit income transaction amount from history', async ({
      page,
      historyPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      const accountId = await seedAccount(testAccounts.usdCash())
      const incomeId = await dbHelper.seedIncomeSource(testIncomeSources.salary())

      await dbHelper.seedTransaction({
        type: 'income',
        amount: 1000,
        currency: 'USD',
        accountId,
        incomeSourceId: incomeId,
        date: new Date(),
        comment: 'Initial salary',
      })
      await dbHelper.updateAccountBalance(accountId, 2000)
      await dbHelper.refreshStoreData()

      await historyPage.navigateTo('history')
      await historyPage.filterByType('income')
      await historyPage.clickTransactionByComment('Initial salary')
      await page.waitForTimeout(300)

      const amountInput = page.locator('input[inputmode="decimal"]').first()
      await amountInput.click()
      await amountInput.fill('1500')

      await page
        .locator('button')
        .filter({ hasText: /update|обновить/i })
        .click()
      await page.waitForTimeout(500)

      const finalBalance = await dbHelper.getAccountBalance(accountId)
      expect(finalBalance).toBe(2500)

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteTransactions = syncHelper.getMockRemoteData('transactions')
        expect(remoteTransactions.length).toBe(1)
        expect(remoteTransactions[0].amount).toBe(1500)
      }
    })

    test('should edit expense transaction comment', async ({
      page,
      historyPage,
      dbHelper,
      syncHelper,
      seedAccount,
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
        comment: 'Old comment',
      })
      await dbHelper.updateAccountBalance(accountId, 950)
      await dbHelper.refreshStoreData()

      await historyPage.navigateTo('history')
      await historyPage.filterByType('expense')
      await historyPage.clickTransactionByComment('Old comment')
      await page.waitForTimeout(300)

      const commentTextarea = page.locator('textarea')
      await commentTextarea.click()
      await commentTextarea.fill('Updated grocery shopping')

      await page
        .locator('button')
        .filter({ hasText: /update|обновить/i })
        .click()
      await page.waitForTimeout(500)

      await expect(page.locator('text=Updated grocery shopping')).toBeVisible()
      await expect(page.locator('text=Old comment')).not.toBeVisible()

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteTransactions = syncHelper.getMockRemoteData('transactions')
        expect(remoteTransactions[0].comment).toBe('Updated grocery shopping')
      }
    })

    test('should edit transfer transaction amounts for multi-currency', async ({
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

      const usdBalance = await dbHelper.getAccountBalance(usdAccountId)
      const eurBalance = await dbHelper.getAccountBalance(eurAccountId)
      expect(usdBalance).toBe(850)
      expect(eurBalance).toBe(2135)

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteTransactions = syncHelper.getMockRemoteData('transactions')
        expect(remoteTransactions[0].amount).toBe(150)
      }
    })

    test('should delete income transaction and reverse balance', async ({
      page,
      historyPage,
      dbHelper,
      syncHelper,
      seedAccount,
    }) => {
      const accountId = await seedAccount(testAccounts.usdCash())
      const incomeId = await dbHelper.seedIncomeSource(testIncomeSources.salary())

      await dbHelper.seedTransaction({
        type: 'income',
        amount: 2000,
        currency: 'USD',
        accountId,
        incomeSourceId: incomeId,
        date: new Date(),
        comment: 'To be deleted',
      })
      await dbHelper.updateAccountBalance(accountId, 3000)
      await dbHelper.refreshStoreData()

      const balanceAfterCreate = await dbHelper.getAccountBalance(accountId)
      expect(balanceAfterCreate).toBe(3000)

      page.on('dialog', async (dialog) => {
        await dialog.accept()
      })

      await historyPage.navigateTo('history')
      await historyPage.filterByType('income')
      await historyPage.clickTransactionByComment('To be deleted')
      await page.waitForTimeout(300)

      await page
        .locator('button')
        .filter({ has: page.locator('.lucide-trash-2') })
        .click()
      await page.waitForTimeout(500)

      const finalBalance = await dbHelper.getAccountBalance(accountId)
      expect(finalBalance).toBe(1000)

      const txCount = await dbHelper.getTransactionCount()
      expect(txCount).toBe(0)

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteTransactions = syncHelper.getMockRemoteData('transactions')
        expect(remoteTransactions.length).toBe(0)
      }
    })

    test('should delete expense transaction and reverse balance', async ({
      page,
      historyPage,
      dbHelper,
      syncHelper,
      seedAccount,
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
        comment: 'Expense to delete',
      })
      await dbHelper.updateAccountBalance(accountId, 925)
      await dbHelper.refreshStoreData()

      const balanceAfterCreate = await dbHelper.getAccountBalance(accountId)
      expect(balanceAfterCreate).toBe(925)

      page.on('dialog', async (dialog) => {
        await dialog.accept()
      })

      await historyPage.navigateTo('history')
      await historyPage.filterByType('expense')
      await historyPage.clickTransactionByComment('Expense to delete')
      await page.waitForTimeout(300)

      await page
        .locator('button')
        .filter({ has: page.locator('.lucide-trash-2') })
        .click()
      await page.waitForTimeout(500)

      const finalBalance = await dbHelper.getAccountBalance(accountId)
      expect(finalBalance).toBe(1000)

      if (mode !== 'sync-disabled') {
        await syncHelper.waitForSyncToComplete()
        const remoteTransactions = syncHelper.getMockRemoteData('transactions')
        expect(remoteTransactions.length).toBe(0)
      }
    })

    test('should delete transfer and reverse both account balances', async ({
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

      await historyPage.navigateTo('history')
      await historyPage.filterByType('transfers')
      await historyPage.clickTransactionByComment('Transfer to delete')
      await page.waitForTimeout(300)

      await page
        .locator('button')
        .filter({ has: page.locator('.lucide-trash-2') })
        .click()
      await page.waitForTimeout(500)

      const usdFinal = await dbHelper.getAccountBalance(usdAccountId)
      const eurFinal = await dbHelper.getAccountBalance(eurAccountId)
      expect(usdFinal).toBe(1000)
      expect(eurFinal).toBe(2000)

      if (mode !== 'sync-disabled') {
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

      const queueCount = await syncHelper.getSyncQueueCount()
      expect(queueCount).toBeGreaterThan(0)

      await syncHelper.goOnline()
      await syncHelper.waitForSyncToComplete()

      const finalQueueCount = await syncHelper.getSyncQueueCount()
      expect(finalQueueCount).toBe(0)

      const remoteTransactions = syncHelper.getMockRemoteData('transactions')
      expect(remoteTransactions[0].amount).toBe(750)
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
      if (mode !== 'sync-disabled') {
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

      // Verify transaction was deleted locally
      const txCountAfterDelete = await dbHelper.getTransactionCount()
      expect(txCountAfterDelete).toBe(0)

      // Verify account balance was reversed
      const finalBalance = await dbHelper.getAccountBalance(accountId)
      expect(finalBalance).toBe(1000)
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
      if (mode !== 'sync-disabled') {
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
      if (mode !== 'sync-disabled') {
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

    test('should sync temp ID transaction when coming online, then delete', async ({
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

      // Create a transaction with a temp ID
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
            amount: 100,
            currency: 'USD',
            accountId,
            categoryId: catId,
            comment: 'Sync then delete',
          },
          tempId,
        }
      )

      await dbHelper.updateAccountBalance(accountId, 900)
      await dbHelper.refreshStoreData()

      // Go online - this will sync the created transaction
      await syncHelper.goOnline()
      await syncHelper.waitForSyncToComplete()

      // Verify the transaction was synced (it should have a real ID now)
      const remoteTransactionsBeforeDelete = syncHelper.getMockRemoteData('transactions')
      expect(remoteTransactionsBeforeDelete.length).toBe(1)

      // Now delete the transaction while online
      await historyPage.navigateTo('history')

      page.on('dialog', async (dialog) => {
        await dialog.accept()
      })

      await historyPage.clickTransactionByComment('Sync then delete')
      await page.waitForTimeout(300)

      await page
        .locator('button')
        .filter({ has: page.locator('.lucide-trash-2') })
        .click()
      await page.waitForTimeout(500)

      // Verify transaction was deleted locally
      const txCount = await dbHelper.getTransactionCount()
      expect(txCount).toBe(0)

      // Wait for sync to complete the delete
      await syncHelper.waitForSyncToComplete()

      // Verify remote was updated
      const remoteTransactions = syncHelper.getMockRemoteData('transactions')
      expect(remoteTransactions.length).toBe(0)
    })
  })
}
