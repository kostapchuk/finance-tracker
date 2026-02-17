import { localCache } from './localCache'
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
import { isSupabaseConfigured } from '@/lib/supabase'

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

    // Get cached account (works for both numeric and temp IDs)
    const cached = await localCache.accounts.getById(id)
    if (!cached) return

    const updatedAccount: Account = {
      ...cached,
      ...updates,
      updatedAt: new Date(),
    }
    await localCache.accounts.put(updatedAccount)

    if (numericId) {
      // For real IDs, queue an update operation to sync to remote
      syncService.queueOperation(
        'update',
        'accounts',
        numericId,
        updates as unknown as Record<string, unknown>
      )
    } else if (typeof id === 'string' && id.startsWith('temp_')) {
      // For temp IDs, update the pending create operation in sync queue
      await localCache.syncQueue.deleteByRecordId(id)
      syncService.queueOperation(
        'create',
        'accounts',
        id,
        updatedAccount as unknown as Record<string, unknown>
      )
    }
  },

  async updateBalance(id: number | string, amount: number): Promise<void> {
    const account = await localCache.accounts.getById(id)
    if (!account) return

    const updatedAccount: Account = {
      ...account,
      balance: account.balance + amount,
      updatedAt: new Date(),
    }
    await localCache.accounts.put(updatedAccount)

    const numericId = getNumericId(id)
    if (numericId) {
      syncService.queueOperation('update', 'accounts', numericId, {
        balance: account.balance + amount,
      } as unknown as Record<string, unknown>)
    }
    // For temp IDs, the balance is already updated locally
    // No need to sync since sync is either disabled or the account will be synced later
  },

  async delete(id: number | string): Promise<void> {
    const numericId = getNumericId(id)

    await localCache.accounts.delete(numericId || parseInt(String(id), 10))

    if (numericId) {
      syncService.queueOperation('delete', 'accounts', numericId)
    } else if (typeof id === 'string' && id.startsWith('temp_')) {
      // For temp IDs, remove the pending create operation from sync queue
      await localCache.syncQueue.deleteByRecordId(id)
    }
  },

  async bulkUpdateBalance(deltas: { id: number; delta: number }[]): Promise<void> {
    if (deltas.length === 0) return

    const validDeltas = deltas.filter((d) => getNumericId(d.id) !== null)
    if (validDeltas.length === 0) return

    await localCache.accounts.bulkUpdateBalance(validDeltas)

    for (const { id, delta } of validDeltas) {
      const numericId = getNumericId(id)
      if (numericId) {
        syncService.queueOperation('update', 'accounts', numericId, {
          balance: delta,
        } as unknown as Record<string, unknown>)
      }
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

    // Get cached income source (works for both numeric and temp IDs)
    const cached = await localCache.incomeSources.getById(id as number)
    if (!cached) return

    const updatedSource: IncomeSource = {
      ...cached,
      ...updates,
      updatedAt: new Date(),
    }
    await localCache.incomeSources.put(updatedSource)

    if (numericId) {
      // For real IDs, queue an update operation to sync to remote
      syncService.queueOperation(
        'update',
        'incomeSources',
        numericId,
        updates as unknown as Record<string, unknown>
      )
    } else if (typeof id === 'string' && id.startsWith('temp_')) {
      // For temp IDs, update the pending create operation in sync queue
      await localCache.syncQueue.deleteByRecordId(id)
      syncService.queueOperation(
        'create',
        'incomeSources',
        id,
        updatedSource as unknown as Record<string, unknown>
      )
    }
  },

  async delete(id: number | string): Promise<void> {
    const numericId = getNumericId(id)

    await localCache.incomeSources.delete(numericId || parseInt(String(id), 10))

    if (numericId) {
      syncService.queueOperation('delete', 'incomeSources', numericId)
    } else if (typeof id === 'string' && id.startsWith('temp_')) {
      // For temp IDs, remove the pending create operation from sync queue
      await localCache.syncQueue.deleteByRecordId(id)
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

    // Get cached category (works for both numeric and temp IDs)
    const cached = await localCache.categories.getById(id as number)
    if (!cached) return

    const updatedCategory: Category = {
      ...cached,
      ...updates,
      updatedAt: new Date(),
    }
    await localCache.categories.put(updatedCategory)

    if (numericId) {
      // For real IDs, queue an update operation to sync to remote
      syncService.queueOperation(
        'update',
        'categories',
        numericId,
        updates as unknown as Record<string, unknown>
      )
    } else if (typeof id === 'string' && id.startsWith('temp_')) {
      // For temp IDs, update the pending create operation in sync queue
      await localCache.syncQueue.deleteByRecordId(id)
      syncService.queueOperation(
        'create',
        'categories',
        id,
        updatedCategory as unknown as Record<string, unknown>
      )
    }
  },

  async delete(id: number | string): Promise<void> {
    const numericId = getNumericId(id)

    await localCache.categories.delete(numericId || parseInt(String(id), 10))

    if (numericId) {
      syncService.queueOperation('delete', 'categories', numericId)
    } else if (typeof id === 'string' && id.startsWith('temp_')) {
      // For temp IDs, remove the pending create operation from sync queue
      await localCache.syncQueue.deleteByRecordId(id)
    }
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

  async getByLoan(loanId: number | string): Promise<Transaction[]> {
    return localCache.transactions.getByLoan(loanId)
  },

  async getPaginated(options?: {
    beforeDate?: Date
    beforeId?: number
    limit?: number
    startDate?: Date
    endDate?: Date
  }): Promise<Transaction[]> {
    if (!isSupabaseConfigured()) {
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

      if (isSupabaseConfigured()) {
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

      if (isSupabaseConfigured()) {
        await supabaseApi.reportCache.upsert(cacheEntry)
      }
    }

    return summary
  },

  async calculateSummaryFromTransactions(
    startDate?: Date,
    endDate?: Date
  ): Promise<{ inflows: number; outflows: number; net: number }> {
    if (isSupabaseConfigured()) {
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

    syncService.queueOperation(
      'create',
      'transactions',
      tempId,
      fullTransaction as unknown as Record<string, unknown>
    )

    await invalidateReportCache(fullTransaction.date)

    return tempId
  },

  async update(
    id: number | string,
    updates: Partial<Omit<Transaction, 'id' | 'createdAt' | 'userId'>>
  ): Promise<void> {
    const numericId = getNumericId(id)

    // Get cached transaction (works for both numeric and temp IDs)
    const cached = await localCache.transactions.getById(id)
    if (!cached) return

    const updatedTransaction: Transaction = {
      ...cached,
      ...updates,
      updatedAt: new Date(),
    }
    await localCache.transactions.put(updatedTransaction)

    if (numericId) {
      // For real IDs, queue an update operation to sync to remote
      syncService.queueOperation(
        'update',
        'transactions',
        numericId,
        updates as unknown as Record<string, unknown>
      )
    } else if (typeof id === 'string' && id.startsWith('temp_')) {
      // For temp IDs, update the pending create operation in sync queue
      await localCache.syncQueue.deleteByRecordId(id)
      syncService.queueOperation(
        'create',
        'transactions',
        id,
        updatedTransaction as unknown as Record<string, unknown>
      )
    }

    await invalidateReportCache(cached.date)
    if (updates.date) {
      await invalidateReportCache(updates.date)
    }
  },

  async delete(id: number | string): Promise<void> {
    const numericId = getNumericId(id)

    // Get cached transaction before deleting (works for both numeric and temp IDs)
    const cached = await localCache.transactions.getById(id)

    // Delete from local cache using the original ID (can be number or temp string)
    await localCache.transactions.delete(id)

    if (numericId) {
      // For real IDs, queue a delete operation to sync to remote
      syncService.queueOperation('delete', 'transactions', numericId)
    } else if (typeof id === 'string' && id.startsWith('temp_')) {
      // For temp IDs, remove the pending create operation from sync queue
      // This prevents the transaction from being synced after it was deleted offline
      await localCache.syncQueue.deleteByRecordId(id)
    }

    if (cached) {
      await invalidateReportCache(cached.date)
    }
  },

  async bulkCreate(
    transactions: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'userId'>[]
  ): Promise<(number | string)[]> {
    if (transactions.length === 0) return []

    const now = new Date()
    const userId = getDeviceId()

    const tempIds = transactions.map(() => generateTempId())
    const fullTransactions: Transaction[] = transactions.map((tx, i) => ({
      ...tx,
      id: tempIds[i] as unknown as number,
      userId,
      createdAt: now,
      updatedAt: now,
    }))

    await localCache.transactions.putAll(fullTransactions)

    syncService.queueBulkOperation(
      'create',
      'transactions',
      tempIds.map((tempId, i) => ({
        tempId,
        data: fullTransactions[i] as unknown as Record<string, unknown>,
      }))
    )

    const affectedPeriodKeys = [...new Set(transactions.map((tx) => getPeriodKeyFromDate(tx.date)))]
    await localCache.reportCache.deleteByPeriods(affectedPeriodKeys)

    if (isSupabaseConfigured() && navigator.onLine) {
      try {
        await supabaseApi.reportCache.deleteByPeriods(affectedPeriodKeys)
      } catch {
        // Ignore network errors in offline mode
      }
    }

    return tempIds
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
    } else if (typeof id === 'string' && id.startsWith('temp_')) {
      // For temp IDs, remove the pending create operation from sync queue
      await localCache.syncQueue.deleteByRecordId(id)
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

    // Get cached currency (works for both numeric and temp IDs)
    const cached = await localCache.customCurrencies.getById(id as number)
    if (!cached) return

    const updatedCurrency: CustomCurrency = {
      ...cached,
      ...updates,
      updatedAt: new Date(),
    }
    await localCache.customCurrencies.put(updatedCurrency)

    if (numericId) {
      // For real IDs, queue an update operation to sync to remote
      syncService.queueOperation(
        'update',
        'customCurrencies',
        numericId,
        updates as unknown as Record<string, unknown>
      )
    } else if (typeof id === 'string' && id.startsWith('temp_')) {
      // For temp IDs, update the pending create operation in sync queue
      await localCache.syncQueue.deleteByRecordId(id)
      syncService.queueOperation(
        'create',
        'customCurrencies',
        id,
        updatedCurrency as unknown as Record<string, unknown>
      )
    }
  },

  async delete(id: number | string): Promise<void> {
    const numericId = getNumericId(id)

    await localCache.customCurrencies.delete(numericId || parseInt(String(id), 10))

    if (numericId) {
      syncService.queueOperation('delete', 'customCurrencies', numericId)
    } else if (typeof id === 'string' && id.startsWith('temp_')) {
      // For temp IDs, remove the pending create operation from sync queue
      await localCache.syncQueue.deleteByRecordId(id)
    }
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
    // Only sync to remote when online - offline operations should succeed
    if (isSupabaseConfigured() && navigator.onLine) {
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
    if (!isSupabaseConfigured() || !navigator.onLine) return

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
