import type {
  Account,
  IncomeSource,
  Category,
  Transaction,
  Loan,
  CustomCurrency,
} from '@/database/types'

export interface BackupData {
  version: number
  exportedAt: string
  accounts: Account[]
  incomeSources: IncomeSource[]
  categories: Category[]
  transactions: Transaction[]
  loans: Loan[]
  customCurrencies: CustomCurrency[]
}

export interface ParsedBackupData {
  accounts: Account[]
  incomeSources: IncomeSource[]
  categories: Category[]
  transactions: Transaction[]
  loans: Loan[]
  customCurrencies: CustomCurrency[]
}

export function buildBackupData(data: {
  accounts: Account[]
  incomeSources: IncomeSource[]
  categories: Category[]
  transactions: Transaction[]
  loans: Loan[]
  customCurrencies: CustomCurrency[]
}): BackupData {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    ...data,
  }
}

/**
 * Parses a backup file into entity arrays ready for bulkAdd.
 *
 * IDs from the file are intentionally kept as-is: transactions/loans
 * reference accounts/categories/incomeSources/loans by numeric id, and the
 * caller is expected to clear the destination tables before re-inserting
 * these records. Regenerating ids here would silently break those
 * references whenever the original id sequence has gaps (e.g. after any
 * prior delete).
 */
export function parseBackupData(raw?: unknown): ParsedBackupData {
  const data = raw as Record<string, unknown> | undefined
  if (!data || typeof data !== 'object' || !data.version || !data.accounts || !data.transactions) {
    throw new Error('Invalid backup file format')
  }

  const withDates = <T>(items: unknown, dateFields: (keyof T & string)[]): T[] =>
    ((items as Record<string, unknown>[]) ?? []).map((item) => {
      const result = { ...item } as Record<string, unknown>
      for (const field of dateFields) {
        if (result[field]) result[field] = new Date(result[field] as string)
      }
      return result as T
    })

  return {
    accounts: withDates<Account>(data.accounts, ['createdAt', 'updatedAt']),
    incomeSources: withDates<IncomeSource>(data.incomeSources, ['createdAt', 'updatedAt']),
    categories: withDates<Category>(data.categories, ['createdAt', 'updatedAt']),
    transactions: withDates<Transaction>(data.transactions, ['date', 'createdAt', 'updatedAt']),
    loans: withDates<Loan>(data.loans, ['dueDate', 'createdAt', 'updatedAt']),
    customCurrencies: withDates<CustomCurrency>(data.customCurrencies, ['createdAt', 'updatedAt']),
  }
}
