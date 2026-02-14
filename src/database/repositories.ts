import { localCache } from './localCache'
import { syncService } from './syncService'
import type {
  Account,
  IncomeSource,
  Category,
  Transaction,
  Loan,
  AppSettings,
  CustomCurrency,
  LoanStatus,
} from './types'

import { getDeviceId } from '@/lib/deviceId'

function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

function getNumericId(id: number | string | undefined): number | null {
  if (typeof id === 'number') return id
  if (typeof id === 'string' && id.startsWith('temp_')) return null
  if (typeof id === 'string') return parseInt(id, 10)
  return null
}

export const accountRepo = {
  async getAll(): Promise<Account[]> {
    return localCache.accounts.getAll()
  },

  async getById(id: number): Promise<Account | undefined> {
    return localCache.accounts.getById(id)
  },

  async create(
    account: Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
  ): Promise<number | string> {
    const now = new Date()
    const fullAccount: Account = {
      ...account,
      userId: getDeviceId(),
      createdAt: now,
      updatedAt: now,
    }

    const tempId = generateTempId()
    const tempAccount = { ...fullAccount, id: tempId as unknown as number }
    await localCache.accounts.put(tempAccount)

    syncService.queueOperation(
      'create',
      'accounts',
      tempId,
      fullAccount as unknown as Record<string, unknown>
    )

    return tempId
  },

  async update(
    id: number | string,
    updates: Partial<Omit<Account, 'id' | 'createdAt' | 'userId'>>
  ): Promise<void> {
    const numericId = getNumericId(id)
    if (!numericId) return

    const cached = await localCache.accounts.getById(numericId)
    if (!cached) return

    const updatedAccount: Account = {
      ...cached,
      ...updates,
      updatedAt: new Date(),
    }
    await localCache.accounts.put(updatedAccount)

    syncService.queueOperation(
      'update',
      'accounts',
      numericId,
      updates as unknown as Record<string, unknown>
    )
  },

  async updateBalance(id: number | string, amount: number): Promise<void> {
    const numericId = getNumericId(id)
    if (!numericId) return

    const account = await localCache.accounts.getById(numericId)
    if (!account) return

    await this.update(numericId, { balance: account.balance + amount })
  },

  async delete(id: number | string): Promise<void> {
    const numericId = getNumericId(id)

    await localCache.accounts.delete(numericId || parseInt(String(id), 10))

    if (numericId) {
      syncService.queueOperation('delete', 'accounts', numericId)
    }
  },
}

export const incomeSourceRepo = {
  async getAll(): Promise<IncomeSource[]> {
    return localCache.incomeSources.getAll()
  },

  async getById(id: number): Promise<IncomeSource | undefined> {
    return localCache.incomeSources.getById(id)
  },

  async create(
    source: Omit<IncomeSource, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
  ): Promise<number | string> {
    const now = new Date()
    const fullSource: IncomeSource = {
      ...source,
      userId: getDeviceId(),
      createdAt: now,
      updatedAt: now,
    }

    const tempId = generateTempId()
    const tempSource = { ...fullSource, id: tempId as unknown as number }
    await localCache.incomeSources.put(tempSource)

    syncService.queueOperation(
      'create',
      'incomeSources',
      tempId,
      fullSource as unknown as Record<string, unknown>
    )

    return tempId
  },

  async update(
    id: number | string,
    updates: Partial<Omit<IncomeSource, 'id' | 'createdAt' | 'userId'>>
  ): Promise<void> {
    const numericId = getNumericId(id)
    if (!numericId) return

    const cached = await localCache.incomeSources.getById(numericId)
    if (!cached) return

    const updatedSource: IncomeSource = {
      ...cached,
      ...updates,
      updatedAt: new Date(),
    }
    await localCache.incomeSources.put(updatedSource)

    syncService.queueOperation(
      'update',
      'incomeSources',
      numericId,
      updates as unknown as Record<string, unknown>
    )
  },

  async delete(id: number | string): Promise<void> {
    const numericId = getNumericId(id)

    await localCache.incomeSources.delete(numericId || parseInt(String(id), 10))

    if (numericId) {
      syncService.queueOperation('delete', 'incomeSources', numericId)
    }
  },
}

export const categoryRepo = {
  async getAll(): Promise<Category[]> {
    return localCache.categories.getAll()
  },

  async getById(id: number): Promise<Category | undefined> {
    return localCache.categories.getById(id)
  },

  async create(
    category: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
  ): Promise<number | string> {
    const now = new Date()
    const fullCategory: Category = {
      ...category,
      userId: getDeviceId(),
      createdAt: now,
      updatedAt: now,
    }

    const tempId = generateTempId()
    const tempCategory = { ...fullCategory, id: tempId as unknown as number }
    await localCache.categories.put(tempCategory)

    syncService.queueOperation(
      'create',
      'categories',
      tempId,
      fullCategory as unknown as Record<string, unknown>
    )

    return tempId
  },

  async update(
    id: number | string,
    updates: Partial<Omit<Category, 'id' | 'createdAt' | 'userId'>>
  ): Promise<void> {
    const numericId = getNumericId(id)
    if (!numericId) return

    const cached = await localCache.categories.getById(numericId)
    if (!cached) return

    const updatedCategory: Category = {
      ...cached,
      ...updates,
      updatedAt: new Date(),
    }
    await localCache.categories.put(updatedCategory)

    syncService.queueOperation(
      'update',
      'categories',
      numericId,
      updates as unknown as Record<string, unknown>
    )
  },

  async delete(id: number | string): Promise<void> {
    const numericId = getNumericId(id)

    await localCache.categories.delete(numericId || parseInt(String(id), 10))

    if (numericId) {
      syncService.queueOperation('delete', 'categories', numericId)
    }
  },
}

export const transactionRepo = {
  async getAll(): Promise<Transaction[]> {
    return localCache.transactions.getRecent(50)
  },

  async getById(id: number): Promise<Transaction | undefined> {
    return localCache.transactions.getById(id)
  },

  async getByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
    return localCache.transactions.getByDateRange(startDate, endDate)
  },

  async getByAccount(accountId: number): Promise<Transaction[]> {
    return localCache.transactions.getByAccount(accountId)
  },

  async getByCategory(categoryId: number): Promise<Transaction[]> {
    return localCache.transactions.getByCategory(categoryId)
  },

  async getByLoan(loanId: number): Promise<Transaction[]> {
    return localCache.transactions.getByLoan(loanId)
  },

  async getRecent(limit = 10): Promise<Transaction[]> {
    return localCache.transactions.getRecent(limit)
  },

  async create(
    transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
  ): Promise<number | string> {
    const now = new Date()
    const fullTransaction: Transaction = {
      ...transaction,
      userId: getDeviceId(),
      createdAt: now,
      updatedAt: now,
    }

    const tempId = generateTempId()
    const tempTransaction = { ...fullTransaction, id: tempId as unknown as number }
    await localCache.transactions.put(tempTransaction)
    await localCache.transactions.trimToLimit()

    syncService.queueOperation(
      'create',
      'transactions',
      tempId,
      fullTransaction as unknown as Record<string, unknown>
    )

    return tempId
  },

  async update(
    id: number | string,
    updates: Partial<Omit<Transaction, 'id' | 'createdAt' | 'userId'>>
  ): Promise<void> {
    const numericId = getNumericId(id)
    if (!numericId) return

    const cached = await localCache.transactions.getById(numericId)
    if (!cached) return

    const updatedTransaction: Transaction = {
      ...cached,
      ...updates,
      updatedAt: new Date(),
    }
    await localCache.transactions.put(updatedTransaction)

    syncService.queueOperation(
      'update',
      'transactions',
      numericId,
      updates as unknown as Record<string, unknown>
    )
  },

  async delete(id: number | string): Promise<void> {
    const numericId = getNumericId(id)

    await localCache.transactions.delete(numericId || parseInt(String(id), 10))

    if (numericId) {
      syncService.queueOperation('delete', 'transactions', numericId)
    }
  },
}

export const loanRepo = {
  async getAll(): Promise<Loan[]> {
    return localCache.loans.getAll()
  },

  async getById(id: number): Promise<Loan | undefined> {
    return localCache.loans.getById(id)
  },

  async getActive(): Promise<Loan[]> {
    return localCache.loans.getActive()
  },

  async create(
    loan: Omit<Loan, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
  ): Promise<number | string> {
    const now = new Date()
    const fullLoan: Loan = {
      ...loan,
      userId: getDeviceId(),
      createdAt: now,
      updatedAt: now,
    }

    const tempId = generateTempId()
    const tempLoan = { ...fullLoan, id: tempId as unknown as number }
    await localCache.loans.put(tempLoan)

    syncService.queueOperation(
      'create',
      'loans',
      tempId,
      fullLoan as unknown as Record<string, unknown>
    )

    return tempId
  },

  async update(
    id: number | string,
    updates: Partial<Omit<Loan, 'id' | 'createdAt' | 'userId'>>
  ): Promise<void> {
    const cached = await localCache.loans.getById(id)
    if (!cached) return

    const updatedLoan: Loan = {
      ...cached,
      ...updates,
      updatedAt: new Date(),
    }
    await localCache.loans.put(updatedLoan)

    const numericId = getNumericId(id)
    if (numericId) {
      syncService.queueOperation(
        'update',
        'loans',
        numericId,
        updates as unknown as Record<string, unknown>
      )
    }
  },

  async recordPayment(id: number | string, amount: number): Promise<void> {
    const loan = await localCache.loans.getById(id)
    if (!loan) return

    const newPaidAmount = loan.paidAmount + amount
    let status: LoanStatus = 'partially_paid'

    if (newPaidAmount >= loan.amount) {
      status = 'fully_paid'
    }

    await this.update(id, { paidAmount: newPaidAmount, status })
  },

  async reversePayment(id: number | string, amount: number): Promise<void> {
    const loan = await localCache.loans.getById(id)
    if (!loan) return

    const newPaidAmount = Math.max(0, loan.paidAmount - amount)
    let status: LoanStatus = 'active'

    if (newPaidAmount > 0 && newPaidAmount < loan.amount) {
      status = 'partially_paid'
    } else if (newPaidAmount >= loan.amount) {
      status = 'fully_paid'
    }

    await this.update(id, { paidAmount: newPaidAmount, status })
  },

  async delete(id: number | string): Promise<void> {
    await localCache.loans.delete(id)

    const numericId = getNumericId(id)
    if (numericId) {
      syncService.queueOperation('delete', 'loans', numericId)
    }
  },
}

export const settingsRepo = {
  async get(): Promise<AppSettings | null> {
    const result = await localCache.settings.get()
    return result ?? null
  },

  async create(
    settings: Omit<AppSettings, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
  ): Promise<number | string> {
    const now = new Date()
    const fullSettings: AppSettings = {
      ...settings,
      userId: getDeviceId(),
      createdAt: now,
      updatedAt: now,
    }

    const tempId = generateTempId()
    const tempSettings = { ...fullSettings, id: tempId as unknown as number }
    await localCache.settings.put(tempSettings)

    syncService.queueOperation(
      'create',
      'settings',
      tempId,
      fullSettings as unknown as Record<string, unknown>
    )

    return tempId
  },

  async update(updates: Partial<Omit<AppSettings, 'id' | 'createdAt' | 'userId'>>): Promise<void> {
    const cached = await localCache.settings.get()
    if (!cached) return

    const updatedSettings: AppSettings = {
      ...cached,
      ...updates,
      updatedAt: new Date(),
    }
    await localCache.settings.put(updatedSettings)

    syncService.queueOperation(
      'update',
      'settings',
      cached?.id || 0,
      updates as unknown as Record<string, unknown>
    )
  },
}

export const customCurrencyRepo = {
  async getAll(): Promise<CustomCurrency[]> {
    return localCache.customCurrencies.getAll()
  },

  async getById(id: number): Promise<CustomCurrency | undefined> {
    return localCache.customCurrencies.getById(id)
  },

  async create(
    currency: Omit<CustomCurrency, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
  ): Promise<number | string> {
    const now = new Date()
    const fullCurrency: CustomCurrency = {
      ...currency,
      userId: getDeviceId(),
      createdAt: now,
      updatedAt: now,
    }

    const tempId = generateTempId()
    const tempCurrency = { ...fullCurrency, id: tempId as unknown as number }
    await localCache.customCurrencies.put(tempCurrency)

    syncService.queueOperation(
      'create',
      'customCurrencies',
      tempId,
      fullCurrency as unknown as Record<string, unknown>
    )

    return tempId
  },

  async update(
    id: number | string,
    updates: Partial<Omit<CustomCurrency, 'id' | 'createdAt' | 'userId'>>
  ): Promise<void> {
    const numericId = getNumericId(id)
    if (!numericId) return

    const cached = await localCache.customCurrencies.getById(numericId)
    if (!cached) return

    const updatedCurrency: CustomCurrency = {
      ...cached,
      ...updates,
      updatedAt: new Date(),
    }
    await localCache.customCurrencies.put(updatedCurrency)

    syncService.queueOperation(
      'update',
      'customCurrencies',
      numericId,
      updates as unknown as Record<string, unknown>
    )
  },

  async delete(id: number | string): Promise<void> {
    const numericId = getNumericId(id)

    await localCache.customCurrencies.delete(numericId || parseInt(String(id), 10))

    if (numericId) {
      syncService.queueOperation('delete', 'customCurrencies', numericId)
    }
  },
}
