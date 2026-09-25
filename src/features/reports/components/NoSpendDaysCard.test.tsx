import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { NoSpendDaysCard } from './NoSpendDaysCard'

import type { AppVisit, Transaction } from '@/database/types'

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ language: 'ru', setLanguage: () => {}, t: (key: string) => key }),
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
    const today = new Date(2026, 2, 31)
    // A visit every day establishes evidence for the whole month.
    const appVisits = Array.from({ length: 31 }, (_, i) => makeVisit(new Date(2026, 2, i + 1)))
    const transactions = [makeTransaction({ date: new Date(2026, 2, 5) })]

    render(
      <NoSpendDaysCard
        transactions={transactions}
        appVisits={appVisits}
        selectedMonth={new Date(2026, 2, 15)}
        today={today}
      />
    )

    // Full March has 31 days, only Mar 5 is a real-expense day -> 30 no-spend days.
    expect(screen.getByText('30 noSpendDaysInMonth')).toBeInTheDocument()
  })

  it('does not credit a day as no-spend when there is no visit or transaction evidence for it', () => {
    const today = new Date(2026, 2, 31)

    render(
      <NoSpendDaysCard
        transactions={[]}
        appVisits={[]}
        selectedMonth={new Date(2026, 2, 15)}
        today={today}
      />
    )

    // No visits and no transactions anywhere -> nothing can be credited as no-spend.
    expect(screen.getByText('0 noSpendDaysInMonth')).toBeInTheDocument()
  })

  it('shows the no-data hint when a day has no visit or transaction evidence', () => {
    const today = new Date(2026, 2, 20)
    const appVisits = [makeVisit(new Date(2026, 2, 10)), makeVisit(today)]

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
