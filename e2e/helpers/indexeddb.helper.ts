import type { Page } from '@playwright/test';
import type {
  TestAccount,
  TestCategory,
  TestIncomeSource,
  TestLoan,
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
          const putRequest = store.put({ key: 'mainCurrency', value: curr });
          putRequest.onsuccess = () => {
            db.close();
            resolve();
          };
          putRequest.onerror = () => {
            db.close();
            reject(putRequest.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    }, { dbName: DB_NAME, curr: currency });
  }

  async setOnboardingComplete(): Promise<void> {
    await this.page.evaluate(async (dbName) => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('settings', 'readwrite');
          const store = tx.objectStore('settings');
          const putRequest = store.put({ key: 'onboardingComplete', value: true });
          putRequest.onsuccess = () => {
            db.close();
            resolve();
          };
          putRequest.onerror = () => {
            db.close();
            reject(putRequest.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    }, DB_NAME);
  }

  async refreshStoreData(): Promise<void> {
    // Trigger a page reload to refresh Zustand store from IndexedDB
    // This is simpler and more reliable than trying to call store methods
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');
  }
}
