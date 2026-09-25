import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { NoSpendDaysCard } from './NoSpendDaysCard'

import type { AppVisit, Transaction } from '@/database/types'

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ language: 'ru', setLanguage: () => {}, t: (key: string) => key }),
}))

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ mainCurrency: 'USD' }),
}))

let nextId = 1

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: nextId++,
    type: 'expense',
    amount: 10,
    currency: 'USD',
    date: new Date('2026-03-01'),
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-01'),
    ...overrides,
  }
}

function makeVisit(date: Date): AppVisit {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return { id: nextId++, date: `${year}-${month}-${day}`, createdAt: date }
}

describe('NoSpendDaysCard', () => {
  it('shows the no-spend day count for the selected month', () => {
    const transactions = [
      makeTransaction({ date: new Date(2026, 2, 5) }),
      makeTransaction({ date: new Date(2026, 2, 5) }),
      makeTransaction({ type: 'loan_payment', amount: 500, date: new Date(2026, 2, 6) }),
    ]

    render(
      <NoSpendDaysCard
        transactions={transactions}
        appVisits={[]}
        selectedMonth={new Date(2026, 2, 15)}
      />
    )

    // Full March has 31 days, only Mar 5 is a real-expense day -> 30 no-spend days.
    expect(screen.getByText('30 / 31')).toBeInTheDocument()
  })

  it('surfaces the biggest spending day and the busiest day for the month', () => {
    const transactions = [
      makeTransaction({ amount: 500, date: new Date(2026, 2, 12) }),
      makeTransaction({ amount: 5, date: new Date(2026, 2, 5) }),
      makeTransaction({ amount: 5, date: new Date(2026, 2, 5) }),
      makeTransaction({ amount: 5, date: new Date(2026, 2, 5) }),
    ]

    render(
      <NoSpendDaysCard
        transactions={transactions}
        appVisits={[]}
        selectedMonth={new Date(2026, 2, 15)}
      />
    )

    expect(screen.getByText('biggestSpendingDay')).toBeInTheDocument()
    expect(screen.getByText('mostTransactionsDay')).toBeInTheDocument()
  })

  it('does not show spending highlights when the month has no expenses', () => {
    render(
      <NoSpendDaysCard transactions={[]} appVisits={[]} selectedMonth={new Date(2026, 2, 15)} />
    )

    expect(screen.queryByText('biggestSpendingDay')).not.toBeInTheDocument()
    expect(screen.queryByText('mostTransactionsDay')).not.toBeInTheDocument()
  })

  it('shows the no-data hint when a tracked day has no visit or transaction evidence', () => {
    const today = new Date(2026, 2, 20)
    // Tracking starts Mar 1 via a visit; Mar 10 is a gap with no visit/transaction.
    const appVisits = [makeVisit(new Date(2026, 2, 1)), makeVisit(today)]

    render(
      <NoSpendDaysCard
        transactions={[]}
        appVisits={appVisits}
        selectedMonth={new Date(2026, 2, 15)}
        today={today}
      />
    )

    expect(screen.getByText('noDataDaysHint')).toBeInTheDocument()
  })

  it('does not show the no-data hint when every evaluated day has evidence', () => {
    const today = new Date(2026, 2, 3)
    const appVisits = [
      makeVisit(new Date(2026, 2, 1)),
      makeVisit(new Date(2026, 2, 2)),
      makeVisit(today),
    ]

    render(
      <NoSpendDaysCard
        transactions={[]}
        appVisits={appVisits}
        selectedMonth={new Date(2026, 2, 15)}
        today={today}
      />
    )

    expect(screen.queryByText('noDataDaysHint')).not.toBeInTheDocument()
  })
})
