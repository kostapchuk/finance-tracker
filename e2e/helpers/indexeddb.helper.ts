import type { Page } from '@playwright/test';
import type {
  TestAccount,
  TestCategory,
  TestIncomeSource,
  TestLoan,
  TestTransaction,
} from '../fixtures/test-data';

const DB_NAME = 'FinanceTrackerDB';

export class IndexedDBHelper {
  constructor(private page: Page) {}

  async clearDatabase(): Promise<void> {
    await this.page.evaluate(async (dbName) => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => {
          const db = request.result;
          const storeNames = Array.from(db.objectStoreNames);
          if (storeNames.length === 0) {
            db.close();
            resolve();
            return;
          }
          const tx = db.transaction(storeNames, 'readwrite');
          storeNames.forEach((store) => {
            tx.objectStore(store).clear();
          });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    }, DB_NAME);
  }

  async seedAccount(account: TestAccount): Promise<number> {
    return this.page.evaluate(async ({ dbName, acc }) => {
      return new Promise<number>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('accounts', 'readwrite');
          const store = tx.objectStore('accounts');
          const now = new Date();
          const addRequest = store.add({
            ...acc,
            createdAt: now,
            updatedAt: now,
          });
          addRequest.onsuccess = () => {
            db.close();
            resolve(addRequest.result as number);
          };
          addRequest.onerror = () => {
            db.close();
            reject(addRequest.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    }, { dbName: DB_NAME, acc: account });
  }

  async seedCategory(category: TestCategory): Promise<number> {
    return this.page.evaluate(async ({ dbName, cat }) => {
      return new Promise<number>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('categories', 'readwrite');
          const store = tx.objectStore('categories');
          const now = new Date();
          const addRequest = store.add({
            ...cat,
            createdAt: now,
            updatedAt: now,
          });
          addRequest.onsuccess = () => {
            db.close();
            resolve(addRequest.result as number);
          };
          addRequest.onerror = () => {
            db.close();
            reject(addRequest.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    }, { dbName: DB_NAME, cat: category });
  }

  async seedIncomeSource(incomeSource: TestIncomeSource): Promise<number> {
    return this.page.evaluate(async ({ dbName, src }) => {
      return new Promise<number>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('incomeSources', 'readwrite');
          const store = tx.objectStore('incomeSources');
          const now = new Date();
          const addRequest = store.add({
            ...src,
            createdAt: now,
            updatedAt: now,
          });
          addRequest.onsuccess = () => {
            db.close();
            resolve(addRequest.result as number);
          };
          addRequest.onerror = () => {
            db.close();
            reject(addRequest.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    }, { dbName: DB_NAME, src: incomeSource });
  }

  async seedLoan(loan: TestLoan): Promise<number> {
    const loanData = {
      ...loan,
      dueDate: loan.dueDate?.toISOString(),
    };
    return this.page.evaluate(async ({ dbName, l }) => {
      return new Promise<number>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('loans', 'readwrite');
          const store = tx.objectStore('loans');
          const now = new Date();
          const addRequest = store.add({
            ...l,
            dueDate: l.dueDate ? new Date(l.dueDate) : undefined,
            createdAt: now,
            updatedAt: now,
          });
          addRequest.onsuccess = () => {
            db.close();
            resolve(addRequest.result as number);
          };
          addRequest.onerror = () => {
            db.close();
            reject(addRequest.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    }, { dbName: DB_NAME, l: loanData });
  }

  async seedTransaction(transaction: TestTransaction): Promise<number> {
    const txData = {
      ...transaction,
      date: transaction.date?.toISOString() || new Date().toISOString(),
    };
    return this.page.evaluate(async ({ dbName, tx }) => {
      return new Promise<number>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => {
          const db = request.result;
          const dbTx = db.transaction('transactions', 'readwrite');
          const store = dbTx.objectStore('transactions');
          const now = new Date();
          const addRequest = store.add({
            ...tx,
            date: new Date(tx.date),
            createdAt: now,
            updatedAt: now,
          });
          addRequest.onsuccess = () => {
            db.close();
            resolve(addRequest.result as number);
          };
          addRequest.onerror = () => {
            db.close();
            reject(addRequest.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    }, { dbName: DB_NAME, tx: txData });
  }

  async updateAccountBalance(accountId: number, newBalance: number): Promise<void> {
    await this.page.evaluate(async ({ dbName, id, balance }) => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('accounts', 'readwrite');
          const store = tx.objectStore('accounts');
          const getRequest = store.get(id);
          getRequest.onsuccess = () => {
            const account = getRequest.result;
            if (account) {
              account.balance = balance;
              account.updatedAt = new Date();
              const putRequest = store.put(account);
              putRequest.onsuccess = () => {
                db.close();
                resolve();
              };
              putRequest.onerror = () => {
                db.close();
                reject(putRequest.error);
              };
            } else {
              db.close();
              resolve();
            }
          };
          getRequest.onerror = () => {
            db.close();
            reject(getRequest.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    }, { dbName: DB_NAME, id: accountId, balance: newBalance });
  }

  async getAccountBalance(accountId: number): Promise<number> {
    return this.page.evaluate(async ({ dbName, id }) => {
      return new Promise<number>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('accounts', 'readonly');
          const store = tx.objectStore('accounts');
          const getRequest = store.get(id);
          getRequest.onsuccess = () => {
            db.close();
            resolve(getRequest.result?.balance ?? 0);
          };
          getRequest.onerror = () => {
            db.close();
            reject(getRequest.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    }, { dbName: DB_NAME, id: accountId });
  }

  async getLoanStatus(
    loanId: number
  ): Promise<{ paidAmount: number; status: string } | null> {
    return this.page.evaluate(async ({ dbName, id }) => {
      return new Promise<{ paidAmount: number; status: string } | null>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('loans', 'readonly');
          const store = tx.objectStore('loans');
          const getRequest = store.get(id);
          getRequest.onsuccess = () => {
            db.close();
            const loan = getRequest.result;
            if (!loan) {
              resolve(null);
            } else {
              resolve({ paidAmount: loan.paidAmount, status: loan.status });
            }
          };
          getRequest.onerror = () => {
            db.close();
            reject(getRequest.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    }, { dbName: DB_NAME, id: loanId });
  }

  async getTransactionCount(): Promise<number> {
    return this.page.evaluate(async (dbName) => {
      return new Promise<number>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('transactions', 'readonly');
          const store = tx.objectStore('transactions');
          const countRequest = store.count();
          countRequest.onsuccess = () => {
            db.close();
            resolve(countRequest.result);
          };
          countRequest.onerror = () => {
            db.close();
            reject(countRequest.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    }, DB_NAME);
  }

  async setMainCurrency(currency: string): Promise<void> {
    await this.page.evaluate(async ({ dbName, curr }) => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('settings', 'readwrite');
          const store = tx.objectStore('settings');
          // First check if settings already exist
          const getAllRequest = store.getAll();
          getAllRequest.onsuccess = () => {
            const existing = getAllRequest.result[0];
            const now = new Date();
            const settingsData = {
              ...(existing || {}),
              defaultCurrency: curr,
              createdAt: existing?.createdAt || now,
              updatedAt: now,
            };
            // Use put with id if exists, or add if new
            const saveRequest = existing?.id
              ? store.put({ ...settingsData, id: existing.id })
              : store.add(settingsData);
            saveRequest.onsuccess = () => {
              db.close();
              resolve();
            };
            saveRequest.onerror = () => {
              db.close();
              reject(saveRequest.error);
            };
          };
          getAllRequest.onerror = () => {
            db.close();
            reject(getAllRequest.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    }, { dbName: DB_NAME, curr: currency });
  }

  async setOnboardingComplete(): Promise<void> {
    // Onboarding state is stored in localStorage, not IndexedDB
    await this.page.evaluate(() => {
      localStorage.setItem('finance-tracker-onboarding-completed', 'true');
    });
  }

  async refreshStoreData(): Promise<void> {
    // Trigger a page reload to refresh Zustand store from IndexedDB
    // This is simpler and more reliable than trying to call store methods
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');
  }

  async seedTransactions(count: number, accountId: number, categoryId: number): Promise<void> {
    await this.page.evaluate(async ({ dbName, count, accountId, categoryId }) => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('transactions', 'readwrite');
          const store = tx.objectStore('transactions');
          const now = new Date();
          let completed = 0;

          for (let i = 0; i < count; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i); // Spread across days
            const addRequest = store.add({
              type: 'expense',
              amount: 10 + i,
              currency: 'USD',
              date,
              accountId,
              categoryId,
              comment: `Transaction ${i + 1}`,
              createdAt: now,
              updatedAt: now,
            });
            addRequest.onsuccess = () => {
              completed++;
              if (completed === count) {
                db.close();
                resolve();
              }
            };
            addRequest.onerror = () => {
              db.close();
              reject(addRequest.error);
            };
          }
        };
        request.onerror = () => reject(request.error);
      });
    }, { dbName: DB_NAME, count, accountId, categoryId });
  }
}
