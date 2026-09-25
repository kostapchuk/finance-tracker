import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { BudgetOkRow } from '../types'

import { executeImport, validateMappings } from './importExecutor'

import { db } from '@/database/db'

let usdId: number
let bynId: number

function row(overrides: Partial<BudgetOkRow>): BudgetOkRow {
  return {
    operationType: 'Expense',
    date: new Date(2026, 0, 10, 12),
    account: 'Dollars',
    category: 'Food',
    amount: 10,
    currency: '$',
    amountDop: undefined,
    currencyDop: undefined,
    comment: '',
    lineNumber: 2,
    ...overrides,
  }
}

async function addAccount(name: string, currency: string): Promise<number> {
  const now = new Date()
  const id = await db.accounts.add({
    name,
    type: 'cash',
    currency,
    balance: 100,
    color: '#000',
    createdAt: now,
    updatedAt: now,
  })
  if (id === undefined) throw new Error('expected an id')
  return id
}

async function balanceOf(id: number): Promise<number | undefined> {
  const account = await db.accounts.get(id)
  return account?.balance
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  usdId = await addAccount('Dollars', '$')
  bynId = await addAccount('Rubles', 'Br')
})

afterEach(() => {
  vi.restoreAllMocks()
})

function run(rows: BudgetOkRow[]) {
  return executeImport({
    rows,
    accountMapping: new Map([
      ['Dollars', usdId],
      ['Rubles', bynId],
    ]),
    categoryMapping: new Map([['Food', 7]]),
    incomeSourceMapping: new Map([['Salary', 3]]),
    accounts: [
      { id: usdId, currency: '$' },
      { id: bynId, currency: 'Br' },
      { currency: 'ignored' },
    ],
  })
}

describe('executeImport', () => {
  it('imports income and expenses and updates balances', async () => {
    const result = await run([
      row({ operationType: 'Income', category: 'Salary', amount: 50, comment: 'pay' }),
      row({ amount: 20 }),
    ])

    expect(result).toEqual({ success: true, importedCount: 2 })
    await expect(balanceOf(usdId)).resolves.toBe(130)

    const transactions = await db.transactions.toArray()
    expect(transactions).toEqual([
      expect.objectContaining({
        type: 'income',
        amount: 50,
        currency: '$',
        accountId: usdId,
        incomeSourceId: 3,
        comment: 'pay',
      }),
      expect.objectContaining({
        type: 'expense',
        amount: 20,
        accountId: usdId,
        categoryId: 7,
        comment: undefined,
      }),
    ])
  })

  it('uses the secondary amount when it matches the account currency', async () => {
    await run([
      row({ account: 'Rubles', amount: 10, currency: '$', amountDop: 33, currencyDop: 'br' }),
    ])

    await expect(balanceOf(bynId)).resolves.toBe(67)
  })

  it('falls back to the primary amount when no currency matches', async () => {
    await run([
      row({ account: 'Rubles', amount: 10, currency: '€', amountDop: 12, currencyDop: '£' }),
    ])

    await expect(balanceOf(bynId)).resolves.toBe(90)
  })

  it('imports a cross-currency transfer with a destination amount', async () => {
    await run([
      row({
        operationType: 'transfer',
        account: 'Dollars',
        category: 'Rubles',
        amount: 10,
        currency: '$',
        amountDop: 30,
        currencyDop: 'Br',
      }),
    ])

    await expect(balanceOf(usdId)).resolves.toBe(90)
    await expect(balanceOf(bynId)).resolves.toBe(130)
    const [transfer] = await db.transactions.toArray()
    expect(transfer).toMatchObject({
      type: 'transfer',
      accountId: usdId,
      toAccountId: bynId,
      amount: 10,
      toAmount: 30,
    })
  })

  it('omits toAmount for a same-currency transfer', async () => {
    const otherUsd = await addAccount('Savings', '$')
    const result = await executeImport({
      rows: [row({ operationType: 'transfer', category: 'Savings', amount: 25 })],
      accountMapping: new Map([
        ['Dollars', usdId],
        ['Savings', otherUsd],
      ]),
      categoryMapping: new Map(),
      incomeSourceMapping: new Map(),
      accounts: [
        { id: usdId, currency: '$' },
        { id: otherUsd, currency: '$' },
      ],
    })

    expect(result.success).toBe(true)
    await expect(balanceOf(otherUsd)).resolves.toBe(125)
    const [transfer] = await db.transactions.toArray()
    expect(transfer.toAmount).toBeUndefined()
  })

  it.each([
    ['uses amountDop when the destination currency is unknown', 40, '€', 40],
    ['uses amount when there is no amountDop', undefined, undefined, 10],
  ])('transfer %s', async (_name, amountDop, currencyDop, expected) => {
    await run([
      row({
        operationType: 'transfer',
        account: 'Dollars',
        category: 'Rubles',
        amount: 10,
        currency: '£',
        amountDop,
        currencyDop,
      }),
    ])

    await expect(balanceOf(bynId)).resolves.toBe(100 + expected)
  })

  it('transfers the primary amount when the destination shares its currency', async () => {
    await run([
      row({
        operationType: 'transfer',
        account: 'Dollars',
        category: 'Rubles',
        amount: 10,
        currency: 'Br',
        amountDop: 3,
        currencyDop: '$',
      }),
    ])

    await expect(balanceOf(usdId)).resolves.toBe(97)
    await expect(balanceOf(bynId)).resolves.toBe(110)
  })

  it('skips balance updates that net to zero', async () => {
    const modify = vi.spyOn(db.accounts, 'where')

    await run([row({ operationType: 'Income', category: 'Salary', amount: 5 }), row({ amount: 5 })])

    expect(modify).not.toHaveBeenCalled()
    await expect(balanceOf(usdId)).resolves.toBe(100)
  })

  it('reports failures without writing anything', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(db.transactions, 'bulkAdd').mockRejectedValue(new Error('disk full'))

    const result = await run([row({})])

    expect(result).toEqual({ success: false, importedCount: 0, error: 'disk full' })
    await expect(balanceOf(usdId)).resolves.toBe(100)
  })

  it('uses a generic message for non-Error failures', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(db.transactions, 'bulkAdd').mockRejectedValue('nope')

    const result = await run([row({})])

    expect(result.error).toBe('Import failed')
  })
})

describe('validateMappings', () => {
  const parsed = {
    uniqueAccounts: [
      { name: 'Wallet', currency: '$' },
      { name: 'Card', currency: '$' },
    ],
    uniqueCategories: ['Food'],
    uniqueIncomeSources: ['Salary'],
  }

  it('returns undefined when everything is mapped', () => {
    expect(
      validateMappings(
        parsed,
        new Map([
          ['Wallet', 1],
          ['Card', 2],
        ]),
        new Map([['Food', 1]]),
        new Map([['Salary', 1]])
      )
    ).toBeUndefined()
  })

  it('lists every unmapped item, one kind per line', () => {
    expect(validateMappings(parsed, new Map([['Wallet', 1]]), new Map(), new Map())).toBe(
      'Unmapped accounts: Card\nUnmapped categories: Food\nUnmapped income sources: Salary'
    )
  })
})
