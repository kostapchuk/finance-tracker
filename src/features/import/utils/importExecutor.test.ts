import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { BudgetOkRow, SourceAccountInfo } from '../types'

import { executeImport, validateMappings } from './importExecutor'

vi.mock('@/database/repositories', () => ({
  transactionRepo: {
    bulkCreate: vi.fn(async (transactions) => transactions.map((_: unknown, i: number) => i)),
  },
  accountRepo: {
    bulkUpdateBalance: vi.fn(),
  },
}))

describe('executeImport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns success result with imported count', async () => {
    const rows: BudgetOkRow[] = [
      {
        operationType: 'Income',
        date: new Date(2025, 0, 15),
        account: 'Wallet',
        category: 'Salary',
        amount: 100,
        currency: 'USD',
        amountDop: null,
        currencyDop: null,
        comment: '',
        lineNumber: 2,
      },
    ]

    const accountMapping = new Map([['Wallet', 1]])
    const categoryMapping = new Map([['Food', 2]])
    const incomeSourceMapping = new Map([['Salary', 3]])
    const accounts = [{ id: 1, currency: 'USD' }]

    const result = await executeImport({
      rows,
      accountMapping,
      categoryMapping,
      incomeSourceMapping,
      accounts,
    })

    expect(result.success).toBe(true)
    expect(result.importedCount).toBe(1)
  })

  it('handles empty rows', async () => {
    const result = await executeImport({
      rows: [],
      accountMapping: new Map(),
      categoryMapping: new Map(),
      incomeSourceMapping: new Map(),
      accounts: [],
    })

    expect(result.success).toBe(true)
    expect(result.importedCount).toBe(0)
  })

  it('processes expense transactions', async () => {
    const rows: BudgetOkRow[] = [
      {
        operationType: 'Expense',
        date: new Date(2025, 0, 15),
        account: 'Cash',
        category: 'Food',
        amount: 50,
        currency: 'USD',
        amountDop: null,
        currencyDop: null,
        comment: 'Groceries',
        lineNumber: 2,
      },
    ]

    const accountMapping = new Map([['Cash', 1]])
    const categoryMapping = new Map([['Food', 2]])
    const incomeSourceMapping = new Map()
    const accounts = [{ id: 1, currency: 'USD' }]

    const result = await executeImport({
      rows,
      accountMapping,
      categoryMapping,
      incomeSourceMapping,
      accounts,
    })

    expect(result.success).toBe(true)
    expect(result.importedCount).toBe(1)
  })

  it('processes transfer transactions', async () => {
    const rows: BudgetOkRow[] = [
      {
        operationType: 'transfer',
        date: new Date(2025, 0, 15),
        account: 'Cash',
        category: 'Bank',
        amount: 100,
        currency: 'USD',
        amountDop: null,
        currencyDop: null,
        comment: 'Transfer',
        lineNumber: 2,
      },
    ]

    const accountMapping = new Map([
      ['Cash', 1],
      ['Bank', 2],
    ])
    const categoryMapping = new Map()
    const incomeSourceMapping = new Map()
    const accounts = [
      { id: 1, currency: 'USD' },
      { id: 2, currency: 'USD' },
    ]

    const result = await executeImport({
      rows,
      accountMapping,
      categoryMapping,
      incomeSourceMapping,
      accounts,
    })

    expect(result.success).toBe(true)
    expect(result.importedCount).toBe(1)
  })

  it('processes batch of 100+ transactions', async () => {
    const rows: BudgetOkRow[] = Array.from({ length: 150 }, (_, i) => ({
      operationType: 'Expense' as const,
      date: new Date(2025, 0, (i % 28) + 1),
      account: 'Cash',
      category: 'Food',
      amount: 10 + i,
      currency: 'USD',
      amountDop: null,
      currencyDop: null,
      comment: `Expense ${i + 1}`,
      lineNumber: i + 2,
    }))

    const accountMapping = new Map([['Cash', 1]])
    const categoryMapping = new Map([['Food', 2]])
    const incomeSourceMapping = new Map()
    const accounts = [{ id: 1, currency: 'USD' }]

    const result = await executeImport({
      rows,
      accountMapping,
      categoryMapping,
      incomeSourceMapping,
      accounts,
    })

    expect(result.success).toBe(true)
    expect(result.importedCount).toBe(150)
  })

  it('handles multi-currency with amountDop matching account currency', async () => {
    const rows: BudgetOkRow[] = [
      {
        operationType: 'Income',
        date: new Date(2025, 0, 15),
        account: 'Card',
        category: 'Salary',
        amount: 100,
        currency: 'EUR',
        amountDop: 110,
        currencyDop: 'USD',
        comment: '',
        lineNumber: 2,
      },
    ]

    const accountMapping = new Map([['Card', 1]])
    const categoryMapping = new Map()
    const incomeSourceMapping = new Map([['Salary', 3]])
    const accounts = [{ id: 1, currency: 'USD' }]

    const result = await executeImport({
      rows,
      accountMapping,
      categoryMapping,
      incomeSourceMapping,
      accounts,
    })

    expect(result.success).toBe(true)
    expect(result.importedCount).toBe(1)
  })

  it('returns error on exception', async () => {
    const rows: BudgetOkRow[] = [
      {
        operationType: 'Income',
        date: new Date(2025, 0, 15),
        account: 'MissingAccount',
        category: 'Salary',
        amount: 100,
        currency: 'USD',
        amountDop: null,
        currencyDop: null,
        comment: '',
        lineNumber: 2,
      },
    ]

    const accountMapping = new Map()
    const categoryMapping = new Map()
    const incomeSourceMapping = new Map([['Salary', 3]])
    const accounts = [{ id: 1, currency: 'USD' }]

    const result = await executeImport({
      rows,
      accountMapping,
      categoryMapping,
      incomeSourceMapping,
      accounts,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

describe('validateMappings', () => {
  it('returns null when all mappings are complete', () => {
    const parsedData = {
      uniqueAccounts: [{ name: 'Wallet', currency: 'USD' }] as SourceAccountInfo[],
      uniqueCategories: ['Food'],
      uniqueIncomeSources: ['Salary'],
    }
    const accountMapping = new Map([['Wallet', 1]])
    const categoryMapping = new Map([['Food', 2]])
    const incomeSourceMapping = new Map([['Salary', 3]])

    const result = validateMappings(
      parsedData,
      accountMapping,
      categoryMapping,
      incomeSourceMapping
    )

    expect(result).toBeNull()
  })

  it('returns error for unmapped accounts', () => {
    const parsedData = {
      uniqueAccounts: [{ name: 'Wallet', currency: 'USD' }] as SourceAccountInfo[],
      uniqueCategories: [],
      uniqueIncomeSources: [],
    }
    const accountMapping = new Map()
    const categoryMapping = new Map()
    const incomeSourceMapping = new Map()

    const result = validateMappings(
      parsedData,
      accountMapping,
      categoryMapping,
      incomeSourceMapping
    )

    expect(result).toContain('Unmapped accounts')
    expect(result).toContain('Wallet')
  })

  it('returns error for unmapped categories', () => {
    const parsedData = {
      uniqueAccounts: [{ name: 'Wallet', currency: 'USD' }] as SourceAccountInfo[],
      uniqueCategories: ['Food', 'Transport'],
      uniqueIncomeSources: [],
    }
    const accountMapping = new Map([['Wallet', 1]])
    const categoryMapping = new Map([['Food', 2]])
    const incomeSourceMapping = new Map()

    const result = validateMappings(
      parsedData,
      accountMapping,
      categoryMapping,
      incomeSourceMapping
    )

    expect(result).toContain('Unmapped categories')
    expect(result).toContain('Transport')
    expect(result).not.toContain('Food')
  })

  it('returns error for unmapped income sources', () => {
    const parsedData = {
      uniqueAccounts: [{ name: 'Wallet', currency: 'USD' }] as SourceAccountInfo[],
      uniqueCategories: [],
      uniqueIncomeSources: ['Salary'],
    }
    const accountMapping = new Map([['Wallet', 1]])
    const categoryMapping = new Map()
    const incomeSourceMapping = new Map()

    const result = validateMappings(
      parsedData,
      accountMapping,
      categoryMapping,
      incomeSourceMapping
    )

    expect(result).toContain('Unmapped income sources')
    expect(result).toContain('Salary')
  })

  it('returns multiple errors when applicable', () => {
    const parsedData = {
      uniqueAccounts: [{ name: 'Wallet', currency: 'USD' }] as SourceAccountInfo[],
      uniqueCategories: ['Food'],
      uniqueIncomeSources: ['Salary'],
    }
    const accountMapping = new Map()
    const categoryMapping = new Map()
    const incomeSourceMapping = new Map()

    const result = validateMappings(
      parsedData,
      accountMapping,
      categoryMapping,
      incomeSourceMapping
    )

    expect(result).toContain('Unmapped accounts')
    expect(result).toContain('Unmapped categories')
    expect(result).toContain('Unmapped income sources')
  })
})
