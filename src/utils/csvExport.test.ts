import { describe, it, expect } from 'vitest'

import {
  buildTransactionsCsv,
  CSV_FORMATS,
  escapeCsvCell,
  formatCsvDate,
  toCsv,
  type TransactionsCsvData,
  type TransactionsCsvLabels,
} from './csvExport'

import type { Account, Category, IncomeSource, Loan, Transaction } from '@/database/types'

const created = new Date('2026-01-01')
const timestamps = { createdAt: created, updatedAt: created }

const usd: Account = {
  id: 1,
  name: 'Wallet',
  type: 'cash',
  currency: 'USD',
  balance: 0,
  color: '#000',
  ...timestamps,
}
const eur: Account = { ...usd, id: 2, name: 'Euro Card', currency: 'EUR' }
const food: Category = { id: 5, name: 'Food', color: '#111', ...timestamps }
const salary: IncomeSource = {
  id: 7,
  name: 'Salary',
  currency: 'EUR',
  color: '#222',
  ...timestamps,
}
const loan: Loan = {
  id: 9,
  type: 'given',
  personName: 'Alex',
  amount: 100,
  currency: 'USD',
  paidAmount: 0,
  status: 'active',
  ...timestamps,
}

const labels: TransactionsCsvLabels = {
  columns: {
    date: 'Date',
    type: 'Type',
    amount: 'Amount',
    currency: 'Currency',
    account: 'Account',
    accountAmount: 'Account amount',
    accountCurrency: 'Account currency',
    categoryOrSource: 'Category / Source',
    toAccount: 'To account',
    toAmount: 'To amount',
    toAccountCurrency: 'To account currency',
    mainCurrencyAmount: 'Amount in main currency',
    loanPerson: 'Loan person',
    comment: 'Comment',
  },
  types: {
    income: 'Income',
    expense: 'Expense',
    transfer: 'Transfer',
    loan_given: 'Loan given',
    loan_received: 'Loan received',
    loan_payment: 'Loan payment',
  },
}

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    type: 'expense',
    amount: 10,
    currency: 'USD',
    date: new Date(2026, 2, 15, 9, 5),
    ...timestamps,
    ...overrides,
  }
}

function data(transactions: Transaction[]): TransactionsCsvData {
  return {
    transactions,
    accounts: [usd, eur],
    categories: [food],
    incomeSources: [salary],
    loans: [loan],
    mainCurrency: 'USD',
  }
}

function parseRows(csv: string, delimiter = ','): string[][] {
  return csv
    .replace(/^\uFEFF/, '')
    .trimEnd()
    .split('\r\n')
    .map((line) => line.split(delimiter))
}

describe('formatCsvDate', () => {
  it('formats local date and time as YYYY-MM-DD HH:mm', () => {
    expect(formatCsvDate(new Date(2026, 0, 5, 7, 3))).toBe('2026-01-05 07:03')
  })

  it('accepts ISO strings and returns empty for invalid dates', () => {
    expect(formatCsvDate(new Date(2026, 11, 31, 23, 59).toISOString())).toBe('2026-12-31 23:59')
    expect(formatCsvDate('not a date')).toBe('')
  })
})

describe('escapeCsvCell', () => {
  const en = CSV_FORMATS.en
  const ru = CSV_FORMATS.ru

  it('leaves plain text untouched', () => {
    expect(escapeCsvCell('Groceries', en)).toBe('Groceries')
  })

  it('quotes cells containing the delimiter, quotes or newlines', () => {
    expect(escapeCsvCell('a,b', en)).toBe('"a,b"')
    expect(escapeCsvCell('a;b', ru)).toBe('"a;b"')
    expect(escapeCsvCell('say "hi"', en)).toBe('"say ""hi"""')
    expect(escapeCsvCell('line1\nline2', en)).toBe('"line1\nline2"')
  })

  it('does not quote the other locale delimiter', () => {
    expect(escapeCsvCell('a;b', en)).toBe('a;b')
    expect(escapeCsvCell('a,b', ru)).toBe('a,b')
  })

  it('neutralises text that spreadsheets would run as a formula', () => {
    expect(escapeCsvCell('=SUM(A1)', en)).toBe("'=SUM(A1)")
    expect(escapeCsvCell('+1', en)).toBe("'+1")
    expect(escapeCsvCell('-5 refund', en)).toBe("'-5 refund")
    expect(escapeCsvCell('@user', en)).toBe("'@user")
  })

  it('formats numbers with the locale decimal separator and keeps negatives', () => {
    expect(escapeCsvCell(12.5, en)).toBe('12.5')
    expect(escapeCsvCell(12.5, ru)).toBe('12,5')
    expect(escapeCsvCell(-3, en)).toBe('-3')
    expect(escapeCsvCell(0.000_123_45, ru)).toBe('0,00012345')
  })

  it('renders missing and non-finite values as empty cells', () => {
    expect(escapeCsvCell(undefined, en)).toBe('')
    expect(escapeCsvCell(Number.NaN, en)).toBe('')
  })
})

describe('toCsv', () => {
  it('prefixes a UTF-8 BOM and uses CRLF line endings', () => {
    expect(
      toCsv(
        [
          ['a', 1],
          ['б', 2.5],
        ],
        CSV_FORMATS.ru
      )
    ).toBe('\uFEFFa;1\r\nб;2,5\r\n')
  })
})

describe('buildTransactionsCsv', () => {
  it('writes a localized header including the main currency', () => {
    const [header] = parseRows(buildTransactionsCsv(data([]), labels, CSV_FORMATS.en))
    expect(header).toEqual([
      'Date',
      'Type',
      'Amount',
      'Currency',
      'Account',
      'Account amount',
      'Account currency',
      'Category / Source',
      'To account',
      'To amount',
      'To account currency',
      'Amount in main currency (USD)',
      'Loan person',
      'Comment',
    ])
  })

  it('resolves ids to names for an expense', () => {
    const csv = buildTransactionsCsv(
      data([tx({ accountId: 1, categoryId: 5, comment: 'Lunch' })]),
      labels,
      CSV_FORMATS.en
    )
    expect(parseRows(csv)[1]).toEqual([
      '2026-03-15 09:05',
      'Expense',
      '10',
      'USD',
      'Wallet',
      '10',
      'USD',
      'Food',
      '',
      '',
      '',
      '10',
      '',
      'Lunch',
    ])
  })

  it('uses accountAmount and mainCurrencyAmount for multi-currency income', () => {
    const csv = buildTransactionsCsv(
      data([
        tx({
          type: 'income',
          amount: 100,
          currency: 'EUR',
          accountId: 1,
          accountAmount: 110,
          incomeSourceId: 7,
        }),
      ]),
      labels,
      CSV_FORMATS.en
    )
    const row = parseRows(csv)[1]
    expect(row.slice(1, 8)).toEqual(['Income', '100', 'EUR', 'Wallet', '110', 'USD', 'Salary'])
    // Account is in the main currency, so its amount is used for the main-currency column
    expect(row[11]).toBe('110')
  })

  it('prefers stored mainCurrencyAmount and leaves it empty when unknown', () => {
    const csv = buildTransactionsCsv(
      data([
        tx({ currency: 'EUR', accountId: 2, mainCurrencyAmount: 11 }),
        tx({ currency: 'EUR', accountId: 2 }),
      ]),
      labels,
      CSV_FORMATS.en
    )
    const rows = parseRows(csv)
    expect(rows[1][11]).toBe('11')
    expect(rows[2][11]).toBe('')
  })

  it('fills destination columns for transfers', () => {
    const csv = buildTransactionsCsv(
      data([tx({ type: 'transfer', amount: 50, accountId: 1, toAccountId: 2, toAmount: 45 })]),
      labels,
      CSV_FORMATS.en
    )
    const row = parseRows(csv)[1]
    expect(row.slice(1, 11)).toEqual([
      'Transfer',
      '50',
      'USD',
      'Wallet',
      '50',
      'USD',
      '',
      'Euro Card',
      '45',
      'EUR',
    ])
  })

  it('includes the loan person for loan transactions', () => {
    const csv = buildTransactionsCsv(
      data([tx({ type: 'loan_payment', accountId: 1, loanId: 9 })]),
      labels,
      CSV_FORMATS.en
    )
    const row = parseRows(csv)[1]
    expect(row[1]).toBe('Loan payment')
    expect(row[12]).toBe('Alex')
  })

  it('leaves names empty when referenced entities no longer exist', () => {
    const csv = buildTransactionsCsv(
      data([tx({ accountId: 99, categoryId: 99, loanId: 99 })]),
      labels,
      CSV_FORMATS.en
    )
    const row = parseRows(csv)[1]
    expect(row[4]).toBe('')
    expect(row[5]).toBe('')
    expect(row[7]).toBe('')
    expect(row[12]).toBe('')
  })

  it('sorts rows chronologically', () => {
    const csv = buildTransactionsCsv(
      data([
        tx({ comment: 'later', date: new Date(2026, 5, 1) }),
        tx({ comment: 'earlier', date: new Date(2026, 0, 1) }),
      ]),
      labels,
      CSV_FORMATS.en
    )
    const rows = parseRows(csv)
    expect(rows[1][13]).toBe('earlier')
    expect(rows[2][13]).toBe('later')
  })

  it('uses semicolons and decimal commas for the Russian format', () => {
    const csv = buildTransactionsCsv(
      data([tx({ amount: 12.5, accountId: 1, categoryId: 5 })]),
      labels,
      CSV_FORMATS.ru
    )
    const row = parseRows(csv, ';')[1]
    expect(row[2]).toBe('12,5')
    expect(row).toHaveLength(14)
  })
})
