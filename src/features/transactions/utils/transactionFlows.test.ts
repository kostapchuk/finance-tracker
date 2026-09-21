import { describe, expect, it } from 'vitest'

import { calculateFlows } from './transactionFlows'

import type { Transaction } from '@/database/types'

function makeTx(overrides: Partial<Transaction>): Transaction {
  return {
    type: 'expense',
    amount: 0,
    currency: 'USD',
    date: new Date(2026, 8, 14),
    createdAt: new Date(2026, 8, 14),
    updatedAt: new Date(2026, 8, 14),
    ...overrides,
  }
}

describe('calculateFlows', () => {
  it('returns zeros for an empty list', () => {
    expect(calculateFlows([])).toEqual({ inflows: 0, outflows: 0, net: 0 })
  })

  it('counts income as inflow and expense as outflow', () => {
    const result = calculateFlows([
      makeTx({ type: 'income', amount: 1000 }),
      makeTx({ type: 'expense', amount: 300 }),
    ])

    expect(result).toEqual({ inflows: 1000, outflows: 300, net: 700 })
  })

  it('counts a received loan as income and a given loan as expense', () => {
    const result = calculateFlows([
      makeTx({ type: 'loan_received', amount: 500 }),
      makeTx({ type: 'loan_given', amount: 200 }),
    ])

    expect(result).toEqual({ inflows: 500, outflows: 200, net: 300 })
  })

  it('ignores transfers and loan payments', () => {
    const result = calculateFlows([
      makeTx({ type: 'transfer', amount: 100, toAmount: 100 }),
      makeTx({ type: 'loan_payment', amount: 50 }),
    ])

    expect(result).toEqual({ inflows: 0, outflows: 0, net: 0 })
  })

  it('prefers mainCurrencyAmount over amount when present', () => {
    const result = calculateFlows([
      makeTx({ type: 'expense', amount: 10, currency: 'EUR', mainCurrencyAmount: 12 }),
      makeTx({ type: 'loan_given', amount: 20, currency: 'EUR', mainCurrencyAmount: 25 }),
      makeTx({ type: 'income', amount: 100, currency: 'EUR', mainCurrencyAmount: 110 }),
    ])

    expect(result).toEqual({ inflows: 110, outflows: 37, net: 73 })
  })

  it('reports a negative net when outflows exceed inflows', () => {
    const result = calculateFlows([
      makeTx({ type: 'income', amount: 100 }),
      makeTx({ type: 'loan_given', amount: 400 }),
    ])

    expect(result.net).toBe(-300)
  })
})
