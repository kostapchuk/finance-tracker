import { test, expect, type SyncMode } from '../fixtures/test-base'

const syncModes: SyncMode[] = ['sync-disabled']

for (const mode of syncModes) {
  test.describe(`[${mode}] Bulk Import`, () => {
    test('should handle bulk account balance updates', async ({
      page,
      setupCleanState,
      dbHelper,
      seedAccount,
    }) => {
      await setupCleanState(mode)

      const account1Id = await seedAccount({
        name: 'Account 1',
        type: 'cash',
        currency: 'USD',
        balance: 1000,
        color: '#22c55e',
        icon: 'wallet',
        sortOrder: 0,
      })

      const account2Id = await seedAccount({
        name: 'Account 2',
        type: 'bank',
        currency: 'USD',
        balance: 2000,
        color: '#3b82f6',
        icon: 'landmark',
        sortOrder: 1,
      })

      const result = await page.evaluate(
        async ({ deltas, account1Id, account2Id }) => {
          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('FinanceTrackerCache')
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
          })

          const tx = db.transaction('accounts', 'readwrite')
          const store = tx.objectStore('accounts')

          for (const delta of deltas) {
            const account = await new Promise<any>((resolve, reject) => {
              const getRequest = store.get(delta.id)
              getRequest.onsuccess = () => resolve(getRequest.result)
              getRequest.onerror = () => reject(getRequest.error)
            })
            if (account) {
              account.balance += delta.delta
              account.updatedAt = new Date()
              await new Promise<void>((resolve, reject) => {
                const putRequest = store.put(account)
                putRequest.onsuccess = () => resolve()
                putRequest.onerror = () => reject(putRequest.error)
              })
            }
          }

          await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => {
              db.close()
              resolve()
            }
            tx.onerror = () => {
              db.close()
              reject(tx.error)
            }
          })

          const db2 = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('FinanceTrackerCache')
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
          })

          const tx2 = db2.transaction('accounts', 'readonly')
          const store2 = tx2.objectStore('accounts')
          const accounts = await new Promise<any[]>((resolve, reject) => {
            const getAllRequest = store2.getAll()
            getAllRequest.onsuccess = () => {
              db2.close()
              resolve(getAllRequest.result)
            }
            getAllRequest.onerror = () => {
              db2.close()
              reject(getAllRequest.error)
            }
          })

          return accounts.reduce(
            (acc, a) => {
              acc[a.name] = a.balance
              return acc
            },
            {} as Record<string, number>
          )
        },
        {
          deltas: [
            { id: account1Id, delta: 500 },
            { id: account2Id, delta: -300 },
          ],
          account1Id,
          account2Id,
        }
      )

      expect(result['Account 1']).toBe(1500)
      expect(result['Account 2']).toBe(1700)
    })

    test('should seed multiple transactions and verify count', async ({
      setupCleanState,
      dbHelper,
      seedAccount,
      seedCategory,
    }) => {
      await setupCleanState(mode)

      const accountId = await seedAccount({
        name: 'Main',
        type: 'cash',
        currency: 'USD',
        balance: 1000,
        color: '#22c55e',
        icon: 'wallet',
        sortOrder: 0,
      })

      const categoryId = await seedCategory({
        name: 'Food',
        color: '#f97316',
        icon: 'utensils',
        categoryType: 'expense',
        sortOrder: 0,
      })

      await dbHelper.seedTransactions(100, accountId, categoryId)

      const transactionCount = await dbHelper.getTransactionCount()
      expect(transactionCount).toBe(100)
    })

    test('should handle large batch seeding without timeout', async ({
      setupCleanState,
      dbHelper,
      seedAccount,
      seedCategory,
    }) => {
      await setupCleanState(mode)

      const accountId = await seedAccount({
        name: 'Main',
        type: 'cash',
        currency: 'USD',
        balance: 5000,
        color: '#22c55e',
        icon: 'wallet',
        sortOrder: 0,
      })

      const categoryId = await seedCategory({
        name: 'Test',
        color: '#3b82f6',
        icon: 'shopping-bag',
        categoryType: 'expense',
        sortOrder: 0,
      })

      const startTime = Date.now()
      await dbHelper.seedTransactions(200, accountId, categoryId)
      const duration = Date.now() - startTime

      console.log(`Seeding 200 transactions took ${duration}ms`)

      const transactionCount = await dbHelper.getTransactionCount()
      expect(transactionCount).toBe(200)
    })

    test('should import CSV via wizard with pre-existing accounts and categories', async ({
      page,
      setupCleanState,
      dbHelper,
      settingsPage,
      seedAccount,
      seedCategory,
      seedIncomeSource,
    }) => {
      await setupCleanState(mode)

      const cashAccountId = await seedAccount({
        name: 'Cash',
        type: 'cash',
        currency: 'USD',
        balance: 1000,
        color: '#22c55e',
        icon: 'wallet',
        sortOrder: 0,
      })

      await seedCategory({
        name: 'Food',
        color: '#f97316',
        icon: 'utensils',
        categoryType: 'expense',
        sortOrder: 0,
      })

      await seedIncomeSource({
        name: 'Salary',
        currency: 'USD',
        color: '#3b82f6',
        icon: 'briefcase',
        sortOrder: 0,
      })

      await settingsPage.navigateTo('settings')
      await page.waitForTimeout(500)

      const initialBalance = await dbHelper.getAccountBalance(cashAccountId)
      expect(initialBalance).toBe(1000)

      const initialCount = await dbHelper.getTransactionCount()
      expect(initialCount).toBe(0)

      const csvContent = [
        'Operation type,Date,Account,Category,Subcategory,Amount,Currency,Amount_dop,Currency_dop,Comment',
        'Income,20250115,Cash,Salary,,100,USD,,,Test income',
        'Expense,20250120,Cash,Food,,25,USD,,,Test expense',
      ].join('\n')

      await page.evaluate(() => {
        localStorage.removeItem('finance-tracker-import-state')
      })

      const importWizardButton = page.locator('button').filter({ hasText: /BudgetOk|БюджетОк/i })
      await importWizardButton.click()
      await page.waitForTimeout(500)

      const fileInput = page.locator('input[type="file"][accept=".csv"]')
      await fileInput.setInputFiles({
        name: 'test-import.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent, 'utf-8'),
      })

      await page.waitForTimeout(500)

      const nextButton = page.locator('button').filter({ hasText: /next|далее/i })
      for (let i = 0; i < 4; i++) {
        await nextButton.click()
        await page.waitForTimeout(300)
      }

      const importButton = page
        .locator('button')
        .filter({ hasText: /import|импорт/i })
        .last()
      await importButton.click()

      await page.waitForTimeout(2000)

      const successMessage = page.locator('text=/importSuccess|successfully|imported/i')
      await successMessage.waitFor({ state: 'visible', timeout: 30000 })

      const doneButton = page.getByRole('button', { name: /^done$/i })
      if ((await doneButton.count()) > 0) {
        await doneButton.click()
        await page.waitForTimeout(300)
      }

      const finalCount = await dbHelper.getTransactionCount()
      expect(finalCount).toBe(2)

      const finalBalance = await dbHelper.getAccountBalance(cashAccountId)
      expect(finalBalance).toBe(1000 + 100 - 25)
    })
  })
}
