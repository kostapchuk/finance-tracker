import { describe, it, expect } from 'vitest'

import { parseBudgetOkCSV, validateImportFile } from './csvParser'

describe('parseBudgetOkCSV', () => {
  it('parses simple income row', () => {
    const csv = `Operation type,Date,Account,Category,Subcategory,Amount,Currency,Amount_dop,Currency_dop,Comment
Income,20250115,Wallet,Salary,,100,USD,,,Test income`

    const result = parseBudgetOkCSV(csv)

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].operationType).toBe('Income')
    expect(result.rows[0].date).toEqual(new Date(2025, 0, 15, 12, 0, 0))
    expect(result.rows[0].account).toBe('Wallet')
    expect(result.rows[0].category).toBe('Salary')
    expect(result.rows[0].amount).toBe(100)
    expect(result.rows[0].currency).toBe('USD')
    expect(result.rows[0].comment).toBe('Test income')
  })

  it('parses expense row', () => {
    const csv = `Operation type,Date,Account,Category,Subcategory,Amount,Currency,Amount_dop,Currency_dop,Comment
Expense,20250220,Cash,Food,,50.5,EUR,,,Groceries`

    const result = parseBudgetOkCSV(csv)

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].operationType).toBe('Expense')
    expect(result.rows[0].amount).toBe(50.5)
    expect(result.rows[0].currency).toBe('EUR')
  })

  it('parses transfer row', () => {
    const csv = `Operation type,Date,Account,Category,Subcategory,Amount,Currency,Amount_dop,Currency_dop,Comment
transfer,20250310,Cash,Bank,,100,USD,,,Transfer to bank`

    const result = parseBudgetOkCSV(csv)

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].operationType).toBe('transfer')
    expect(result.rows[0].category).toBe('Bank')
  })

  it('parses multi-currency transaction with amountDop', () => {
    const csv = `Operation type,Date,Account,Category,Subcategory,Amount,Currency,Amount_dop,Currency_dop,Comment
Expense,20250115,Card,Shopping,,100,Br,25,USD,Multicurrency`

    const result = parseBudgetOkCSV(csv)

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].amount).toBe(100)
    expect(result.rows[0].currency).toBe('Br')
    expect(result.rows[0].amountDop).toBe(25)
    expect(result.rows[0].currencyDop).toBe('USD')
  })

  it('handles quoted comments with commas', () => {
    const csv = `Operation type,Date,Account,Category,Subcategory,Amount,Currency,Amount_dop,Currency_dop,Comment
Income,20250115,Wallet,Salary,,100,USD,,,"Lunch, coffee, snacks"`

    const result = parseBudgetOkCSV(csv)

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].comment).toBe('Lunch, coffee, snacks')
  })

  it('handles quoted comments with newlines', () => {
    const csv = `Operation type,Date,Account,Category,Subcategory,Amount,Currency,Amount_dop,Currency_dop,Comment
Income,20250115,Wallet,Salary,,100,USD,,,"Line 1
Line 2"`

    const result = parseBudgetOkCSV(csv)

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].comment).toContain('Line 1')
    expect(result.rows[0].comment).toContain('Line 2')
  })

  it('handles escaped quotes in comments', () => {
    const csv = `Operation type,Date,Account,Category,Subcategory,Amount,Currency,Amount_dop,Currency_dop,Comment
Income,20250115,Wallet,Salary,,100,USD,,,"He said ""hello"""`

    const result = parseBudgetOkCSV(csv)

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].comment).toBe('He said "hello"')
  })

  it('handles category with commas (unquoted)', () => {
    const csv = `Operation type,Date,Account,Category,Subcategory,Amount,Currency,Amount_dop,Currency_dop,Comment
Expense,20250115,Cash,Такси, машина,,50,USD,,,Taxi ride`

    const result = parseBudgetOkCSV(csv)

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].category).toBe('Такси, машина')
  })

  it('extracts unique accounts with currencies', () => {
    const csv = `Operation type,Date,Account,Category,Subcategory,Amount,Currency,Amount_dop,Currency_dop,Comment
Income,20250115,Wallet,Salary,,100,USD,,,
Income,20250116,Wallet,Salary,,50,EUR,,,
Expense,20250117,Card,Food,,25,USD,,,`

    const result = parseBudgetOkCSV(csv)

    expect(result.uniqueAccounts).toHaveLength(2)
    const wallet = result.uniqueAccounts.find((a) => a.name === 'Wallet')
    expect(wallet?.currency).toBe('USD')
    const card = result.uniqueAccounts.find((a) => a.name === 'Card')
    expect(card?.currency).toBe('USD')
  })

  it('extracts unique expense categories', () => {
    const csv = `Operation type,Date,Account,Category,Subcategory,Amount,Currency,Amount_dop,Currency_dop,Comment
Expense,20250115,Cash,Food,,50,USD,,,
Expense,20250116,Cash,Transport,,25,USD,,,
Expense,20250117,Cash,Food,,10,USD,,,`

    const result = parseBudgetOkCSV(csv)

    expect(result.uniqueCategories).toHaveLength(2)
    expect(result.uniqueCategories).toContain('Food')
    expect(result.uniqueCategories).toContain('Transport')
  })

  it('extracts unique income sources', () => {
    const csv = `Operation type,Date,Account,Category,Subcategory,Amount,Currency,Amount_dop,Currency_dop,Comment
Income,20250115,Wallet,Salary,,100,USD,,,
Income,20250116,Wallet,Freelance,,50,USD,,,`

    const result = parseBudgetOkCSV(csv)

    expect(result.uniqueIncomeSources).toHaveLength(2)
    expect(result.uniqueIncomeSources).toContain('Salary')
    expect(result.uniqueIncomeSources).toContain('Freelance')
  })

  it('extracts transfer destinations as accounts', () => {
    const csv = `Operation type,Date,Account,Category,Subcategory,Amount,Currency,Amount_dop,Currency_dop,Comment
transfer,20250115,Cash,Bank,,100,USD,,,Transfer`

    const result = parseBudgetOkCSV(csv)

    expect(result.uniqueTransferDestinations).toContain('Bank')
    expect(result.uniqueAccounts).toHaveLength(2)
    expect(result.uniqueAccounts.map((a) => a.name)).toContain('Cash')
    expect(result.uniqueAccounts.map((a) => a.name)).toContain('Bank')
  })

  it('counts transaction types correctly', () => {
    const csv = `Operation type,Date,Account,Category,Subcategory,Amount,Currency,Amount_dop,Currency_dop,Comment
Income,20250115,Wallet,Salary,,100,USD,,,
Expense,20250116,Cash,Food,,50,USD,,,
Expense,20250117,Cash,Transport,,25,USD,,,
transfer,20250118,Cash,Bank,,75,USD,,,`

    const result = parseBudgetOkCSV(csv)

    expect(result.counts.income).toBe(1)
    expect(result.counts.expense).toBe(2)
    expect(result.counts.transfer).toBe(1)
    expect(result.counts.total).toBe(4)
  })

  it('handles empty lines', () => {
    const csv = `Operation type,Date,Account,Category,Subcategory,Amount,Currency,Amount_dop,Currency_dop,Comment

Income,20250115,Wallet,Salary,,100,USD,,,

Expense,20250116,Cash,Food,,50,USD,,,`

    const result = parseBudgetOkCSV(csv)

    expect(result.rows).toHaveLength(2)
  })

  it('reports errors for invalid rows', () => {
    const csv = `Operation type,Date,Account,Category,Subcategory,Amount,Currency,Amount_dop,Currency_dop,Comment
InvalidType,20250115,Wallet,Salary,,100,USD,,,Test`

    const result = parseBudgetOkCSV(csv)

    expect(result.rows).toHaveLength(0)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].lineNumber).toBe(2)
    expect(result.errors[0].message).toContain('Invalid operation type')
  })

  it('reports error for invalid date', () => {
    const csv = `Operation type,Date,Account,Category,Subcategory,Amount,Currency,Amount_dop,Currency_dop,Comment
Income,invalid,Wallet,Salary,,100,USD,,,Test`

    const result = parseBudgetOkCSV(csv)

    expect(result.rows).toHaveLength(0)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain('Invalid date')
  })

  it('reports error for invalid amount', () => {
    const csv = `Operation type,Date,Account,Category,Subcategory,Amount,Currency,Amount_dop,Currency_dop,Comment
Income,20250115,Wallet,Salary,,invalid,USD,,,Test`

    const result = parseBudgetOkCSV(csv)

    expect(result.rows).toHaveLength(0)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain('Invalid amount')
  })

  it('handles comma as decimal separator in quoted field', () => {
    const csv = `Operation type,Date,Account,Category,Subcategory,Amount,Currency,Amount_dop,Currency_dop,Comment
Income,20250115,Wallet,Salary,,"100,50",USD,,,Test`

    const result = parseBudgetOkCSV(csv)

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].amount).toBe(100.5)
  })

  it('handles CRLF line endings', () => {
    const csv = `Operation type,Date,Account,Category,Subcategory,Amount,Currency,Amount_dop,Currency_dop,Comment\r\nIncome,20250115,Wallet,Salary,,100,USD,,,Test`

    const result = parseBudgetOkCSV(csv)

    expect(result.rows).toHaveLength(1)
  })
})

describe('validateImportFile', () => {
  it('accepts valid CSV file', () => {
    const file = new File(['test'], 'test.csv', { type: 'text/csv' })
    const error = validateImportFile(file)
    expect(error).toBeNull()
  })

  it('rejects non-CSV file', () => {
    const file = new File(['test'], 'test.txt', { type: 'text/plain' })
    const error = validateImportFile(file)
    expect(error).toBe('File must be a CSV file')
  })

  it('rejects file larger than 5MB', () => {
    const file = new File(['x'.repeat(6 * 1024 * 1024)], 'test.csv', { type: 'text/csv' })
    Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 })
    const error = validateImportFile(file)
    expect(error).toBe('File too large (max 5MB)')
  })

  it('accepts CSV with uppercase extension', () => {
    const file = new File(['test'], 'test.CSV', { type: 'text/csv' })
    const error = validateImportFile(file)
    expect(error).toBeNull()
  })
})
