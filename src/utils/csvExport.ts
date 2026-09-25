import type {
  Account,
  IncomeSource,
  Category,
  Transaction,
  Loan,
  TransactionType,
} from '@/database/types'

export interface CsvFormat {
  delimiter: string
  decimalSeparator: string
}

// Excel picks the CSV delimiter and decimal separator from the OS locale:
// Russian locales expect `;` with `,` decimals, others expect `,` with `.`.
export const CSV_FORMATS = {
  en: { delimiter: ',', decimalSeparator: '.' },
  ru: { delimiter: ';', decimalSeparator: ',' },
} as const satisfies Record<string, CsvFormat>

export interface TransactionsCsvLabels {
  columns: {
    date: string
    type: string
    amount: string
    currency: string
    account: string
    accountAmount: string
    accountCurrency: string
    categoryOrSource: string
    toAccount: string
    toAmount: string
    toAccountCurrency: string
    mainCurrencyAmount: string
    loanPerson: string
    comment: string
  }
  types: Record<TransactionType, string>
}

export interface TransactionsCsvData {
  transactions: Transaction[]
  accounts: Account[]
  categories: Category[]
  incomeSources: IncomeSource[]
  loans: Loan[]
  mainCurrency: string
}

// Byte order mark so Excel detects UTF-8 (otherwise Cyrillic text is garbled)
const BOM = '\uFEFF'

// Leading characters that make spreadsheet apps treat a cell as a formula
const FORMULA_PREFIX = /^[=+\-@\t\r]/

type CellValue = string | number | undefined

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function formatCsvDate(date: Date | string): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function escapeCsvCell(value: CellValue, format: CsvFormat): string {
  if (value === undefined) return ''
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return ''
    return String(value).replace('.', format.decimalSeparator)
  }
  const text = FORMULA_PREFIX.test(value) ? `'${value}` : value
  const needsQuotes =
    text.includes(format.delimiter) ||
    text.includes('"') ||
    text.includes('\n') ||
    text.includes('\r')
  return needsQuotes ? `"${text.replaceAll('"', '""')}"` : text
}

export function toCsv(rows: CellValue[][], format: CsvFormat): string {
  const lines = rows.map((row) =>
    row.map((cell) => escapeCsvCell(cell, format)).join(format.delimiter)
  )
  return BOM + lines.join('\r\n') + '\r\n'
}

function byId<T extends { id?: number }>(items: T[]): Map<number, T> {
  return new Map(items.flatMap((item) => (item.id === undefined ? [] : [[item.id, item]])))
}

export function buildTransactionsCsv(
  data: TransactionsCsvData,
  labels: TransactionsCsvLabels,
  format: CsvFormat
): string {
  const accounts = byId(data.accounts)
  const categories = byId(data.categories)
  const incomeSources = byId(data.incomeSources)
  const loans = byId(data.loans)
  const { columns } = labels

  const header: CellValue[] = [
    columns.date,
    columns.type,
    columns.amount,
    columns.currency,
    columns.account,
    columns.accountAmount,
    columns.accountCurrency,
    columns.categoryOrSource,
    columns.toAccount,
    columns.toAmount,
    columns.toAccountCurrency,
    `${columns.mainCurrencyAmount} (${data.mainCurrency})`,
    columns.loanPerson,
    columns.comment,
  ]

  const sorted = data.transactions.toSorted(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const rows = sorted.map((tx): CellValue[] => {
    const account = tx.accountId === undefined ? undefined : accounts.get(tx.accountId)
    const toAccount = tx.toAccountId === undefined ? undefined : accounts.get(tx.toAccountId)
    const category = tx.categoryId === undefined ? undefined : categories.get(tx.categoryId)
    const incomeSource =
      tx.incomeSourceId === undefined ? undefined : incomeSources.get(tx.incomeSourceId)
    const loan = tx.loanId === undefined ? undefined : loans.get(tx.loanId)

    // Transfers always debit `amount` from the source account; other types
    // use `accountAmount` when the account currency differs.
    const accountAmount = tx.type === 'transfer' ? tx.amount : (tx.accountAmount ?? tx.amount)

    let mainCurrencyAmount = tx.mainCurrencyAmount
    if (mainCurrencyAmount === undefined) {
      if (tx.currency === data.mainCurrency) mainCurrencyAmount = tx.amount
      else if (account?.currency === data.mainCurrency) mainCurrencyAmount = accountAmount
    }

    return [
      formatCsvDate(tx.date),
      labels.types[tx.type],
      tx.amount,
      tx.currency,
      account?.name,
      account ? accountAmount : undefined,
      account?.currency,
      category?.name ?? incomeSource?.name,
      toAccount?.name,
      toAccount ? (tx.toAmount ?? tx.amount) : undefined,
      toAccount?.currency,
      mainCurrencyAmount,
      loan?.personName,
      tx.comment,
    ]
  })

  return toCsv([header, ...rows], format)
}
