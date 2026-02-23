import Dexie, { type EntityTable } from 'dexie'

import type {
  Account,
  IncomeSource,
  Category,
  Transaction,
  Loan,
  AppSettings,
  CustomCurrency,
} from './types'

const db = new Dexie('FinanceTrackerDB') as Dexie & {
  accounts: EntityTable<Account, 'id'>
  incomeSources: EntityTable<IncomeSource, 'id'>
  categories: EntityTable<Category, 'id'>
  transactions: EntityTable<Transaction, 'id'>
  loans: EntityTable<Loan, 'id'>
  settings: EntityTable<AppSettings, 'id'>
  customCurrencies: EntityTable<CustomCurrency, 'id'>
}

db.version(1).stores({
  accounts: '++id, name, type, currency, createdAt',
  incomeSources: '++id, name, createdAt',
  categories: '++id, name, createdAt',
  transactions: '++id, type, date, accountId, categoryId, incomeSourceId, loanId, createdAt',
  loans: '++id, type, status, personName, accountId, createdAt',
  settings: '++id',
})

db.version(2).stores({
  accounts: '++id, name, type, currency, createdAt',
  incomeSources: '++id, name, createdAt',
  categories: '++id, name, createdAt',
  transactions: '++id, type, date, accountId, categoryId, incomeSourceId, loanId, createdAt',
  loans: '++id, type, status, personName, accountId, createdAt',
  settings: '++id',
  customCurrencies: '++id, code, createdAt',
})

db.version(3)
  .stores({
    accounts: '++id, name, type, currency, createdAt',
    incomeSources: '++id, name, createdAt',
    categories: '++id, name, createdAt',
    transactions: '++id, type, date, accountId, categoryId, incomeSourceId, loanId, createdAt',
    loans: '++id, type, status, personName, accountId, createdAt',
    settings: '++id',
    customCurrencies: '++id, code, createdAt',
    investments: null,
  })
  .upgrade(async (tx) => {
    try {
      const count = await tx.table('investments').count()
      if (count > 0) {
        await tx.table('investments').clear()
      }
    } catch {
      // Table doesn't exist, ignore error
    }
  })

db.version(4)
  .stores({
    accounts: 'id, name, type, currency, createdAt',
    incomeSources: 'id, name, createdAt',
    categories: 'id, name, createdAt',
    transactions: 'id, type, date, accountId, categoryId, incomeSourceId, loanId, createdAt',
    loans: 'id, type, status, personName, accountId, createdAt',
    settings: 'id',
    customCurrencies: 'id, code, createdAt',
  })
  .upgrade(async (tx) => {
    const tables = [
      'accounts',
      'incomeSources',
      'categories',
      'transactions',
      'loans',
      'settings',
      'customCurrencies',
    ]
    for (const tableName of tables) {
      const table = tx.table(tableName)
      const records = await table.toArray()
      for (const record of records) {
        if (record.id && typeof record.id === 'number') {
          const newId = crypto.randomUUID()
          await table.delete(record.id)
          await table.add({ ...record, id: newId })
        }
      }
    }
  })

export { db }

export type {
  Account,
  IncomeSource,
  Category,
  Transaction,
  Loan,
  AppSettings,
  CustomCurrency,
} from './types'
