import { localCache } from './localCache'
import { isCloudReady } from './migration'
import { supabaseApi } from './supabaseApi'
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
  ReportCache,
} from './types'

import { getDeviceId } from '@/lib/deviceId'

function generateUUID(): string {
  return crypto.randomUUID()
}

export const accountRepo = {
  async getAll(): Promise<Account[]> {
    return localCache.accounts.getAll()
  },

  async getById(id: string): Promise<Account | undefined> {
    return localCache.accounts.getById(id)
  },

  async create(
    account: Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
  ): Promise<string> {
    const now = new Date()
    const id = generateUUID()

    const fullAccount: Account = {
      ...account,
      id,
      userId: getDeviceId(),
      createdAt: now,
      updatedAt: now,
    }

    await localCache.accounts.put(fullAccount)

    syncService.queueOperation(
      'create',
      'accounts',
      id,
      fullAccount as unknown as Record<string, unknown>
    )

    return id
  },

  async update(
    id: string,
    updates: Partial<Omit<Account, 'id' | 'createdAt' | 'userId'>>
  ): Promise<void> {
    const cached = await localCache.accounts.getById(id)
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
      id,
      updates as unknown as Record<string, unknown>
    )
  },

  async updateBalance(id: string, amount: number): Promise<void> {
    const account = await localCache.accounts.getById(id)
    if (!account) return

    const updatedAccount: Account = {
      ...account,
      balance: account.balance + amount,
      updatedAt: new Date(),
    }
    await localCache.accounts.put(updatedAccount)

    syncService.queueOperation('update', 'accounts', id, {
      balance: account.balance + amount,
    } as unknown as Record<string, unknown>)
  },

  async delete(id: string): Promise<void> {
    await localCache.accounts.delete(id)
    syncService.queueOperation('delete', 'accounts', id)
  },

  async bulkUpdateBalance(deltas: { id: string; delta: number }[]): Promise<void> {
    if (deltas.length === 0) return

    await localCache.accounts.bulkUpdateBalance(deltas)

    for (const { id, delta } of deltas) {
      syncService.queueOperation('update', 'accounts', id, {
        balance: delta,
      } as unknown as Record<string, unknown>)
    }
  },
}

export const incomeSourceRepo = {
  async getAll(): Promise<IncomeSource[]> {
    return localCache.incomeSources.getAll()
  },

  async getById(id: string): Promise<IncomeSource | undefined> {
    return localCache.incomeSources.getById(id)
  },

  async create(
    source: Omit<IncomeSource, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
  ): Promise<string> {
    const now = new Date()
    const id = generateUUID()

    const fullSource: IncomeSource = {
      ...source,
      id,
      userId: getDeviceId(),
      createdAt: now,
      updatedAt: now,
    }

    await localCache.incomeSources.put(fullSource)

    syncService.queueOperation(
      'create',
      'incomeSources',
      id,
      fullSource as unknown as Record<string, unknown>
    )

    return id
  },

  async update(
    id: string,
    updates: Partial<Omit<IncomeSource, 'id' | 'createdAt' | 'userId'>>
  ): Promise<void> {
    const cached = await localCache.incomeSources.getById(id)
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
      id,
      updates as unknown as Record<string, unknown>
    )
  },

  async delete(id: string): Promise<void> {
    await localCache.incomeSources.delete(id)
    syncService.queueOperation('delete', 'incomeSources', id)
  },
}

export const categoryRepo = {
  async getAll(): Promise<Category[]> {
    return localCache.categories.getAll()
  },

  async getById(id: string): Promise<Category | undefined> {
    return localCache.categories.getById(id)
  },

  async create(
    category: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
  ): Promise<string> {
    const now = new Date()
    const id = generateUUID()

    const fullCategory: Category = {
      ...category,
      id,
      userId: getDeviceId(),
      createdAt: now,
      updatedAt: now,
    }

    await localCache.categories.put(fullCategory)

    syncService.queueOperation(
      'create',
      'categories',
      id,
      fullCategory as unknown as Record<string, unknown>
    )

    return id
  },

  async update(
    id: string,
    updates: Partial<Omit<Category, 'id' | 'createdAt' | 'userId'>>
  ): Promise<void> {
    const cached = await localCache.categories.getById(id)
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
      id,
      updates as unknown as Record<string, unknown>
    )
  },

  async delete(id: string): Promise<void> {
    await localCache.categories.delete(id)
    syncService.queueOperation('delete', 'categories', id)
  },
}

export const transactionRepo = {
  async getAll(): Promise<Transaction[]> {
    return localCache.transactions.getRecent(50)
  },

  async getAllUnlimited(): Promise<Transaction[]> {
    return localCache.transactions.getAll()
  },

  async getRecent(limit = 50): Promise<Transaction[]> {
    return localCache.transactions.getRecent(limit)
  },

  async getById(id: string): Promise<Transaction | undefined> {
    return localCache.transactions.getById(id)
  },

  async getByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
    return localCache.transactions.getByDateRange(startDate, endDate)
  },

  async getByAccount(accountId: string): Promise<Transaction[]> {
    return localCache.transactions.getByAccount(accountId)
  },

  async getByCategory(categoryId: string): Promise<Transaction[]> {
    return localCache.transactions.getByCategory(categoryId)
  },

  async getByLoan(loanId: string): Promise<Transaction[]> {
    return localCache.transactions.getByLoan(loanId)
  },

  async getPaginated(options?: {
    beforeDate?: Date
    beforeId?: string
    limit?: number
    startDate?: Date
    endDate?: Date
  }): Promise<Transaction[]> {
    if (!isCloudReady()) {
      return localCache.transactions.getAll()
    }
    return supabaseApi.transactions.getPaginated(options)
  },

  async getSummaryByDateRange(
    startDate?: Date,
    endDate?: Date
  ): Promise<{ inflows: number; outflows: number; net: number }> {
    const periodKey = getPeriodKey(startDate, endDate)
    const isCurrentPeriod = isCurrentMonthPeriod(startDate, endDate)

    if (!isCurrentPeriod) {
      const localCached = await localCache.reportCache.getByPeriod(periodKey)
      if (localCached && !isCacheExpired(localCached)) {
        return {
          inflows: localCached.inflows,
          outflows: localCached.outflows,
          net: localCached.net,
        }
      }

      if (isCloudReady()) {
        const remoteCache = await supabaseApi.reportCache.getByPeriod(periodKey)
        if (remoteCache && !isCacheExpired(remoteCache)) {
          await localCache.reportCache.put(remoteCache)
          return {
            inflows: remoteCache.inflows,
            outflows: remoteCache.outflows,
            net: remoteCache.net,
          }
        }
      }
    }

    const summary = await this.calculateSummaryFromTransactions(startDate, endDate)

    if (!isCurrentPeriod) {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 3)

      const cacheEntry: ReportCache = {
        periodKey,
        inflows: summary.inflows,
        outflows: summary.outflows,
        net: summary.net,
        categoryBreakdown: [],
        incomeSourceBreakdown: [],
        transactionCount: 0,
        lastTransactionDate: endDate,
        updatedAt: new Date(),
        expiresAt,
      }

      await localCache.reportCache.put(cacheEntry)

      if (isCloudReady()) {
        await supabaseApi.reportCache.upsert(cacheEntry)
      }
    }

    return summary
  },

  async calculateSummaryFromTransactions(
    startDate?: Date,
    endDate?: Date
  ): Promise<{ inflows: number; outflows: number; net: number }> {
    if (isCloudReady()) {
      return supabaseApi.transactions.getSummaryByDateRange(startDate, endDate)
    }

    const all = await localCache.transactions.getAll()
    let inflows = 0
    let outflows = 0

    for (const tx of all) {
      if (startDate && new Date(tx.date) < startDate) continue
      if (endDate && new Date(tx.date) > endDate) continue

      const amount = tx.mainCurrencyAmount ?? tx.amount

      if (tx.type === 'income' || tx.type === 'loan_received') {
        inflows += amount
      } else if (tx.type === 'expense' || tx.type === 'loan_given') {
        outflows += amount
      }
    }

    return { inflows, outflows, net: inflows - outflows }
  },

  async create(
    transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
  ): Promise<string> {
    const now = new Date()
    const id = generateUUID()

    const fullTransaction: Transaction = {
      ...transaction,
      id,
      userId: getDeviceId(),
      createdAt: now,
      updatedAt: now,
    }

    await localCache.transactions.put(fullTransaction)

    syncService.queueOperation(
      'create',
      'transactions',
      id,
      fullTransaction as unknown as Record<string, unknown>
    )

    await invalidateReportCache(fullTransaction.date)

    return id
  },

  async update(
    id: string,
    updates: Partial<Omit<Transaction, 'id' | 'createdAt' | 'userId'>>
  ): Promise<void> {
    const cached = await localCache.transactions.getById(id)
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
      id,
      updates as unknown as Record<string, unknown>
    )

    await invalidateReportCache(cached.date)
    if (updates.date) {
      await invalidateReportCache(updates.date)
    }
  },

  async delete(id: string): Promise<void> {
    const cached = await localCache.transactions.getById(id)

    await localCache.transactions.delete(id)

    syncService.queueOperation('delete', 'transactions', id)

    if (cached) {
      await invalidateReportCache(cached.date)
    }
  },

  async bulkCreate(
    transactions: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'userId'>[]
  ): Promise<string[]> {
    if (transactions.length === 0) return []

    const now = new Date()
    const userId = getDeviceId()

    const ids = transactions.map(() => generateUUID())
    const fullTransactions: Transaction[] = transactions.map((tx, i) => ({
      ...tx,
      id: ids[i],
      userId,
      createdAt: now,
      updatedAt: now,
    }))

    await localCache.transactions.putAll(fullTransactions)

    syncService.queueBulkOperation(
      'create',
      'transactions',
      ids.map((id, i) => ({
        tempId: id,
        data: fullTransactions[i] as unknown as Record<string, unknown>,
      }))
    )

    const affectedPeriodKeys = [...new Set(transactions.map((tx) => getPeriodKeyFromDate(tx.date)))]
    await localCache.reportCache.deleteByPeriods(affectedPeriodKeys)

    if (isCloudReady() && navigator.onLine) {
      try {
        await supabaseApi.reportCache.deleteByPeriods(affectedPeriodKeys)
      } catch {
        // Ignore network errors in offline mode
      }
    }

    return ids
  },
}

export const loanRepo = {
  async getAll(): Promise<Loan[]> {
    return localCache.loans.getAll()
  },

  async getById(id: string): Promise<Loan | undefined> {
    return localCache.loans.getById(id)
  },

  async getActive(): Promise<Loan[]> {
    return localCache.loans.getActive()
  },

  async create(loan: Omit<Loan, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<string> {
    const now = new Date()
    const id = generateUUID()

    const fullLoan: Loan = {
      ...loan,
      id,
      userId: getDeviceId(),
      createdAt: now,
      updatedAt: now,
    }

    await localCache.loans.put(fullLoan)

    syncService.queueOperation(
      'create',
      'loans',
      id,
      fullLoan as unknown as Record<string, unknown>
    )

    return id
  },

  async update(
    id: string,
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

    syncService.queueOperation('update', 'loans', id, updates as unknown as Record<string, unknown>)
  },

  async recordPayment(id: string, amount: number): Promise<void> {
    const loan = await localCache.loans.getById(id)
    if (!loan) return

    const newPaidAmount = loan.paidAmount + amount
    let status: LoanStatus = 'partially_paid'

    if (newPaidAmount >= loan.amount) {
      status = 'fully_paid'
    }

    await this.update(id, { paidAmount: newPaidAmount, status })
  },

  async reversePayment(id: string, amount: number): Promise<void> {
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

  async delete(id: string): Promise<void> {
    await localCache.loans.delete(id)
    syncService.queueOperation('delete', 'loans', id)
  },
}

export const settingsRepo = {
  async get(): Promise<AppSettings | null> {
    const result = await localCache.settings.get()
    return result ?? null
  },

  async create(
    settings: Omit<AppSettings, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
  ): Promise<string> {
    const now = new Date()
    const id = generateUUID()

    const fullSettings: AppSettings = {
      ...settings,
      id,
      userId: getDeviceId(),
      createdAt: now,
      updatedAt: now,
    }

    await localCache.settings.put(fullSettings)

    syncService.queueOperation(
      'create',
      'settings',
      id,
      fullSettings as unknown as Record<string, unknown>
    )

    return id
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
      cached.id,
      updates as unknown as Record<string, unknown>
    )
  },
}

export const customCurrencyRepo = {
  async getAll(): Promise<CustomCurrency[]> {
    return localCache.customCurrencies.getAll()
  },

  async getById(id: string): Promise<CustomCurrency | undefined> {
    return localCache.customCurrencies.getById(id)
  },

  async create(
    currency: Omit<CustomCurrency, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
  ): Promise<string> {
    const now = new Date()
    const id = generateUUID()

    const fullCurrency: CustomCurrency = {
      ...currency,
      id,
      userId: getDeviceId(),
      createdAt: now,
      updatedAt: now,
    }

    await localCache.customCurrencies.put(fullCurrency)

    syncService.queueOperation(
      'create',
      'customCurrencies',
      id,
      fullCurrency as unknown as Record<string, unknown>
    )

    return id
  },

  async update(
    id: string,
    updates: Partial<Omit<CustomCurrency, 'id' | 'createdAt' | 'userId'>>
  ): Promise<void> {
    const cached = await localCache.customCurrencies.getById(id)
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
      id,
      updates as unknown as Record<string, unknown>
    )
  },

  async delete(id: string): Promise<void> {
    await localCache.customCurrencies.delete(id)
    syncService.queueOperation('delete', 'customCurrencies', id)
  },
}

export const reportCacheRepo = {
  async getByPeriod(periodKey: string): Promise<ReportCache | undefined> {
    return localCache.reportCache.getByPeriod(periodKey)
  },

  async put(cache: ReportCache): Promise<void> {
    await localCache.reportCache.put(cache)
  },

  async invalidatePeriodsAfterDate(date: Date): Promise<void> {
    await localCache.reportCache.invalidatePeriodsAfterDate(date)
    if (isCloudReady() && navigator.onLine) {
      try {
        await supabaseApi.reportCache.invalidatePeriodsAfterDate(date)
      } catch {
        // Ignore network errors in offline mode
      }
    }
  },

  async clear(): Promise<void> {
    await localCache.reportCache.clear()
  },
}

function getPeriodKey(startDate?: Date, endDate?: Date): string {
  if (!startDate || !endDate) return 'all'

  const startY = startDate.getFullYear()
  const startM = startDate.getMonth()
  const startD = startDate.getDate()
  const endY = endDate.getFullYear()
  const endM = endDate.getMonth()
  const lastDayOfEndMonth = new Date(endY, endM + 1, 0).getDate()

  const isFullMonth =
    startD === 1 && endDate.getDate() === lastDayOfEndMonth && startY === endY && startM === endM

  if (isFullMonth) {
    return `${startY}-${String(startM + 1).padStart(2, '0')}`
  }

  const formatDate = (d: Date) => d.toISOString().split('T')[0]
  return `${formatDate(startDate)}_${formatDate(endDate)}`
}

function getPeriodKeyFromDate(date: Date): string {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function isCurrentMonthPeriod(startDate?: Date, endDate?: Date): boolean {
  if (!startDate || !endDate) return true

  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  return new Date(endDate) >= currentMonthStart && new Date(startDate) <= currentMonthEnd
}

function isCacheExpired(cache: ReportCache): boolean {
  if (!cache.expiresAt) return false
  return new Date(cache.expiresAt) < new Date()
}

async function invalidateReportCache(transactionDate?: Date): Promise<void> {
  const invalidateRemote = async () => {
    if (!isCloudReady() || !navigator.onLine) return

    try {
      const promises: Promise<void>[] = []

      if (transactionDate) {
        promises.push(supabaseApi.reportCache.invalidatePeriodsAfterDate(new Date(transactionDate)))
      }

      const now = new Date()
      const currentMonthKey = getPeriodKeyFromDate(now)
      promises.push(supabaseApi.reportCache.deleteByPeriod(currentMonthKey))

      await Promise.all(promises)
    } catch {
      // Ignore network errors
    }
  }

  invalidateRemote()

  if (transactionDate) {
    const date = new Date(transactionDate)
    await localCache.reportCache.invalidatePeriodsAfterDate(date)
  }

  const now = new Date()
  const currentMonthKey = getPeriodKeyFromDate(now)
  await localCache.reportCache.deleteByPeriod(currentMonthKey)
}
