import Dexie, { type EntityTable } from 'dexie'

import type {
  Account,
  IncomeSource,
  Category,
  Transaction,
  Investment,
  Loan,
  AppSettings,
  CustomCurrency,
} from './types'

const db = new Dexie('FinanceTrackerDB') as Dexie & {
  accounts: EntityTable<Account, 'id'>
  incomeSources: EntityTable<IncomeSource, 'id'>
  categories: EntityTable<Category, 'id'>
  transactions: EntityTable<Transaction, 'id'>
  investments: EntityTable<Investment, 'id'>
  loans: EntityTable<Loan, 'id'>
  settings: EntityTable<AppSettings, 'id'>
  customCurrencies: EntityTable<CustomCurrency, 'id'>
}

db.version(1).stores({
  accounts: '++id, name, type, currency, createdAt',
  incomeSources: '++id, name, createdAt',
  categories: '++id, name, createdAt',
  transactions:
    '++id, type, date, accountId, categoryId, incomeSourceId, loanId, investmentId, createdAt',
  investments: '++id, accountId, symbol, createdAt',
  loans: '++id, type, status, personName, accountId, createdAt',
  settings: '++id',
})

db.version(2).stores({
  accounts: '++id, name, type, currency, createdAt',
  incomeSources: '++id, name, createdAt',
  categories: '++id, name, createdAt',
  transactions:
    '++id, type, date, accountId, categoryId, incomeSourceId, loanId, investmentId, createdAt',
  investments: '++id, accountId, symbol, createdAt',
  loans: '++id, type, status, personName, accountId, createdAt',
  settings: '++id',
  customCurrencies: '++id, code, createdAt',
})

export { db }

export type {
  Account,
  IncomeSource,
  Category,
  Transaction,
  Investment,
  Loan,
  AppSettings,
  CustomCurrency,
} from './types'
