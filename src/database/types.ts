export type AccountType = 'cash' | 'bank' | 'crypto' | 'credit_card'

export type TransactionType =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'loan_given'
  | 'loan_received'
  | 'loan_payment'

export type LoanType = 'given' | 'received'
export type LoanStatus = 'active' | 'partially_paid' | 'fully_paid'

// Category types: regular expense or loan payment
export type CategoryType = 'expense' | 'loan'

export interface Account {
  id?: number
  userId?: string
  name: string
  type: AccountType
  currency: string
  balance: number
  color: string
  icon?: string
  sortOrder?: number
  hiddenFromDashboard?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IncomeSource {
  id?: number
  userId?: string
  name: string
  currency: string
  color: string
  icon?: string
  sortOrder?: number
  hiddenFromDashboard?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Category {
  id?: number
  userId?: string
  name: string
  color: string
  icon?: string
  categoryType?: CategoryType // 'expense' (default) or 'loan'
  budget?: number
  budgetPeriod?: 'monthly' | 'weekly' | 'yearly'
  sortOrder?: number
  hiddenFromDashboard?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Transaction {
  id?: number
  userId?: string
  type: TransactionType
  amount: number
  currency: string
  date: Date
  comment?: string

  // For income
  incomeSourceId?: number

  // For expense
  categoryId?: number

  // For all types that involve accounts
  accountId?: number

  // For transfers
  toAccountId?: number
  toAmount?: number // Amount in target account currency (for multi-currency transfers)

  // For loan transactions
  loanId?: number

  // Amount in mainCurrency when account currency differs (for reporting/budgets)
  mainCurrencyAmount?: number

  createdAt: Date
  updatedAt: Date
}

export interface Loan {
  id?: number
  userId?: string
  type: LoanType
  personName: string
  description?: string
  amount: number
  currency: string
  paidAmount: number
  status: LoanStatus
  accountId?: number
  dueDate?: Date
  createdAt: Date
  updatedAt: Date
}

export interface AppSettings {
  id?: number
  userId?: string
  defaultCurrency: string
  blurFinancialFigures?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CustomCurrency {
  id?: number
  userId?: string
  code: string
  name: string
  symbol: string
  createdAt: Date
  updatedAt: Date
}

export type SyncOperation = 'create' | 'update' | 'delete'

export interface SyncQueueItem {
  id?: number
  operation: SyncOperation
  entity: string
  recordId: number | string
  data?: Record<string, unknown>
  createdAt: Date
  attempts: number
  lastAttemptAt?: Date
  error?: string
}
