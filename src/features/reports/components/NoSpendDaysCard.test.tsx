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

function getDayCell(container: HTMLElement, dayNumber: number): Element {
  const cells = [...container.querySelectorAll('.aspect-square')]
  const cell = cells.find((c) => c.textContent === String(dayNumber))
  if (!cell) throw new Error(`Day cell ${dayNumber} not found`)
  return cell
}

describe('NoSpendDaysCard', () => {
  it('shows the calendar title', () => {
    render(
      <NoSpendDaysCard
        transactions={[]}
        appVisits={[]}
        selectedMonth={new Date(2026, 2, 15)}
        today={new Date(2026, 2, 15)}
      />
    )

    expect(screen.getByText('spendingCalendarTitle')).toBeInTheDocument()
  })

  it('colors a visited day with no expense green', () => {
    const today = new Date(2026, 2, 31)
    const appVisits = Array.from({ length: 31 }, (_, i) => makeVisit(new Date(2026, 2, i + 1)))

    const { container } = render(
      <NoSpendDaysCard
        transactions={[]}
        appVisits={appVisits}
        selectedMonth={new Date(2026, 2, 15)}
        today={today}
      />
    )

    expect(getDayCell(container, 10).className).toContain('bg-success')
  })

  it('colors a day with a real expense red', () => {
    const today = new Date(2026, 2, 31)
    const appVisits = Array.from({ length: 31 }, (_, i) => makeVisit(new Date(2026, 2, i + 1)))
    const transactions = [makeTransaction({ date: new Date(2026, 2, 5) })]

    const { container } = render(
      <NoSpendDaysCard
        transactions={transactions}
        appVisits={appVisits}
        selectedMonth={new Date(2026, 2, 15)}
        today={today}
      />
    )

    expect(getDayCell(container, 5).className).toContain('bg-destructive')
  })

  it('colors a day gray when there is no visit or transaction evidence for it', () => {
    const today = new Date(2026, 2, 31)

    const { container } = render(
      <NoSpendDaysCard
        transactions={[]}
        appVisits={[]}
        selectedMonth={new Date(2026, 2, 15)}
        today={today}
      />
    )

    const cell = getDayCell(container, 10)
    expect(cell.className).toContain('bg-secondary/30')
    expect(cell.className).not.toContain('bg-success')
    expect(cell.className).not.toContain('bg-destructive')
  })

  it('colors a future day gray, the same as a no-data day', () => {
    const today = new Date(2026, 2, 10)

    const { container } = render(
      <NoSpendDaysCard
        transactions={[]}
        appVisits={[]}
        selectedMonth={new Date(2026, 2, 15)}
        today={today}
      />
    )

    expect(getDayCell(container, 20).className).toContain('bg-secondary/30')
  })
})
