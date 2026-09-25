import { describe, expect, it } from 'vitest'

import { calculateFlows } from './transactionFlows'

import type { Loan, Transaction } from '@/database/types'

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

function makeLoan(overrides: Partial<Loan>): Loan {
  return {
    id: 1,
    type: 'given',
    personName: 'John',
    amount: 500,
    currency: 'USD',
    paidAmount: 0,
    status: 'active',
    createdAt: new Date(2026, 8, 1),
    updatedAt: new Date(2026, 8, 1),
    ...overrides,
  }
}

describe('calculateFlows', () => {
  it('returns zeros for an empty list', () => {
    expect(calculateFlows([], [], 'USD')).toEqual({ inflows: 0, outflows: 0, net: 0 })
  })

  it('counts income as inflow and expense as outflow', () => {
    const result = calculateFlows(
      [makeTx({ type: 'income', amount: 1000 }), makeTx({ type: 'expense', amount: 300 })],
      [],
      'USD'
    )

    expect(result).toEqual({ inflows: 1000, outflows: 300, net: 700 })
  })

  it('counts a received loan as income and a given loan as expense', () => {
    const result = calculateFlows(
      [makeTx({ type: 'loan_received', amount: 500 }), makeTx({ type: 'loan_given', amount: 200 })],
      [],
      'USD'
    )

    expect(result).toEqual({ inflows: 500, outflows: 200, net: 300 })
  })

  it('counts repayment of a given loan as income', () => {
    const loans = [makeLoan({ id: 1, type: 'given' })]

    const result = calculateFlows(
      [makeTx({ type: 'loan_payment', amount: 150, loanId: 1 })],
      loans,
      'USD'
    )

    expect(result).toEqual({ inflows: 150, outflows: 0, net: 150 })
  })

  it('counts a payment on a received loan as expense', () => {
    const loans = [makeLoan({ id: 2, type: 'received' })]

    const result = calculateFlows(
      [makeTx({ type: 'loan_payment', amount: 80, loanId: 2 })],
      loans,
      'USD'
    )

    expect(result).toEqual({ inflows: 0, outflows: 80, net: -80 })
  })

  it('ignores a loan payment whose loan is missing', () => {
    const result = calculateFlows(
      [makeTx({ type: 'loan_payment', amount: 50, loanId: 99 })],
      [],
      'USD'
    )

    expect(result).toEqual({ inflows: 0, outflows: 0, net: 0 })
  })

  it('ignores transfers', () => {
    const result = calculateFlows(
      [makeTx({ type: 'transfer', amount: 100, toAmount: 100 })],
      [],
      'USD'
    )

    expect(result).toEqual({ inflows: 0, outflows: 0, net: 0 })
  })

  it('prefers mainCurrencyAmount over amount when present', () => {
    const loans = [makeLoan({ id: 1, type: 'given' })]

    const result = calculateFlows(
      [
        makeTx({ type: 'expense', amount: 10, currency: 'EUR', mainCurrencyAmount: 12 }),
        makeTx({ type: 'loan_given', amount: 20, currency: 'EUR', mainCurrencyAmount: 25 }),
        makeTx({ type: 'income', amount: 100, currency: 'EUR', mainCurrencyAmount: 110 }),
        makeTx({
          type: 'loan_payment',
          amount: 40,
          currency: 'EUR',
          mainCurrencyAmount: 45,
          loanId: 1,
        }),
      ],
      loans,
      'USD'
    )

    expect(result).toEqual({ inflows: 155, outflows: 37, net: 118 })
  })

  it('reports a negative net when outflows exceed inflows', () => {
    const result = calculateFlows(
      [makeTx({ type: 'income', amount: 100 }), makeTx({ type: 'loan_given', amount: 400 })],
      [],
      'USD'
    )

    expect(result.net).toBe(-300)
  })

  it('skips a transaction in a different currency with no mainCurrencyAmount', () => {
    const result = calculateFlows(
      [
        makeTx({ type: 'income', amount: 1000, currency: 'USD' }),
        makeTx({ type: 'expense', amount: 300, currency: 'EUR', mainCurrencyAmount: undefined }),
      ],
      [],
      'USD'
    )

    expect(result).toEqual({ inflows: 1000, outflows: 0, net: 1000 })
  })
})
