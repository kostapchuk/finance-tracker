import { describe, expect, it } from 'vitest'

import { parseBudgetOkCSV, validateImportFile } from './csvParser'

const HEADER =
  'Operation type, Date,Account,Category,Subcategory,Amount, Currency,Amount_dop,Currency_dop,Comment'

function csv(...lines: string[]): string {
  return [HEADER, ...lines].join('\n')
}

describe('parseBudgetOkCSV', () => {
  it('parses income, expense and transfer rows', () => {
    const result = parseBudgetOkCSV(
      csv(
        'Income,20260115,Wallet,Salary,,1000,$,,,January',
        'Expense,20260131,Wallet,Food out,,27.13,Br,10.0,$,',
        'transfer,20260201,Wallet,Card,,50,$,150,Br,move'
      )
    )

    expect(result.errors).toEqual([])
    expect(result.counts).toEqual({ income: 1, expense: 1, transfer: 1, total: 3 })
    expect(result.uniqueIncomeSources).toEqual(['Salary'])
    expect(result.uniqueCategories).toEqual(['Food out'])
    expect(result.uniqueTransferDestinations).toEqual(['Card'])

    const [income, expense, transfer] = result.rows
    expect(income).toMatchObject({
      operationType: 'Income',
      account: 'Wallet',
      category: 'Salary',
      amount: 1000,
      currency: '$',
      amountDop: undefined,
      currencyDop: undefined,
      comment: 'January',
      lineNumber: 2,
    })
    expect(income.date).toEqual(new Date(2026, 0, 15, 12, 0, 0))
    expect(expense).toMatchObject({ amount: 27.13, amountDop: 10, currencyDop: '$', comment: '' })
    expect(transfer).toMatchObject({ operationType: 'transfer', amountDop: 150, currencyDop: 'Br' })
  })

  it('reports the most common currency per account, including transfer destinations', () => {
    const result = parseBudgetOkCSV(
      csv(
        'Expense,20260101,Wallet,Food,,1,$,,,',
        'Expense,20260102,Wallet,Food,,1,$,,,',
        'Expense,20260103,Wallet,Food,,1,Br,,,',
        'transfer,20260104,Wallet,Card,,5,$,,,',
        'transfer,20260105,Bank,Savings,,5,$,15,Br,'
      )
    )

    expect(result.uniqueAccounts).toEqual([
      { name: 'Bank', currency: '$' },
      { name: 'Card', currency: '$' },
      { name: 'Savings', currency: 'Br' },
      { name: 'Wallet', currency: '$' },
    ])
  })

  it('joins unquoted category and subcategory fields with a comma', () => {
    const result = parseBudgetOkCSV(csv('Expense,20260101,Wallet,Такси,машина,12,Br,,,'))

    expect(result.rows[0].category).toBe('Такси, машина')
  })

  it('handles quoted fields with commas, escaped quotes and newlines', () => {
    const result = parseBudgetOkCSV(
      csv('Expense,20260101,Wallet,Food,,5,$,,,"line one, ""quoted""\nline two"')
    )

    expect(result.errors).toEqual([])
    expect(result.rows[0].comment).toBe('line one, "quoted"\nline two')
  })

  it('accepts CRLF line endings, blank lines and case-insensitive operation types', () => {
    const result = parseBudgetOkCSV(
      [
        HEADER,
        'INCOME,20260101,Wallet,Salary,,1,$,,,',
        '',
        'expense,20260102,Wallet,Food,,2,$,,,',
      ].join('\r\n')
    )

    expect(result.counts.total).toBe(2)
    expect(result.rows.map((r) => r.operationType)).toEqual(['Income', 'Expense'])
  })

  it('accepts a comma as the decimal separator', () => {
    const result = parseBudgetOkCSV(csv('Expense,20260101,Wallet,Food,,"12,5",$,,,'))

    expect(result.rows[0].amount).toBe(12.5)
  })

  it.each([
    ['too few fields', 'Expense,20260101,Wallet', 'expected at least 9 fields, got 3'],
    ['unknown operation type', 'Refund,20260101,Wallet,Food,,1,$,,,', 'Invalid operation type'],
    ['short date', 'Expense,2026011,Wallet,Food,,1,$,,,', 'Invalid date format'],
    ['non-numeric date', 'Expense,2026ab01,Wallet,Food,,1,$,,,', 'Invalid date format'],
    ['month out of range', 'Expense,20261301,Wallet,Food,,1,$,,,', 'Invalid date format'],
    ['day out of range', 'Expense,20260100,Wallet,Food,,1,$,,,', 'Invalid date format'],
    ['impossible date', 'Expense,20260230,Wallet,Food,,1,$,,,', 'Invalid date format'],
    ['missing amount', 'Expense,20260101,Wallet,Food,,,$,,,', 'Invalid amount'],
    ['non-numeric amount', 'Expense,20260101,Wallet,Food,,abc,$,,,', 'Invalid amount'],
    ['negative amount', 'Expense,20260101,Wallet,Food,,-5,$,,,', 'Invalid amount'],
  ])('records an error for %s', (_name, line, message) => {
    const result = parseBudgetOkCSV(csv('Expense,20260101,Wallet,Food,,1,$,,,', line))

    expect(result.rows).toHaveLength(1)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].lineNumber).toBe(3)
    expect(result.errors[0].message).toContain(message)
    expect(result.errors[0].rawLine).toBe(line)
  })

  it('truncates long raw lines in errors', () => {
    const line = `Refund,20260101,Wallet,${'x'.repeat(200)},,1,$,,,`
    const result = parseBudgetOkCSV(csv(line))

    expect(result.errors[0].rawLine).toBe(line.slice(0, 100) + '...')
  })

  it('returns empty results for a header-only file', () => {
    const result = parseBudgetOkCSV(HEADER)

    expect(result.rows).toEqual([])
    expect(result.uniqueAccounts).toEqual([])
    expect(result.counts.total).toBe(0)
  })
})

describe('validateImportFile', () => {
  it('accepts a small CSV file regardless of extension case', () => {
    expect(validateImportFile(new File(['a'], 'export.CSV'))).toBeUndefined()
  })

  it('rejects non-CSV files', () => {
    expect(validateImportFile(new File(['a'], 'export.txt'))).toBe('File must be a CSV file')
  })

  it('rejects files over 5MB', () => {
    const file = new File(['a'], 'big.csv')
    Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 + 1 })

    expect(validateImportFile(file)).toBe('File too large (max 5MB)')
  })
})
