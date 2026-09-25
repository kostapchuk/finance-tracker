import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { NoSpendDaysCard } from './NoSpendDaysCard'

import type { Transaction } from '@/database/types'

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

describe('NoSpendDaysCard', () => {
  it('shows the no-spend day count for the selected month', () => {
    const transactions = [
      makeTransaction({ date: new Date(2026, 2, 5) }),
      makeTransaction({ date: new Date(2026, 2, 5) }),
      makeTransaction({ type: 'loan_payment', amount: 500, date: new Date(2026, 2, 6) }),
    ]

    render(<NoSpendDaysCard transactions={transactions} selectedMonth={new Date(2026, 2, 15)} />)

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

    render(<NoSpendDaysCard transactions={transactions} selectedMonth={new Date(2026, 2, 15)} />)

    expect(screen.getByText('biggestSpendingDay')).toBeInTheDocument()
    expect(screen.getByText('mostTransactionsDay')).toBeInTheDocument()
  })

  it('does not show spending highlights when the month has no expenses', () => {
    render(<NoSpendDaysCard transactions={[]} selectedMonth={new Date(2026, 2, 15)} />)

    expect(screen.queryByText('biggestSpendingDay')).not.toBeInTheDocument()
    expect(screen.queryByText('mostTransactionsDay')).not.toBeInTheDocument()
  })
})
