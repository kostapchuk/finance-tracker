// Types for БюджетОк CSV import

export type BudgetOkOperationType = 'Income' | 'Expense' | 'transfer'

export interface BudgetOkRow {
  operationType: BudgetOkOperationType
  date: Date
  account: string
  category: string // For transfers, this is the destination account name
  amount: number
  currency: string
  amountDop: number | null
  currencyDop: string | null
  comment: string
  lineNumber: number
}

export interface ParseError {
  lineNumber: number
  message: string
  rawLine: string
}

export interface SourceAccountInfo {
  name: string
  currency: string // Most common currency used with this account
}

export interface ParsedImportData {
  rows: BudgetOkRow[]
  errors: ParseError[]
  uniqueAccounts: SourceAccountInfo[]
  uniqueCategories: string[] // Expense categories only
  uniqueIncomeSources: string[] // Income categories
  uniqueTransferDestinations: string[] // Transfer destination accounts
  counts: {
    income: number
    expense: number
    transfer: number
    total: number
  }
}

export type ImportWizardStep = 1 | 2 | 3 | 4 | 5 | 6

export interface ImportWizardState {
  step: ImportWizardStep
  file: File | null
  parsedData: ParsedImportData | null
  accountMapping: Map<string, number> // БюджетОк account name → app account id
  categoryMapping: Map<string, number> // БюджетОк expense category → app category id
  incomeSourceMapping: Map<string, number> // БюджетОк income category → app income source id
  isImporting: boolean
  importResult: ImportResult | null
}

export interface ImportResult {
  success: boolean
  importedCount: number
  error?: string
}

export interface AccountBalanceDelta {
  accountId: number
  delta: number
}
