import { test, expect, type SyncMode } from '../fixtures/test-base'

const syncModes: SyncMode[] = ['sync-disabled', 'sync-enabled-online', 'sync-enabled-offline']

for (const mode of syncModes) {
  test(`[${mode}] minimal IndexedDB test`, async ({ page, setupCleanState, dbHelper }) => {
    await setupCleanState(mode)

    await dbHelper.ensureDatabase()

    await page.waitForTimeout(500)

    const addResult = await page.evaluate(() => {
      return new Promise<number>((resolve, reject) => {
        const request = indexedDB.open('FinanceTrackerCache')
        request.onsuccess = () => {
          const db = request.result

          if (!db.objectStoreNames.contains('accounts')) {
            db.close()
            reject(new Error('accounts store does not exist'))
            return
          }

          const tx = db.transaction('accounts', 'readwrite')
          const store = tx.objectStore('accounts')
          const addRequest = store.add({
            id: Date.now(),
            name: 'Test Account',
            type: 'cash',
            currency: 'USD',
            balance: 100,
            color: '#22c55e',
            icon: 'wallet',
            sortOrder: 0,
            userId: 'test-user',
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          addRequest.onsuccess = () => {
            db.close()
            resolve(addRequest.result as number)
          }
          addRequest.onerror = () => {
            db.close()
            reject(addRequest.error)
          }
        }
        request.onerror = () => {
          reject(request.error)
        }
      })
    })
    expect(typeof addResult).toBe('number')
  })
}
