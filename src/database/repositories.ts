import { db, type Account, type IncomeSource, type Category, type Transaction, type Investment, type Loan, type AppSettings, type CustomCurrency } from './db'
import type { LoanStatus } from './types'

// Account Repository
export const accountRepo = {
  async getAll() {
    return db.accounts.orderBy('name').toArray()
  },

  async getById(id: number) {
    return db.accounts.get(id)
  },

  async create(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date()
    return db.accounts.add({
      ...account,
      createdAt: now,
      updatedAt: now,
    })
  },

  async update(id: number, updates: Partial<Omit<Account, 'id' | 'createdAt'>>) {
    return db.accounts.update(id, {
      ...updates,
      updatedAt: new Date(),
    })
  },

  async updateBalance(id: number, amount: number) {
    const account = await db.accounts.get(id)
    if (!account) return
    return db.accounts.update(id, {
      balance: account.balance + amount,
      updatedAt: new Date(),
    })
  },

  async delete(id: number) {
    return db.accounts.delete(id)
  },
}

// Income Source Repository
export const incomeSourceRepo = {
  async getAll() {
    return db.incomeSources.orderBy('name').toArray()
  },

  async getById(id: number) {
    return db.incomeSources.get(id)
  },

  async create(source: Omit<IncomeSource, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date()
    return db.incomeSources.add({
      ...source,
      createdAt: now,
      updatedAt: now,
    })
  },

  async update(id: number, updates: Partial<Omit<IncomeSource, 'id' | 'createdAt'>>) {
    return db.incomeSources.update(id, {
      ...updates,
      updatedAt: new Date(),
    })
  },

  async delete(id: number) {
    return db.incomeSources.delete(id)
  },
}

// Category Repository
export const categoryRepo = {
  async getAll() {
    return db.categories.orderBy('name').toArray()
  },

  async getById(id: number) {
    return db.categories.get(id)
  },

  async create(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date()
    return db.categories.add({
      ...category,
      createdAt: now,
      updatedAt: now,
    })
  },

  async update(id: number, updates: Partial<Omit<Category, 'id' | 'createdAt'>>) {
    return db.categories.update(id, {
      ...updates,
      updatedAt: new Date(),
    })
  },

  async delete(id: number) {
    return db.categories.delete(id)
  },
}

// Transaction Repository
export const transactionRepo = {
  async getAll() {
    return db.transactions.orderBy('date').reverse().toArray()
  },

  async getById(id: number) {
    return db.transactions.get(id)
  },

  async getByDateRange(startDate: Date, endDate: Date) {
    return db.transactions
      .where('date')
      .between(startDate, endDate)
      .reverse()
      .toArray()
  },

  async getByAccount(accountId: number) {
    return db.transactions
      .where('accountId')
      .equals(accountId)
      .reverse()
      .toArray()
  },

  async getByCategory(categoryId: number) {
    return db.transactions
      .where('categoryId')
      .equals(categoryId)
      .reverse()
      .toArray()
  },

  async getRecent(limit: number = 10) {
    return db.transactions.orderBy('date').reverse().limit(limit).toArray()
  },

  async create(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date()
    return db.transactions.add({
      ...transaction,
      createdAt: now,
      updatedAt: now,
    })
  },

  async update(id: number, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>) {
    return db.transactions.update(id, {
      ...updates,
      updatedAt: new Date(),
    })
  },

  async delete(id: number) {
    return db.transactions.delete(id)
  },
}

// Investment Repository
export const investmentRepo = {
  async getAll() {
    return db.investments.orderBy('symbol').toArray()
  },

  async getById(id: number) {
    return db.investments.get(id)
  },

  async getByAccount(accountId: number) {
    return db.investments.where('accountId').equals(accountId).toArray()
  },

  async create(investment: Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date()
    return db.investments.add({
      ...investment,
      createdAt: now,
      updatedAt: now,
    })
  },

  async update(id: number, updates: Partial<Omit<Investment, 'id' | 'createdAt'>>) {
    return db.investments.update(id, {
      ...updates,
      updatedAt: new Date(),
    })
  },

  async updatePrice(id: number, price: number) {
    return db.investments.update(id, {
      currentPrice: price,
      lastPriceUpdate: new Date(),
      updatedAt: new Date(),
    })
  },

  async delete(id: number) {
    return db.investments.delete(id)
  },
}

// Loan Repository
export const loanRepo = {
  async getAll() {
    return db.loans.orderBy('createdAt').reverse().toArray()
  },

  async getById(id: number) {
    return db.loans.get(id)
  },

  async getActive() {
    return db.loans.where('status').anyOf(['active', 'partially_paid']).toArray()
  },

  async getByType(type: 'given' | 'received') {
    return db.loans.where('type').equals(type).toArray()
  },

  async create(loan: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date()
    return db.loans.add({
      ...loan,
      createdAt: now,
      updatedAt: now,
    })
  },

  async update(id: number, updates: Partial<Omit<Loan, 'id' | 'createdAt'>>) {
    return db.loans.update(id, {
      ...updates,
      updatedAt: new Date(),
    })
  },

  async recordPayment(id: number, amount: number) {
    const loan = await db.loans.get(id)
    if (!loan) return

    const newPaidAmount = loan.paidAmount + amount
    let status: LoanStatus = 'partially_paid'

    if (newPaidAmount >= loan.amount) {
      status = 'fully_paid'
    }

    return db.loans.update(id, {
      paidAmount: newPaidAmount,
      status,
      updatedAt: new Date(),
    })
  },

  async reversePayment(id: number, amount: number) {
    const loan = await db.loans.get(id)
    if (!loan) return

    const newPaidAmount = Math.max(0, loan.paidAmount - amount)
    let status: LoanStatus = 'active'

    if (newPaidAmount > 0 && newPaidAmount < loan.amount) {
      status = 'partially_paid'
    } else if (newPaidAmount >= loan.amount) {
      status = 'fully_paid'
    }

    return db.loans.update(id, {
      paidAmount: newPaidAmount,
      status,
      updatedAt: new Date(),
    })
  },

  async delete(id: number) {
    return db.loans.delete(id)
  },
}

// Settings Repository
export const settingsRepo = {
  async get() {
    const settings = await db.settings.toArray()
    return settings[0] || null
  },

  async create(settings: Omit<AppSettings, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date()
    return db.settings.add({
      ...settings,
      createdAt: now,
      updatedAt: now,
    })
  },

  async update(updates: Partial<Omit<AppSettings, 'id' | 'createdAt'>>) {
    const settings = await db.settings.toArray()
    if (settings[0]?.id) {
      return db.settings.update(settings[0].id, {
        ...updates,
        updatedAt: new Date(),
      })
    }
  },

  async setPassphrase(hash: string, salt: string) {
    const settings = await db.settings.toArray()
    if (settings[0]?.id) {
      return db.settings.update(settings[0].id, {
        passphraseHash: hash,
        passphraseSalt: salt,
        updatedAt: new Date(),
      })
    } else {
      const now = new Date()
      return db.settings.add({
        passphraseHash: hash,
        passphraseSalt: salt,
        autoLockMinutes: 0,
        defaultCurrency: 'BYN',
        createdAt: now,
        updatedAt: now,
      })
    }
  },
}

// Custom Currency Repository
export const customCurrencyRepo = {
  async getAll() {
    return db.customCurrencies.orderBy('code').toArray()
  },

  async getById(id: number) {
    return db.customCurrencies.get(id)
  },

  async create(currency: Omit<CustomCurrency, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date()
    return db.customCurrencies.add({
      ...currency,
      createdAt: now,
      updatedAt: now,
    })
  },

  async update(id: number, updates: Partial<Omit<CustomCurrency, 'id' | 'createdAt'>>) {
    return db.customCurrencies.update(id, {
      ...updates,
      updatedAt: new Date(),
    })
  },

  async delete(id: number) {
    return db.customCurrencies.delete(id)
  },
}
