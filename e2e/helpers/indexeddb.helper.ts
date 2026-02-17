import type { Page } from '@playwright/test'
import type {
  TestAccount,
  TestCategory,
  TestIncomeSource,
  TestLoan,
  TestTransaction,
} from '../fixtures/test-data'

const DB_NAME = 'FinanceTrackerCache'

export class IndexedDBHelper {
  constructor(private page: Page) {}

  private async ensureDatabaseInitialized(): Promise<void> {
    await this.page.evaluate(async () => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('FinanceTrackerCache')
        request.onsuccess = () => {
          request.result.close()
          resolve()
        }
        request.onerror = () => reject(request.error)
      })
    })
  }

  async clearAllDatabases(): Promise<void> {
    await this.page.evaluate(async () => {
      const dbNames = ['FinanceTrackerDB', 'FinanceTrackerCache']
      for (const dbName of dbNames) {
        await new Promise<void>((resolve, reject) => {
          const request = indexedDB.open(dbName)
          request.onsuccess = () => {
            const db = request.result
            const storeNames = Array.from(db.objectStoreNames)
            if (storeNames.length === 0) {
              db.close()
              resolve()
              return
            }
            const tx = db.transaction(storeNames, 'readwrite')
            storeNames.forEach((store) => {
              tx.objectStore(store).clear()
            })
            tx.oncomplete = () => {
              db.close()
              resolve()
            }
            tx.onerror = () => {
              db.close()
              reject(tx.error)
            }
          }
          request.onerror = () => resolve()
        })
      }
    })
  }

  async clearDatabase(): Promise<void> {
    await this.page.evaluate(async () => {
      const dbNames = ['FinanceTrackerCache', 'FinanceTrackerDB']
      for (const dbName of dbNames) {
        await new Promise<void>((resolve) => {
          const request = indexedDB.open(dbName)
          request.onsuccess = () => {
            const db = request.result
            const storeNames = Array.from(db.objectStoreNames)
            if (storeNames.length === 0) {
              db.close()
              resolve()
              return
            }
            const tx = db.transaction(storeNames, 'readwrite')
            storeNames.forEach((store) => {
              tx.objectStore(store).clear()
            })
            tx.oncomplete = () => {
              db.close()
              resolve()
            }
            tx.onerror = () => {
              db.close()
              resolve()
            }
          }
          request.onerror = () => resolve()
          request.onblocked = () => resolve()
        })
      }
    })
  }

  async getUserId(): Promise<string> {
    return this.page.evaluate(() => {
      let userId = localStorage.getItem('finance-tracker-user-id')
      if (!userId) {
        userId = crypto.randomUUID()
        localStorage.setItem('finance-tracker-user-id', userId)
      }
      return userId
    })
  }

  async ensureDatabase(): Promise<void> {
    await this.page.evaluate(async (dbName) => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(dbName)
        request.onsuccess = () => {
          request.result.close()
          resolve()
        }
        request.onerror = () => reject(request.error)
      })
    }, DB_NAME)
  }

  async seedAccount(account: TestAccount): Promise<number> {
    await this.ensureDatabaseInitialized()
    const userId = await this.getUserId()

    const result = await this.page.evaluate(
      async ({ accountData, userId }) => {
        const request = indexedDB.open('FinanceTrackerCache')

        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
          request.onblocked = () => {
            setTimeout(() => {
              const retry = indexedDB.open('FinanceTrackerCache')
              retry.onsuccess = () => resolve(retry.result)
              retry.onerror = () => reject(retry.error)
            }, 100)
          }
        })

        if (!db.objectStoreNames.contains('accounts')) {
          db.close()
          throw new Error('accounts store does not exist')
        }

        const tx = db.transaction('accounts', 'readwrite')
        const store = tx.objectStore('accounts')
        const now = new Date()
        const id = Date.now()

        const resultId = await new Promise<number>((resolve, reject) => {
          const addRequest = store.add({
            id,
            ...accountData,
            userId,
            createdAt: now,
            updatedAt: now,
          })
          addRequest.onsuccess = () => {
            db.close()
            resolve(id)
          }
          addRequest.onerror = () => {
            db.close()
            reject(addRequest.error)
          }
        })

        return resultId
      },
      { accountData: account, userId }
    )

    return result
  }

  async seedCategory(category: TestCategory): Promise<number> {
    await this.ensureDatabaseInitialized()
    const userId = await this.getUserId()
    const id = Date.now()

    await this.page.evaluate(
      async ({ categoryData, userId, id }) => {
        const request = indexedDB.open('FinanceTrackerCache')
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })
        const tx = db.transaction('categories', 'readwrite')
        const store = tx.objectStore('categories')
        const now = new Date()
        await new Promise<void>((resolve, reject) => {
          const addRequest = store.add({
            id,
            ...categoryData,
            userId,
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
      { categoryData: category, userId, id }
    )

    return id
  }

  async seedIncomeSource(incomeSource: TestIncomeSource): Promise<number> {
    await this.ensureDatabaseInitialized()
    const userId = await this.getUserId()
    const id = Date.now()

    await this.page.evaluate(
      async ({ incomeSourceData, userId, id }) => {
        const request = indexedDB.open('FinanceTrackerCache')
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })
        const tx = db.transaction('incomeSources', 'readwrite')
        const store = tx.objectStore('incomeSources')
        const now = new Date()
        await new Promise<void>((resolve, reject) => {
          const addRequest = store.add({
            id,
            ...incomeSourceData,
            userId,
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
      { incomeSourceData: incomeSource, userId, id }
    )

    return id
  }

  async seedLoan(loan: TestLoan): Promise<number> {
    await this.ensureDatabaseInitialized()
    const userId = await this.getUserId()
    const id = Date.now()

    await this.page.evaluate(
      async ({ loanData, userId, id }) => {
        const request = indexedDB.open('FinanceTrackerCache')
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })
        const tx = db.transaction('loans', 'readwrite')
        const store = tx.objectStore('loans')
        const now = new Date()
        await new Promise<void>((resolve, reject) => {
          const addRequest = store.add({
            id,
            ...loanData,
            dueDate: loanData.dueDate ? new Date(loanData.dueDate) : undefined,
            userId,
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
      { loanData: loan, userId, id }
    )

    return id
  }

  async seedTransaction(transaction: TestTransaction): Promise<number> {
    await this.ensureDatabaseInitialized()
    const userId = await this.getUserId()
    const id = Date.now()

    await this.page.evaluate(
      async ({ transactionData, userId, id }) => {
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
            id,
            ...transactionData,
            date: transactionData.date ? new Date(transactionData.date) : new Date(),
            userId,
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
      { transactionData: transaction, userId, id }
    )

    return id
  }

  async updateAccountBalance(accountId: number, newBalance: number): Promise<void> {
    const data = { dbName: DB_NAME, id: accountId, balance: newBalance }

    await this.page.evaluate((data: { dbName: string; id: number; balance: number }) => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(data.dbName)
        request.onsuccess = () => {
          const db = request.result
          const tx = db.transaction('accounts', 'readwrite')
          const store = tx.objectStore('accounts')
          const getRequest = store.get(data.id)
          getRequest.onsuccess = () => {
            const account = getRequest.result
            if (account) {
              account.balance = data.balance
              account.updatedAt = new Date()
              const putRequest = store.put(account)
              putRequest.onsuccess = () => {
                db.close()
                resolve()
              }
              putRequest.onerror = () => {
                db.close()
                reject(putRequest.error)
              }
            } else {
              db.close()
              resolve()
            }
          }
          getRequest.onerror = () => {
            db.close()
            reject(getRequest.error)
          }
        }
        request.onerror = () => reject(request.error)
      })
    }, data)
  }

  async getAccountBalance(accountId: number): Promise<number> {
    const data = { dbName: DB_NAME, id: accountId }

    return this.page.evaluate((data: { dbName: string; id: number }) => {
      return new Promise<number>((resolve, reject) => {
        const request = indexedDB.open(data.dbName)
        request.onsuccess = () => {
          const db = request.result
          const tx = db.transaction('accounts', 'readonly')
          const store = tx.objectStore('accounts')
          const getRequest = store.get(data.id)
          getRequest.onsuccess = () => {
            db.close()
            resolve(getRequest.result?.balance ?? 0)
          }
          getRequest.onerror = () => {
            db.close()
            reject(getRequest.error)
          }
        }
        request.onerror = () => reject(request.error)
      })
    }, data)
  }

  async getLoanStatus(loanId: number): Promise<{ paidAmount: number; status: string } | null> {
    const data = { dbName: DB_NAME, id: loanId }

    return this.page.evaluate((data: { dbName: string; id: number }) => {
      return new Promise<{ paidAmount: number; status: string } | null>((resolve, reject) => {
        const request = indexedDB.open(data.dbName)
        request.onsuccess = () => {
          const db = request.result
          const tx = db.transaction('loans', 'readonly')
          const store = tx.objectStore('loans')
          const getRequest = store.get(data.id)
          getRequest.onsuccess = () => {
            db.close()
            const loan = getRequest.result
            if (!loan) {
              resolve(null)
            } else {
              resolve({ paidAmount: loan.paidAmount, status: loan.status })
            }
          }
          getRequest.onerror = () => {
            db.close()
            reject(getRequest.error)
          }
        }
        request.onerror = () => reject(request.error)
      })
    }, data)
  }

  async getTransactionCount(): Promise<number> {
    return this.page.evaluate((dbName: string) => {
      return new Promise<number>((resolve, reject) => {
        const request = indexedDB.open(dbName)
        request.onsuccess = () => {
          const db = request.result
          const tx = db.transaction('transactions', 'readonly')
          const store = tx.objectStore('transactions')
          const countRequest = store.count()
          countRequest.onsuccess = () => {
            db.close()
            resolve(countRequest.result)
          }
          countRequest.onerror = () => {
            db.close()
            reject(countRequest.error)
          }
        }
        request.onerror = () => reject(request.error)
      })
    }, DB_NAME)
  }

  async updateAccount(accountId: number, updates: Record<string, unknown>): Promise<void> {
    const data = { dbName: DB_NAME, id: accountId, updates }

    await this.page.evaluate(
      (data: { dbName: string; id: number; updates: Record<string, unknown> }) => {
        return new Promise<void>((resolve, reject) => {
          const request = indexedDB.open(data.dbName)
          request.onsuccess = () => {
            const db = request.result
            const tx = db.transaction('accounts', 'readwrite')
            const store = tx.objectStore('accounts')
            const getRequest = store.get(data.id)
            getRequest.onsuccess = () => {
              const account = getRequest.result
              if (account) {
                Object.assign(account, data.updates, { updatedAt: new Date() })
                const putRequest = store.put(account)
                putRequest.onsuccess = () => {
                  db.close()
                  resolve()
                }
                putRequest.onerror = () => {
                  db.close()
                  reject(putRequest.error)
                }
              } else {
                db.close()
                resolve()
              }
            }
            getRequest.onerror = () => {
              db.close()
              reject(getRequest.error)
            }
          }
          request.onerror = () => reject(request.error)
        })
      },
      data
    )
  }

  async updateCategory(categoryId: number, updates: Record<string, unknown>): Promise<void> {
    const data = { dbName: DB_NAME, id: categoryId, updates }

    await this.page.evaluate(
      (data: { dbName: string; id: number; updates: Record<string, unknown> }) => {
        return new Promise<void>((resolve, reject) => {
          const request = indexedDB.open(data.dbName)
          request.onsuccess = () => {
            const db = request.result
            const tx = db.transaction('categories', 'readwrite')
            const store = tx.objectStore('categories')
            const getRequest = store.get(data.id)
            getRequest.onsuccess = () => {
              const category = getRequest.result
              if (category) {
                Object.assign(category, data.updates, { updatedAt: new Date() })
                const putRequest = store.put(category)
                putRequest.onsuccess = () => {
                  db.close()
                  resolve()
                }
                putRequest.onerror = () => {
                  db.close()
                  reject(putRequest.error)
                }
              } else {
                db.close()
                resolve()
              }
            }
            getRequest.onerror = () => {
              db.close()
              reject(getRequest.error)
            }
          }
          request.onerror = () => reject(request.error)
        })
      },
      data
    )
  }

  async updateIncomeSource(
    incomeSourceId: number,
    updates: Record<string, unknown>
  ): Promise<void> {
    const data = { dbName: DB_NAME, id: incomeSourceId, updates }

    await this.page.evaluate(
      (data: { dbName: string; id: number; updates: Record<string, unknown> }) => {
        return new Promise<void>((resolve, reject) => {
          const request = indexedDB.open(data.dbName)
          request.onsuccess = () => {
            const db = request.result
            const tx = db.transaction('incomeSources', 'readwrite')
            const store = tx.objectStore('incomeSources')
            const getRequest = store.get(data.id)
            getRequest.onsuccess = () => {
              const incomeSource = getRequest.result
              if (incomeSource) {
                Object.assign(incomeSource, data.updates, { updatedAt: new Date() })
                const putRequest = store.put(incomeSource)
                putRequest.onsuccess = () => {
                  db.close()
                  resolve()
                }
                putRequest.onerror = () => {
                  db.close()
                  reject(putRequest.error)
                }
              } else {
                db.close()
                resolve()
              }
            }
            getRequest.onerror = () => {
              db.close()
              reject(getRequest.error)
            }
          }
          request.onerror = () => reject(request.error)
        })
      },
      data
    )
  }

  async setMainCurrency(currency: string): Promise<void> {
    const userId = await this.getUserId()
    const data = { dbName: DB_NAME, currency, userId }

    await this.page.evaluate((data: { dbName: string; currency: string; userId: string }) => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(data.dbName)
        request.onsuccess = () => {
          const db = request.result

          if (!db.objectStoreNames.contains('settings')) {
            db.close()
            resolve()
            return
          }

          const tx = db.transaction('settings', 'readwrite')
          const store = tx.objectStore('settings')
          const getAllRequest = store.getAll()
          getAllRequest.onsuccess = () => {
            const existing = getAllRequest.result[0]
            const now = new Date()
            const settingsData = {
              id: existing?.id || 1,
              defaultCurrency: data.currency,
              userId: data.userId,
              createdAt: existing?.createdAt || now,
              updatedAt: now,
            }
            const saveRequest = store.put(settingsData)
            saveRequest.onsuccess = () => {
              db.close()
              resolve()
            }
            saveRequest.onerror = () => {
              db.close()
              reject(saveRequest.error)
            }
          }
          getAllRequest.onerror = () => {
            db.close()
            reject(getAllRequest.error)
          }
        }
        request.onerror = () => reject(request.error)
      })
    }, data)
  }

  async setOnboardingComplete(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.setItem('finance-tracker-onboarding-completed', 'true')
    })
  }

  async refreshStoreData(): Promise<void> {
    await this.page.reload()
    await this.page.waitForLoadState('networkidle')
    await this.page.waitForSelector('nav', { state: 'visible', timeout: 10000 })
    await this.page.waitForFunction(
      () => {
        const nav = document.querySelector('nav')
        return nav && nav.querySelectorAll('button').length >= 4
      },
      { timeout: 10000 }
    )
    await this.page.waitForTimeout(300)
  }

  async waitForAppReady(): Promise<void> {
    await this.page.waitForLoadState('networkidle')
    await this.page.waitForSelector('nav', { state: 'visible', timeout: 10000 })
    await this.page.waitForFunction(
      () => {
        const loadingState = document.querySelector('[data-loading="true"]')
        return !loadingState
      },
      { timeout: 10000 }
    )
    await this.page.waitForTimeout(500)
    await this.ensureDatabaseInitialized()
  }

  async waitForDataToLoad(): Promise<void> {
    await this.page.waitForTimeout(300)
    await this.page.waitForLoadState('domcontentloaded')
    await this.page.waitForTimeout(200)
  }

  async seedTransactions(count: number, accountId: number, categoryId: number): Promise<void> {
    await this.ensureDatabaseInitialized()
    const userId = await this.getUserId()

    await this.page.evaluate(
      async ({ count, accountId, categoryId, userId }) => {
        const request = indexedDB.open('FinanceTrackerCache')
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })
        const tx = db.transaction('transactions', 'readwrite')
        const store = tx.objectStore('transactions')
        const now = new Date()
        const baseId = Date.now()

        for (let i = 0; i < count; i++) {
          const date = new Date(now)
          date.setDate(date.getDate() - i)
          store.add({
            id: baseId + i,
            type: 'expense',
            amount: 10 + i,
            currency: 'USD',
            date,
            accountId,
            categoryId,
            userId,
            comment: `Transaction ${i + 1}`,
            createdAt: now,
            updatedAt: now,
          })
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
      },
      { count, accountId, categoryId, userId }
    )
  }
}
