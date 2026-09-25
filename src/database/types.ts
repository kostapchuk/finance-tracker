export type AccountType = 'cash' | 'bank' | 'crypto' | 'credit_card'

export type TransactionType =
  'income' | 'expense' | 'transfer' | 'loan_given' | 'loan_received' | 'loan_payment'

export type LoanType = 'given' | 'received'
export type LoanStatus = 'active' | 'partially_paid' | 'fully_paid'

// Category types: regular expense or loan payment
export type CategoryType = 'expense' | 'loan'

export interface Account {
  id?: number
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
  name: string
  color: string
  icon?: string
  categoryType?: CategoryType // 'expense' (default) or 'loan'
  sortOrder?: number
  hiddenFromDashboard?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Transaction {
  id?: number
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
  // Amount actually applied to accountId's balance, when it differs from `amount`
  // (e.g. multi-currency income where `amount` is in the income source's currency)
  accountAmount?: number

  // For transfers
  toAccountId?: number
  toAmount?: number // Amount in target account currency (for multi-currency transfers)

  // For loan transactions
  loanId?: number
  // For loan_payment: amount in the loan's own currency, used to track loan.paidAmount
  // (which is always denominated in the loan's currency, not the account's)
  loanCurrencyAmount?: number

  // Amount in mainCurrency when account currency differs (for reporting/budgets)
  mainCurrencyAmount?: number

  createdAt: Date
  updatedAt: Date
}

export interface Loan {
  id?: number
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
  defaultCurrency: string
  blurFinancialFigures?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CustomCurrency {
  id?: number
  code: string
  name: string
  symbol: string
  createdAt: Date
  updatedAt: Date
}
