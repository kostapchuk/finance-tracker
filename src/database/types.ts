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

export type CategoryType = 'expense' | 'loan'

export interface Account {
  id: string
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
  id: string
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
  id: string
  userId?: string
  name: string
  color: string
  icon?: string
  categoryType?: CategoryType
  budget?: number
  budgetPeriod?: 'monthly' | 'weekly' | 'yearly'
  sortOrder?: number
  hiddenFromDashboard?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Transaction {
  id: string
  userId?: string
  type: TransactionType
  amount: number
  currency: string
  date: Date
  comment?: string

  incomeSourceId?: string
  categoryId?: string
  accountId?: string
  toAccountId?: string
  toAmount?: number
  loanId?: string
  mainCurrencyAmount?: number

  createdAt: Date
  updatedAt: Date
}

export interface Loan {
  id: string
  userId?: string
  type: LoanType
  personName: string
  description?: string
  amount: number
  currency: string
  paidAmount: number
  status: LoanStatus
  accountId?: string
  dueDate?: Date
  createdAt: Date
  updatedAt: Date
}

export interface AppSettings {
  id: string
  userId?: string
  defaultCurrency: string
  blurFinancialFigures?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CustomCurrency {
  id: string
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
  recordId: string
  data?: Record<string, unknown>
  createdAt: Date
  attempts: number
  lastAttemptAt?: Date
  error?: string
}

export interface ReportCache {
  id?: string
  userId?: string
  periodKey: string
  inflows: number
  outflows: number
  net: number
  categoryBreakdown: { categoryId: string; amount: number }[]
  incomeSourceBreakdown: { incomeSourceId: string; amount: number }[]
  transactionCount: number
  lastTransactionDate?: Date
  updatedAt: Date
  expiresAt?: Date
}
