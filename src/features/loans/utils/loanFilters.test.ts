import { describe, expect, it } from 'vitest'

import { filterCompletedLoansByMonth, getLastPaymentDate } from './loanFilters'

import type { Loan, Transaction } from '@/database/types'

function makeLoan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: 1,
    type: 'given',
    personName: 'Alex',
    amount: 100,
    currency: 'USD',
    paidAmount: 100,
    status: 'fully_paid',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

function makePayment(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 1,
    type: 'loan_payment',
    amount: 50,
    currency: 'USD',
    date: new Date('2026-01-01'),
    loanId: 1,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

describe('getLastPaymentDate', () => {
  it('returns the date of the most recent loan_payment transaction for the loan', () => {
    const loan = makeLoan({ id: 1, updatedAt: new Date('2026-03-01') })
    const transactions = [
      makePayment({ id: 1, loanId: 1, date: new Date('2026-02-10') }),
      makePayment({ id: 2, loanId: 1, date: new Date('2026-02-20') }),
      makePayment({ id: 3, loanId: 2, date: new Date('2026-02-28') }), // different loan
    ]

    expect(getLastPaymentDate(loan, transactions)).toEqual(new Date('2026-02-20'))
  })

  it('falls back to the loan updatedAt when there are no payment transactions', () => {
    const loan = makeLoan({ id: 1, updatedAt: new Date('2026-03-05') })

    expect(getLastPaymentDate(loan, [])).toEqual(new Date('2026-03-05'))
  })

  it('ignores the loan_given/loan_received origination transaction', () => {
    const loan = makeLoan({ id: 1, updatedAt: new Date('2026-01-01') })
    const transactions = [
      {
        ...makePayment({ id: 1, loanId: 1, date: new Date('2026-01-15') }),
        type: 'loan_given' as const,
      },
    ]

    expect(getLastPaymentDate(loan, transactions)).toEqual(new Date('2026-01-01'))
  })
})

describe('filterCompletedLoansByMonth', () => {
  it('keeps only loans last paid within the given range, newest first', () => {
    const loanInMonth = makeLoan({ id: 1, personName: 'InMonth' })
    const loanOutsideMonth = makeLoan({ id: 2, personName: 'OutsideMonth' })
    const loanEarlierInMonth = makeLoan({ id: 3, personName: 'EarlierInMonth' })

    const transactions = [
      makePayment({ id: 1, loanId: 1, date: new Date('2026-02-20') }),
      makePayment({ id: 2, loanId: 2, date: new Date('2026-03-05') }),
      makePayment({ id: 3, loanId: 3, date: new Date('2026-02-05') }),
    ]

    const result = filterCompletedLoansByMonth(
      [loanInMonth, loanOutsideMonth, loanEarlierInMonth],
      transactions,
      new Date('2026-02-01'),
      new Date('2026-02-28T23:59:59.999')
    )

    expect(result.map((l) => l.personName)).toEqual(['InMonth', 'EarlierInMonth'])
  })

  it('returns an empty array when no completed loans fall in the range', () => {
    const loan = makeLoan({ id: 1 })
    const transactions = [makePayment({ id: 1, loanId: 1, date: new Date('2026-01-01') })]

    const result = filterCompletedLoansByMonth(
      [loan],
      transactions,
      new Date('2026-02-01'),
      new Date('2026-02-28T23:59:59.999')
    )

    expect(result).toEqual([])
  })
})
