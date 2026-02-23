import type {
  Account,
  IncomeSource,
  Category,
  Transaction,
  Loan,
  AppSettings,
  CustomCurrency,
  ReportCache,
} from './types'

import { getDeviceId } from '@/lib/deviceId'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

type DbRecord<T> = Omit<T, 'createdAt' | 'updatedAt'> & {
  created_at?: string
  updated_at?: string
}

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

function toDbRecord<T extends { id?: string; createdAt?: Date; updatedAt?: Date }>(
  item: Partial<T>,
  includeUserId = true
): DbRecord<T> {
  const record: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(item)) {
    if (value !== undefined) {
      record[toSnakeCase(key)] = value
    }
  }

  if (includeUserId) {
    record.user_id = getDeviceId()
  }

  if (item.createdAt) {
    record.created_at = item.createdAt.toISOString()
    delete record.createdAt
  }
  if (item.updatedAt) {
    record.updated_at = item.updatedAt.toISOString()
    delete record.updatedAt
  }

  delete record.userId

  return record as DbRecord<T>
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

function fromDbRecord<T extends { id?: string; createdAt?: Date; updatedAt?: Date }>(
  record: Record<string, unknown>
): T {
  const item: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(record)) {
    item[toCamelCase(key)] = value
  }

  return item as T
}

function fromDbRecords<T extends { id?: string; createdAt?: Date; updatedAt?: Date }>(
  records: Record<string, unknown>[]
): T[] {
  return records.map((r) => fromDbRecord<T>(r))
}

export const supabaseApi = {
  accounts: {
    async getAll(): Promise<Account[]> {
      if (!isSupabaseConfigured() || !supabase) return []

      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', getDeviceId())
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error
      return fromDbRecords<Account>(data ?? [])
    },

    async deleteAll(): Promise<void> {
      if (!isSupabaseConfigured() || !supabase) return

      const { error } = await supabase.from('accounts').delete().eq('user_id', getDeviceId())

      if (error) throw error
    },

    async getById(id: string): Promise<Account | null> {
      if (!isSupabaseConfigured() || !supabase) return null

      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', id)
        .eq('user_id', getDeviceId())
        .single()

      if (error) throw error
      return data ? fromDbRecord<Account>(data) : null
    },

    async upsert(account: Omit<Account, 'createdAt' | 'updatedAt' | 'userId'>): Promise<Account> {
      if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase not configured')

      const now = new Date()
      const record = toDbRecord({ ...account, createdAt: now, updatedAt: now })

      const { data, error } = await supabase
        .from('accounts')
        .upsert(record, { onConflict: 'id' })
        .select()
        .single()

      if (error) throw error
      return fromDbRecord<Account>(data)
    },

    async delete(id: string): Promise<void> {
      if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase not configured')

      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', getDeviceId())

      if (error) throw error
    },
  },

  incomeSources: {
    async getAll(): Promise<IncomeSource[]> {
      if (!isSupabaseConfigured() || !supabase) return []

      const { data, error } = await supabase
        .from('income_sources')
        .select('*')
        .eq('user_id', getDeviceId())
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error
      return fromDbRecords<IncomeSource>(data ?? [])
    },

    async deleteAll(): Promise<void> {
      if (!isSupabaseConfigured() || !supabase) return

      const { error } = await supabase.from('income_sources').delete().eq('user_id', getDeviceId())

      if (error) throw error
    },

    async getById(id: string): Promise<IncomeSource | null> {
      if (!isSupabaseConfigured() || !supabase) return null

      const { data, error } = await supabase
        .from('income_sources')
        .select('*')
        .eq('id', id)
        .eq('user_id', getDeviceId())
        .single()

      if (error) throw error
      return data ? fromDbRecord<IncomeSource>(data) : null
    },

    async upsert(
      source: Omit<IncomeSource, 'createdAt' | 'updatedAt' | 'userId'>
    ): Promise<IncomeSource> {
      if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase not configured')

      const now = new Date()
      const record = toDbRecord({ ...source, createdAt: now, updatedAt: now })

      const { data, error } = await supabase
        .from('income_sources')
        .upsert(record, { onConflict: 'id' })
        .select()
        .single()

      if (error) throw error
      return fromDbRecord<IncomeSource>(data)
    },

    async delete(id: string): Promise<void> {
      if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase not configured')

      const { error } = await supabase
        .from('income_sources')
        .delete()
        .eq('id', id)
        .eq('user_id', getDeviceId())

      if (error) throw error
    },
  },

  categories: {
    async getAll(): Promise<Category[]> {
      if (!isSupabaseConfigured() || !supabase) return []

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', getDeviceId())
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error
      return fromDbRecords<Category>(data ?? [])
    },

    async deleteAll(): Promise<void> {
      if (!isSupabaseConfigured() || !supabase) return

      const { error } = await supabase.from('categories').delete().eq('user_id', getDeviceId())

      if (error) throw error
    },

    async getById(id: string): Promise<Category | null> {
      if (!isSupabaseConfigured() || !supabase) return null

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .eq('user_id', getDeviceId())
        .single()

      if (error) throw error
      return data ? fromDbRecord<Category>(data) : null
    },

    async upsert(
      category: Omit<Category, 'createdAt' | 'updatedAt' | 'userId'>
    ): Promise<Category> {
      if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase not configured')

      const now = new Date()
      const record = toDbRecord({ ...category, createdAt: now, updatedAt: now })

      const { data, error } = await supabase
        .from('categories')
        .upsert(record, { onConflict: 'id' })
        .select()
        .single()

      if (error) throw error
      return fromDbRecord<Category>(data)
    },

    async delete(id: string): Promise<void> {
      if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase not configured')

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('user_id', getDeviceId())

      if (error) throw error
    },
  },

  transactions: {
    async getAll(): Promise<Transaction[]> {
      if (!isSupabaseConfigured() || !supabase) return []

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', getDeviceId())
        .order('date', { ascending: false })

      if (error) throw error
      return fromDbRecords<Transaction>(data ?? [])
    },

    async getById(id: string): Promise<Transaction | null> {
      if (!isSupabaseConfigured() || !supabase) return null

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .eq('user_id', getDeviceId())
        .single()

      if (error) throw error
      return data ? fromDbRecord<Transaction>(data) : null
    },

    async getRecent(limit = 50): Promise<Transaction[]> {
      if (!isSupabaseConfigured() || !supabase) return []

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', getDeviceId())
        .order('date', { ascending: false })
        .limit(limit)

      if (error) throw error
      return fromDbRecords<Transaction>(data ?? [])
    },

    async getByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
      if (!isSupabaseConfigured() || !supabase) return []

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', getDeviceId())
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString())
        .order('date', { ascending: false })

      if (error) throw error
      return fromDbRecords<Transaction>(data ?? [])
    },

    async getByAccount(accountId: string): Promise<Transaction[]> {
      if (!isSupabaseConfigured() || !supabase) return []

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', getDeviceId())
        .eq('account_id', accountId)
        .order('date', { ascending: false })

      if (error) throw error
      return fromDbRecords<Transaction>(data ?? [])
    },

    async getByCategory(categoryId: string): Promise<Transaction[]> {
      if (!isSupabaseConfigured() || !supabase) return []

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', getDeviceId())
        .eq('category_id', categoryId)
        .order('date', { ascending: false })

      if (error) throw error
      return fromDbRecords<Transaction>(data ?? [])
    },

    async getByLoan(loanId: string): Promise<Transaction[]> {
      if (!isSupabaseConfigured() || !supabase) return []

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', getDeviceId())
        .eq('loan_id', loanId)
        .order('date', { ascending: false })

      if (error) throw error
      return fromDbRecords<Transaction>(data ?? [])
    },

    async getPaginated(options?: {
      beforeDate?: Date
      beforeId?: string
      limit?: number
      startDate?: Date
      endDate?: Date
    }): Promise<Transaction[]> {
      if (!isSupabaseConfigured() || !supabase) return []

      const limit = options?.limit ?? 50
      let query = supabase.from('transactions').select('*').eq('user_id', getDeviceId())

      if (options?.startDate) {
        query = query.gte('date', options.startDate.toISOString())
      }
      if (options?.endDate) {
        query = query.lte('date', options.endDate.toISOString())
      }

      if (options?.beforeDate && options?.beforeId) {
        query = query.or(
          `date.lt.${options.beforeDate.toISOString()},and(date.eq.${options.beforeDate.toISOString()},id.lt.${options.beforeId})`
        )
      } else if (options?.beforeDate) {
        query = query.lt('date', options.beforeDate.toISOString())
      }

      query = query.order('date', { ascending: false }).limit(limit)

      const { data, error } = await query

      if (error) throw error
      return fromDbRecords<Transaction>(data ?? [])
    },

    async getSummaryByDateRange(
      startDate?: Date,
      endDate?: Date
    ): Promise<{ inflows: number; outflows: number; net: number }> {
      if (!isSupabaseConfigured() || !supabase) return { inflows: 0, outflows: 0, net: 0 }

      let query = supabase
        .from('transactions')
        .select('type, amount, main_currency_amount')
        .eq('user_id', getDeviceId())

      if (startDate) {
        query = query.gte('date', startDate.toISOString())
      }
      if (endDate) {
        query = query.lte('date', endDate.toISOString())
      }

      const { data, error } = await query

      if (error) throw error

      let inflows = 0
      let outflows = 0

      for (const tx of data ?? []) {
        const amount = tx.main_currency_amount ?? tx.amount

        if (tx.type === 'income' || tx.type === 'loan_received') {
          inflows += amount
        } else if (tx.type === 'expense' || tx.type === 'loan_given') {
          outflows += amount
        }
      }

      return { inflows, outflows, net: inflows - outflows }
    },

    async upsert(
      transaction: Omit<Transaction, 'createdAt' | 'updatedAt' | 'userId'>
    ): Promise<Transaction> {
      if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase not configured')

      const now = new Date()
      const record: Record<string, unknown> = toDbRecord({
        ...transaction,
        createdAt: now,
        updatedAt: now,
      })

      if (transaction.date) {
        record.date =
          transaction.date instanceof Date ? transaction.date.toISOString() : transaction.date
      }

      const { data, error } = await supabase
        .from('transactions')
        .upsert(record, { onConflict: 'id' })
        .select()
        .single()

      if (error) throw error
      return fromDbRecord<Transaction>(data)
    },

    async bulkUpsert(
      transactions: Omit<Transaction, 'createdAt' | 'updatedAt' | 'userId'>[]
    ): Promise<Transaction[]> {
      if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase not configured')
      if (transactions.length === 0) return []

      const now = new Date()
      const records: Record<string, unknown>[] = transactions.map((tx) => {
        const record: Record<string, unknown> = toDbRecord({
          ...tx,
          createdAt: now,
          updatedAt: now,
        })
        if (tx.date) {
          record.date = tx.date instanceof Date ? tx.date.toISOString() : tx.date
        }
        return record
      })

      const { data, error } = await supabase
        .from('transactions')
        .upsert(records, { onConflict: 'id' })
        .select()

      if (error) throw error
      return fromDbRecords<Transaction>(data ?? [])
    },

    async delete(id: string): Promise<void> {
      if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase not configured')

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', getDeviceId())

      if (error) throw error
    },

    async deleteAll(): Promise<void> {
      if (!isSupabaseConfigured() || !supabase) return

      const { error } = await supabase.from('transactions').delete().eq('user_id', getDeviceId())

      if (error) throw error
    },
  },

  loans: {
    async getAll(): Promise<Loan[]> {
      if (!isSupabaseConfigured() || !supabase) return []

      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', getDeviceId())
        .order('created_at', { ascending: false })

      if (error) throw error
      return fromDbRecords<Loan>(data ?? [])
    },

    async getById(id: string): Promise<Loan | null> {
      if (!isSupabaseConfigured() || !supabase) return null

      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('id', id)
        .eq('user_id', getDeviceId())
        .single()

      if (error) throw error
      return data ? fromDbRecord<Loan>(data) : null
    },

    async getActive(): Promise<Loan[]> {
      if (!isSupabaseConfigured() || !supabase) return []

      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', getDeviceId())
        .in('status', ['active', 'partially_paid'])

      if (error) throw error
      return fromDbRecords<Loan>(data ?? [])
    },

    async upsert(loan: Omit<Loan, 'createdAt' | 'updatedAt' | 'userId'>): Promise<Loan> {
      if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase not configured')

      const now = new Date()
      const record: Record<string, unknown> = toDbRecord({
        ...loan,
        createdAt: now,
        updatedAt: now,
      })

      if (loan.dueDate) {
        record.due_date = loan.dueDate instanceof Date ? loan.dueDate.toISOString() : loan.dueDate
        delete record.dueDate
      }

      const { data, error } = await supabase
        .from('loans')
        .upsert(record, { onConflict: 'id' })
        .select()
        .single()

      if (error) throw error
      return fromDbRecord<Loan>(data)
    },

    async delete(id: string): Promise<void> {
      if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase not configured')

      const { error } = await supabase
        .from('loans')
        .delete()
        .eq('id', id)
        .eq('user_id', getDeviceId())

      if (error) throw error
    },

    async deleteAll(): Promise<void> {
      if (!isSupabaseConfigured() || !supabase) return

      const { error } = await supabase.from('loans').delete().eq('user_id', getDeviceId())

      if (error) throw error
    },
  },

  settings: {
    async get(): Promise<AppSettings | null> {
      if (!isSupabaseConfigured() || !supabase) return null

      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', getDeviceId())
        .maybeSingle()

      if (error) throw error
      return data ? fromDbRecord<AppSettings>(data) : null
    },

    async upsert(
      settings: Omit<AppSettings, 'createdAt' | 'updatedAt' | 'userId'>
    ): Promise<AppSettings> {
      if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase not configured')

      const now = new Date()
      const record = toDbRecord({ ...settings, createdAt: now, updatedAt: now })

      const { data, error } = await supabase
        .from('settings')
        .upsert(record, { onConflict: 'user_id' })
        .select()
        .single()

      if (error) throw error
      return fromDbRecord<AppSettings>(data)
    },
  },

  customCurrencies: {
    async getAll(): Promise<CustomCurrency[]> {
      if (!isSupabaseConfigured() || !supabase) return []

      const { data, error } = await supabase
        .from('custom_currencies')
        .select('*')
        .eq('user_id', getDeviceId())
        .order('code', { ascending: true })

      if (error) throw error
      return fromDbRecords<CustomCurrency>(data ?? [])
    },

    async getById(id: string): Promise<CustomCurrency | null> {
      if (!isSupabaseConfigured() || !supabase) return null

      const { data, error } = await supabase
        .from('custom_currencies')
        .select('*')
        .eq('id', id)
        .eq('user_id', getDeviceId())
        .single()

      if (error) throw error
      return data ? fromDbRecord<CustomCurrency>(data) : null
    },

    async upsert(
      currency: Omit<CustomCurrency, 'createdAt' | 'updatedAt' | 'userId'>
    ): Promise<CustomCurrency> {
      if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase not configured')

      const now = new Date()
      const record = toDbRecord({ ...currency, createdAt: now, updatedAt: now })

      const { data, error } = await supabase
        .from('custom_currencies')
        .upsert(record, { onConflict: 'id' })
        .select()
        .single()

      if (error) throw error
      return fromDbRecord<CustomCurrency>(data)
    },

    async delete(id: string): Promise<void> {
      if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase not configured')

      const { error } = await supabase
        .from('custom_currencies')
        .delete()
        .eq('id', id)
        .eq('user_id', getDeviceId())

      if (error) throw error
    },

    async deleteAll(): Promise<void> {
      if (!isSupabaseConfigured() || !supabase) return

      const { error } = await supabase
        .from('custom_currencies')
        .delete()
        .eq('user_id', getDeviceId())

      if (error) throw error
    },
  },

  reportCache: {
    async getByPeriod(periodKey: string): Promise<ReportCache | null> {
      if (!isSupabaseConfigured() || !supabase) return null

      const { data, error } = await supabase
        .from('report_cache')
        .select('*')
        .eq('user_id', getDeviceId())
        .eq('period_key', periodKey)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }
      return data ? fromDbRecord<ReportCache>(data) : null
    },

    async upsert(cache: ReportCache): Promise<ReportCache> {
      if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase not configured')

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 3)

      const record = {
        user_id: getDeviceId(),
        period_key: cache.periodKey,
        inflows: cache.inflows,
        outflows: cache.outflows,
        net: cache.net,
        category_breakdown: cache.categoryBreakdown,
        income_source_breakdown: cache.incomeSourceBreakdown,
        transaction_count: cache.transactionCount,
        last_transaction_date: cache.lastTransactionDate?.toISOString(),
        updated_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      }

      const { data, error } = await supabase
        .from('report_cache')
        .upsert(record, { onConflict: 'user_id,period_key' })
        .select()
        .single()

      if (error) throw error
      return fromDbRecord<ReportCache>(data)
    },

    async invalidatePeriodsAfterDate(date: Date): Promise<void> {
      if (!isSupabaseConfigured() || !supabase) return

      const { error } = await supabase
        .from('report_cache')
        .delete()
        .eq('user_id', getDeviceId())
        .gte('last_transaction_date', date.toISOString())

      if (error) throw error
    },

    async deleteByPeriod(periodKey: string): Promise<void> {
      if (!isSupabaseConfigured() || !supabase) return

      const { error } = await supabase
        .from('report_cache')
        .delete()
        .eq('user_id', getDeviceId())
        .eq('period_key', periodKey)

      if (error) throw error
    },

    async deleteByPeriods(periodKeys: string[]): Promise<void> {
      if (!isSupabaseConfigured() || !supabase) return
      if (periodKeys.length === 0) return

      const { error } = await supabase
        .from('report_cache')
        .delete()
        .eq('user_id', getDeviceId())
        .in('period_key', periodKeys)

      if (error) throw error
    },

    async deleteExpired(): Promise<void> {
      if (!isSupabaseConfigured() || !supabase) return

      const { error } = await supabase
        .from('report_cache')
        .delete()
        .eq('user_id', getDeviceId())
        .lt('expires_at', new Date().toISOString())

      if (error) throw error
    },
  },
}
