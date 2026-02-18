import Dexie, { type EntityTable } from 'dexie'

import type {
  Account,
  IncomeSource,
  Category,
  Transaction,
  Loan,
  AppSettings,
  CustomCurrency,
  SyncQueueItem,
  ReportCache,
} from './types'

const CACHE_LIMIT = 50

const db = new Dexie('FinanceTrackerCache') as Dexie & {
  accounts: EntityTable<Account, 'id'>
  incomeSources: EntityTable<IncomeSource, 'id'>
  categories: EntityTable<Category, 'id'>
  transactions: EntityTable<Transaction, 'id'>
  loans: EntityTable<Loan, 'id'>
  settings: EntityTable<AppSettings, 'id'>
  customCurrencies: EntityTable<CustomCurrency, 'id'>
  syncQueue: EntityTable<SyncQueueItem, 'id'>
  reportCache: EntityTable<ReportCache, 'id'>
}

db.version(4).stores({
  accounts: 'id, userId, name, updatedAt',
  incomeSources: 'id, userId, name, updatedAt',
  categories: 'id, userId, name, updatedAt',
  transactions: 'id, userId, date, accountId, categoryId, loanId, updatedAt',
  loans: 'id, userId, status, createdAt, updatedAt',
  settings: 'id, userId',
  customCurrencies: 'id, userId, code',
  syncQueue: '++id, operation, entity, recordId, createdAt',
  reportCache: 'id, &periodKey, updatedAt',
})

export const localCache = {
  accounts: {
    async getAll(): Promise<Account[]> {
      const items = await db.accounts.toArray()
      return items.sort(
        (a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || a.name.localeCompare(b.name)
      )
    },

    async getById(id: number | string): Promise<Account | undefined> {
      // Dexie supports both number and string keys, but we need to pass the actual value
      // without type coercion that could break temp IDs
      return db.accounts
        .where('id')
        .equals(id as never)
        .first()
    },

    async put(account: Account): Promise<void> {
      await db.accounts.put(account)
    },

    async putAll(accounts: Account[]): Promise<void> {
      await db.accounts.bulkPut(accounts)
    },

    async delete(id: number | string): Promise<void> {
      await db.accounts
        .where('id')
        .equals(id as never)
        .delete()
    },

    async bulkUpdateBalance(deltas: { id: number; delta: number }[]): Promise<void> {
      if (deltas.length === 0) return

      const ids = deltas.map((d) => d.id)
      const accounts = await db.accounts.where('id').anyOf(ids).toArray()
      const accountMap = new Map(accounts.map((a) => [a.id, a]))

      const updates: Account[] = []
      for (const { id, delta } of deltas) {
        const account = accountMap.get(id)
        if (account) {
          updates.push({
            ...account,
            balance: account.balance + delta,
            updatedAt: new Date(),
          })
        }
      }

      if (updates.length > 0) {
        await db.accounts.bulkPut(updates)
      }
    },

    async clear(): Promise<void> {
      await db.accounts.clear()
    },

    async count(): Promise<number> {
      return db.accounts.count()
    },
  },

  incomeSources: {
    async getAll(): Promise<IncomeSource[]> {
      const items = await db.incomeSources.toArray()
      return items.sort(
        (a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || a.name.localeCompare(b.name)
      )
    },

    async getById(id: number): Promise<IncomeSource | undefined> {
      return db.incomeSources.get(id)
    },

    async put(source: IncomeSource): Promise<void> {
      await db.incomeSources.put(source)
    },

    async putAll(sources: IncomeSource[]): Promise<void> {
      await db.incomeSources.bulkPut(sources)
    },

    async delete(id: number): Promise<void> {
      await db.incomeSources.delete(id)
    },

    async clear(): Promise<void> {
      await db.incomeSources.clear()
    },

    async count(): Promise<number> {
      return db.incomeSources.count()
    },
  },

  categories: {
    async getAll(): Promise<Category[]> {
      const items = await db.categories.toArray()
      return items.sort(
        (a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || a.name.localeCompare(b.name)
      )
    },

    async getById(id: number): Promise<Category | undefined> {
      return db.categories.get(id)
    },

    async put(category: Category): Promise<void> {
      await db.categories.put(category)
    },

    async putAll(categories: Category[]): Promise<void> {
      await db.categories.bulkPut(categories)
    },

    async delete(id: number): Promise<void> {
      await db.categories.delete(id)
    },

    async clear(): Promise<void> {
      await db.categories.clear()
    },
  },

  transactions: {
    async getRecent(limit = CACHE_LIMIT): Promise<Transaction[]> {
      return db.transactions.orderBy('date').reverse().limit(limit).toArray()
    },

    async getAll(): Promise<Transaction[]> {
      return db.transactions.orderBy('date').reverse().toArray()
    },

    async getById(id: number | string): Promise<Transaction | undefined> {
      return db.transactions
        .where('id')
        .equals(id as never)
        .first()
    },

    async getByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
      return db.transactions.where('date').between(startDate, endDate).reverse().toArray()
    },

    async getByAccount(accountId: number | string): Promise<Transaction[]> {
      return db.transactions
        .where('accountId')
        .equals(accountId as never)
        .reverse()
        .toArray()
    },

    async getByCategory(categoryId: number | string): Promise<Transaction[]> {
      return db.transactions
        .where('categoryId')
        .equals(categoryId as never)
        .reverse()
        .toArray()
    },

    async getByLoan(loanId: number | string): Promise<Transaction[]> {
      return db.transactions
        .where('loanId')
        .equals(loanId as never)
        .reverse()
        .toArray()
    },

    async put(transaction: Transaction): Promise<void> {
      // Normalize date fields to Date objects for consistent indexing
      const normalizedTransaction = {
        ...transaction,
        date: transaction.date instanceof Date ? transaction.date : new Date(transaction.date),
        createdAt:
          transaction.createdAt instanceof Date
            ? transaction.createdAt
            : new Date(transaction.createdAt),
        updatedAt:
          transaction.updatedAt instanceof Date
            ? transaction.updatedAt
            : new Date(transaction.updatedAt),
      }
      await db.transactions.put(normalizedTransaction)
    },

    async putAll(transactions: Transaction[]): Promise<void> {
      // Normalize date fields to Date objects for consistent indexing
      const normalizedTransactions = transactions.map((t) => ({
        ...t,
        date: t.date instanceof Date ? t.date : new Date(t.date),
        createdAt: t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt),
        updatedAt: t.updatedAt instanceof Date ? t.updatedAt : new Date(t.updatedAt),
      }))
      await db.transactions.bulkPut(normalizedTransactions)
    },

    async delete(id: number | string): Promise<void> {
      await db.transactions
        .where('id')
        .equals(id as never)
        .delete()
    },

    async clear(): Promise<void> {
      await db.transactions.clear()
    },

    async trimToLimit(): Promise<void> {
      const count = await db.transactions.count()
      if (count <= CACHE_LIMIT) return

      const itemsToKeep = await db.transactions
        .orderBy('date')
        .reverse()
        .limit(CACHE_LIMIT)
        .toArray()

      const idsToKeep = new Set(itemsToKeep.map((t) => t.id))
      await db.transactions.filter((t) => !idsToKeep.has(t.id)).delete()
    },

    async count(): Promise<number> {
      return db.transactions.count()
    },
  },

  loans: {
    async getAll(): Promise<Loan[]> {
      return db.loans.orderBy('createdAt').reverse().toArray()
    },

    async getById(id: number | string): Promise<Loan | undefined> {
      return db.loans
        .where('id')
        .equals(id as never)
        .first()
    },

    async getActive(): Promise<Loan[]> {
      return db.loans.where('status').anyOf(['active', 'partially_paid']).toArray()
    },

    async put(loan: Loan): Promise<void> {
      await db.loans.put(loan)
    },

    async putAll(loans: Loan[]): Promise<void> {
      await db.loans.bulkPut(loans)
    },

    async delete(id: number | string): Promise<void> {
      await db.loans
        .where('id')
        .equals(id as never)
        .delete()
    },

    async clear(): Promise<void> {
      await db.loans.clear()
    },
  },

  settings: {
    async get(): Promise<AppSettings | undefined> {
      const settings = await db.settings.toArray()
      return settings[0]
    },

    async put(settings: AppSettings): Promise<void> {
      await db.settings.put(settings)
    },

    async clear(): Promise<void> {
      await db.settings.clear()
    },
  },

  customCurrencies: {
    async getAll(): Promise<CustomCurrency[]> {
      return db.customCurrencies.orderBy('code').toArray()
    },

    async getById(id: number): Promise<CustomCurrency | undefined> {
      return db.customCurrencies.get(id)
    },

    async put(currency: CustomCurrency): Promise<void> {
      await db.customCurrencies.put(currency)
    },

    async putAll(currencies: CustomCurrency[]): Promise<void> {
      await db.customCurrencies.bulkPut(currencies)
    },

    async delete(id: number): Promise<void> {
      await db.customCurrencies.delete(id)
    },

    async clear(): Promise<void> {
      await db.customCurrencies.clear()
    },
  },

  syncQueue: {
    async add(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'attempts'>): Promise<number> {
      const id = await db.syncQueue.add({
        ...item,
        createdAt: new Date(),
        attempts: 0,
      })
      return id as number
    },

    async bulkAdd(items: Omit<SyncQueueItem, 'id' | 'createdAt' | 'attempts'>[]): Promise<void> {
      const fullItems = items.map((item) => ({
        ...item,
        createdAt: new Date(),
        attempts: 0,
      }))
      await db.syncQueue.bulkAdd(fullItems)
    },

    async getAll(): Promise<SyncQueueItem[]> {
      return db.syncQueue.orderBy('createdAt').toArray()
    },

    async getCount(): Promise<number> {
      return db.syncQueue.count()
    },

    async update(id: number, updates: Partial<SyncQueueItem>): Promise<void> {
      await db.syncQueue.update(id, updates)
    },

    async delete(id: number): Promise<void> {
      await db.syncQueue.delete(id)
    },

    async deleteByRecordId(recordId: number | string): Promise<void> {
      await db.syncQueue.where('recordId').equals(recordId).delete()
    },

    async clear(): Promise<void> {
      await db.syncQueue.clear()
    },
  },

  reportCache: {
    async getByPeriod(periodKey: string): Promise<ReportCache | undefined> {
      return db.reportCache.where('periodKey').equals(periodKey).first()
    },

    async put(cache: ReportCache): Promise<void> {
      await db.reportCache.put(cache)
    },

    async deleteByPeriod(periodKey: string): Promise<void> {
      const cache = await db.reportCache.where('periodKey').equals(periodKey).first()
      if (cache?.id) {
        await db.reportCache.delete(cache.id)
      }
    },

    async deleteByPeriods(periodKeys: string[]): Promise<void> {
      if (periodKeys.length === 0) return
      await db.reportCache.where('periodKey').anyOf(periodKeys).delete()
    },

    async invalidatePeriodsAfterDate(date: Date): Promise<void> {
      const allCache = await db.reportCache.toArray()
      for (const cache of allCache) {
        if (cache.lastTransactionDate && new Date(cache.lastTransactionDate) >= date && cache.id) {
          await db.reportCache.delete(cache.id)
        }
      }
    },

    async deleteExpired(): Promise<void> {
      const now = new Date()
      const allCache = await db.reportCache.toArray()
      for (const cache of allCache) {
        if (cache.expiresAt && new Date(cache.expiresAt) < now && cache.id) {
          await db.reportCache.delete(cache.id)
        }
      }
    },

    async clear(): Promise<void> {
      await db.reportCache.clear()
    },
  },

  async clearAll(): Promise<void> {
    await Promise.all([
      db.accounts.clear(),
      db.incomeSources.clear(),
      db.categories.clear(),
      db.transactions.clear(),
      db.loans.clear(),
      db.settings.clear(),
      db.customCurrencies.clear(),
    ])
  },
}

export { db }
