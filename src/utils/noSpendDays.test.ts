import { describe, expect, it } from 'vitest'

import { computeMonthNoSpendStats } from './noSpendDays'

import type { AppVisit, Transaction } from '@/database/types'

let nextId = 1

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: nextId++,
    type: 'expense',
    amount: 10,
    currency: 'USD',
    date: new Date('2026-01-01'),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

function makeVisit(date: Date): AppVisit {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return { id: nextId++, date: `${year}-${month}-${day}`, createdAt: date }
}

describe('computeMonthNoSpendStats', () => {
  it('marks days with a real expense as spend and visited days without one as no-spend', () => {
    const today = new Date(2026, 2, 31) // Mar 31, 2026 (full past month)
    // A visit every day establishes evidence for the whole month.
    const appVisits = Array.from({ length: 31 }, (_, i) => makeVisit(new Date(2026, 2, i + 1)))
    const transactions = [
      makeTransaction({ type: 'expense', date: new Date(2026, 2, 5) }),
      makeTransaction({ type: 'expense', date: new Date(2026, 2, 6) }),
      makeTransaction({ type: 'income', date: new Date(2026, 2, 10) }),
      makeTransaction({ type: 'loan_given', date: new Date(2026, 2, 11) }),
      makeTransaction({ type: 'loan_payment', date: new Date(2026, 2, 12) }),
      makeTransaction({ type: 'transfer', date: new Date(2026, 2, 13) }),
    ]

    const stats = computeMonthNoSpendStats(transactions, appVisits, new Date(2026, 2, 1), today)

    expect(stats.days).toHaveLength(31)
    // Only Mar 5 and Mar 6 are 'spend' days; loans/income/transfers don't count.
    expect(stats.noSpendCount).toBe(29)
    const spendDates = stats.days.filter((d) => d.status === 'spend').map((d) => d.date.getDate())
    expect(spendDates).toEqual([5, 6])
  })

  it('treats days after "today" as future', () => {
    const today = new Date(2026, 2, 10) // Mar 10, 2026
    const stats = computeMonthNoSpendStats([], [], new Date(2026, 2, 1), today)

    expect(stats.days.filter((d) => d.status === 'future')).toHaveLength(21)
  })

  it('marks a visited day no-spend when it has no expense yet, spend once it does', () => {
    const today = new Date(2026, 2, 15)
    const appVisits = [makeVisit(today)]

    const withoutSpend = computeMonthNoSpendStats([], appVisits, new Date(2026, 2, 1), today)
    expect(withoutSpend.days[14].status).toBe('no-spend')

    const withSpend = computeMonthNoSpendStats(
      [makeTransaction({ date: today })],
      appVisits,
      new Date(2026, 2, 1),
      today
    )
    expect(withSpend.days[14].status).toBe('spend')
  })

  it('marks a day as no-data when there is no visit or transaction evidence for it', () => {
    const today = new Date(2026, 2, 20)
    const appVisits = [makeVisit(new Date(2026, 2, 10)), makeVisit(today)]

    const stats = computeMonthNoSpendStats([], appVisits, new Date(2026, 2, 1), today)

    expect(stats.days[14].status).toBe('no-data') // Mar 15, no visit/transaction that day
    expect(stats.days[9].status).toBe('no-spend') // Mar 10, has a recorded visit
  })

  it('treats a day with any transaction (not just an expense) as evidence the app was used', () => {
    const today = new Date(2026, 2, 20)
    // An income transaction on Mar 15 proves the app was opened that day, no visit needed.
    const transactions = [makeTransaction({ type: 'income', date: new Date(2026, 2, 15) })]

    const stats = computeMonthNoSpendStats(transactions, [], new Date(2026, 2, 1), today)

    expect(stats.days[14].status).toBe('no-spend')
  })

  it('marks days with no evidence at all as no-data, even before any visit was ever recorded', () => {
    const today = new Date(2026, 2, 20)
    // No transactions, no visits anywhere - nothing vouches for any day.
    const stats = computeMonthNoSpendStats([], [], new Date(2026, 2, 1), today)

    expect(stats.days.slice(0, 20).every((d) => d.status === 'no-data')).toBe(true)
  })
})
