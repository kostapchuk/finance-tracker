export type AccountType = 'cash' | 'bank' | 'crypto' | 'investment' | 'credit_card'

export type TransactionType = 'income' | 'expense' | 'transfer' | 'investment_buy' | 'investment_sell' | 'loan_given' | 'loan_received' | 'loan_payment'

export type LoanType = 'given' | 'received'
export type LoanStatus = 'active' | 'partially_paid' | 'fully_paid'

// Category types: regular expense, investment (green "good expense"), or loan payment
export type CategoryType = 'expense' | 'investment' | 'loan'

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
  categoryType?: CategoryType // 'expense' (default), 'investment', or 'loan'
  budget?: number
  budgetPeriod?: 'monthly' | 'weekly' | 'yearly'
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

  // For transfers
  toAccountId?: number
  toAmount?: number  // Amount in target account currency (for multi-currency transfers)

  // For investment transactions
  investmentId?: number
  quantity?: number
  pricePerUnit?: number

  // For loan transactions
  loanId?: number

  // Amount in mainCurrency when account currency differs (for reporting/budgets)
  mainCurrencyAmount?: number

  createdAt: Date
  updatedAt: Date
}

export interface Investment {
  id?: number
  accountId: number
  symbol: string
  name: string
  quantity: number
  averageCost: number
  currentPrice: number
  currency: string
  lastPriceUpdate?: Date
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
