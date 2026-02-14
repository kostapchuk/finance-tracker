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
}

db.version(2).stores({
  accounts: 'id, userId, name, updatedAt',
  incomeSources: 'id, userId, name, updatedAt',
  categories: 'id, userId, name, updatedAt',
  transactions: 'id, userId, date, accountId, categoryId, loanId, updatedAt',
  loans: 'id, userId, status, createdAt, updatedAt',
  settings: 'id, userId',
  customCurrencies: 'id, userId, code',
  syncQueue: '++id, operation, entity, recordId, createdAt',
})

export const localCache = {
  accounts: {
    async getAll(): Promise<Account[]> {
      const items = await db.accounts.toArray()
      return items.sort(
        (a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || a.name.localeCompare(b.name)
      )
    },

    async getById(id: number): Promise<Account | undefined> {
      return db.accounts.get(id)
    },

    async put(account: Account): Promise<void> {
      await db.accounts.put(account)
    },

    async putAll(accounts: Account[]): Promise<void> {
      await db.accounts.bulkPut(accounts)
    },

    async delete(id: number): Promise<void> {
      await db.accounts.delete(id)
    },

    async clear(): Promise<void> {
      await db.accounts.clear()
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

    async getById(id: number): Promise<Transaction | undefined> {
      return db.transactions.get(id)
    },

    async getByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
      return db.transactions.where('date').between(startDate, endDate).reverse().toArray()
    },

    async getByAccount(accountId: number): Promise<Transaction[]> {
      return db.transactions.where('accountId').equals(accountId).reverse().toArray()
    },

    async getByCategory(categoryId: number): Promise<Transaction[]> {
      return db.transactions.where('categoryId').equals(categoryId).reverse().toArray()
    },

    async getByLoan(loanId: number): Promise<Transaction[]> {
      return db.transactions.where('loanId').equals(loanId).reverse().toArray()
    },

    async put(transaction: Transaction): Promise<void> {
      await db.transactions.put(transaction)
    },

    async putAll(transactions: Transaction[]): Promise<void> {
      await db.transactions.bulkPut(transactions)
    },

    async delete(id: number): Promise<void> {
      await db.transactions.delete(id)
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
  },

  loans: {
    async getAll(): Promise<Loan[]> {
      return db.loans.orderBy('createdAt').reverse().toArray()
    },

    async getById(id: number | string): Promise<Loan | undefined> {
      return db.loans.get(id as number)
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
      await db.loans.delete(id as number)
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

    async clear(): Promise<void> {
      await db.syncQueue.clear()
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
