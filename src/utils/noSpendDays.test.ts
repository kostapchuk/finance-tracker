import { describe, expect, it } from 'vitest'

import {
  computeAllTimeNoSpendRecords,
  computeCurrentStreak,
  computeMonthNoSpendStats,
  computeMonthSpendHighlights,
} from './noSpendDays'

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
  it('marks days with a real expense as spend and everything else as no-spend', () => {
    const today = new Date(2026, 2, 31) // Mar 31, 2026 (full past month)
    const transactions = [
      makeTransaction({ type: 'expense', date: new Date(2026, 2, 5) }),
      makeTransaction({ type: 'expense', date: new Date(2026, 2, 6) }),
      makeTransaction({ type: 'income', date: new Date(2026, 2, 10) }),
      makeTransaction({ type: 'loan_given', date: new Date(2026, 2, 11) }),
      makeTransaction({ type: 'loan_payment', date: new Date(2026, 2, 12) }),
      makeTransaction({ type: 'transfer', date: new Date(2026, 2, 13) }),
    ]

    const stats = computeMonthNoSpendStats(transactions, [], new Date(2026, 2, 1), today)

    expect(stats.days).toHaveLength(31)
    expect(stats.evaluatedCount).toBe(31)
    // Only Mar 5 and Mar 6 are 'spend' days; loans/income/transfers don't count.
    expect(stats.noSpendCount).toBe(29)
    const spendDates = stats.days.filter((d) => d.status === 'spend').map((d) => d.date.getDate())
    expect(spendDates).toEqual([5, 6])
  })

  it('treats days after "today" as future and excludes them from evaluatedCount', () => {
    const today = new Date(2026, 2, 10) // Mar 10, 2026
    const stats = computeMonthNoSpendStats([], [], new Date(2026, 2, 1), today)

    expect(stats.evaluatedCount).toBe(10)
    expect(stats.noSpendCount).toBe(10)
    expect(stats.days.filter((d) => d.status === 'future')).toHaveLength(21)
  })

  it('computes the longest consecutive no-spend run within the month', () => {
    const today = new Date(2026, 2, 31)
    const transactions = [
      makeTransaction({ date: new Date(2026, 2, 4) }),
      makeTransaction({ date: new Date(2026, 2, 20) }),
    ]
    // Runs: Mar 1-3 (3), Mar 5-19 (15), Mar 21-31 (11) -> best is 15
    const stats = computeMonthNoSpendStats(transactions, [], new Date(2026, 2, 1), today)

    expect(stats.bestStreakInMonth).toBe(15)
  })

  it('marks today itself no-spend when it has no expense yet, spend once it does', () => {
    const today = new Date(2026, 2, 15)

    const withoutSpend = computeMonthNoSpendStats([], [], new Date(2026, 2, 1), today)
    expect(withoutSpend.days[14].status).toBe('no-spend')

    const withSpend = computeMonthNoSpendStats(
      [makeTransaction({ date: today })],
      [],
      new Date(2026, 2, 1),
      today
    )
    expect(withSpend.days[14].status).toBe('spend')
  })

  it('grandfathers days before visit tracking started as no-spend, even without evidence', () => {
    const today = new Date(2026, 2, 15)
    // Tracking only starts Mar 15; Mar 1-14 have no transactions or visits at all.
    const appVisits = [makeVisit(today)]

    const stats = computeMonthNoSpendStats([], appVisits, new Date(2026, 2, 1), today)

    expect(stats.days.slice(0, 14).every((d) => d.status === 'no-spend')).toBe(true)
    expect(stats.days[14].status).toBe('no-spend') // Mar 15 itself has a recorded visit
  })

  it('marks a day as no-data once tracking has started but the app was never opened that day', () => {
    const today = new Date(2026, 2, 20)
    // Tracking starts Mar 10; Mar 15 has neither a visit nor a transaction.
    const appVisits = [makeVisit(new Date(2026, 2, 10)), makeVisit(today)]

    const stats = computeMonthNoSpendStats([], appVisits, new Date(2026, 2, 1), today)

    expect(stats.days[14].status).toBe('no-data') // Mar 15, no visit/transaction that day
  })

  it('treats a day with any transaction (not just an expense) as evidence the app was used', () => {
    const today = new Date(2026, 2, 20)
    const appVisits = [makeVisit(new Date(2026, 2, 10))]
    // An income transaction on Mar 15 still proves the app was opened that day.
    const transactions = [makeTransaction({ type: 'income', date: new Date(2026, 2, 15) })]

    const stats = computeMonthNoSpendStats(transactions, appVisits, new Date(2026, 2, 1), today)

    expect(stats.days[14].status).toBe('no-spend')
  })

  it('a no-data day breaks the best-streak-in-month run', () => {
    const today = new Date(2026, 2, 20)
    // Tracking starts Mar 1; Mar 10 is a gap with no visit/transaction.
    const appVisits = [
      makeVisit(new Date(2026, 2, 1)),
      makeVisit(new Date(2026, 2, 5)),
      makeVisit(today),
    ]

    const stats = computeMonthNoSpendStats([], appVisits, new Date(2026, 2, 1), today)

    // Mar 10 (index 9) has no evidence -> 'no-data', breaking the run before it reaches 20 days.
    expect(stats.days[9].status).toBe('no-data')
    expect(stats.bestStreakInMonth).toBeLessThan(20)
  })
})

describe('computeCurrentStreak', () => {
  it('counts back from today until it hits a spend day', () => {
    const today = new Date(2026, 2, 10)
    const transactions = [
      makeTransaction({ date: new Date(2026, 2, 7) }), // spend day breaks the streak
    ]
    // No-spend: Mar 8, 9, 10 -> streak of 3
    expect(computeCurrentStreak(transactions, [], today)).toBe(3)
  })

  it('is 0 when today already had a real expense', () => {
    const today = new Date(2026, 2, 10)
    expect(computeCurrentStreak([makeTransaction({ date: today })], [], today)).toBe(0)
  })

  it('does not walk back past the earliest recorded transaction', () => {
    const today = new Date(2026, 2, 10)
    const transactions = [makeTransaction({ type: 'income', date: new Date(2026, 2, 8) })]
    // History starts Mar 8 -> streak can only be Mar 8, 9, 10 = 3, not further back
    expect(computeCurrentStreak(transactions, [], today)).toBe(3)
  })

  it('ignores loan and transfer transactions when breaking the streak', () => {
    const today = new Date(2026, 2, 10)
    const transactions = [
      makeTransaction({ type: 'loan_payment', date: new Date(2026, 2, 5) }),
      makeTransaction({ type: 'transfer', date: new Date(2026, 2, 6) }),
    ]
    expect(computeCurrentStreak(transactions, [], today)).toBe(6)
  })

  it('breaks the streak on a day with no recorded visit once tracking has started', () => {
    const today = new Date(2026, 2, 10)
    // Tracking starts Mar 8; Mar 9 has no visit/transaction, so the streak
    // can only count today (Mar 10), not reach back to Mar 8.
    const appVisits = [makeVisit(new Date(2026, 2, 8)), makeVisit(today)]

    expect(computeCurrentStreak([], appVisits, today)).toBe(1)
  })

  it('counts a visit-only day (app opened, nothing spent) as no-spend', () => {
    const today = new Date(2026, 2, 10)
    const appVisits = [makeVisit(new Date(2026, 2, 9)), makeVisit(today)]

    expect(computeCurrentStreak([], appVisits, today)).toBe(2)
  })
})

describe('computeAllTimeNoSpendRecords', () => {
  it('finds the longest streak across month boundaries', () => {
    const today = new Date(2026, 3, 5) // Apr 5, 2026
    const transactions = [
      makeTransaction({ date: new Date(2026, 2, 1) }), // Mar 1 spend
      makeTransaction({ date: new Date(2026, 3, 2) }), // Apr 2 spend
    ]
    // No-spend run: Mar 2 -> Apr 1 = 31 days, crossing the month boundary
    const records = computeAllTimeNoSpendRecords(transactions, [], today)

    expect(records.bestStreak?.length).toBe(31)
    expect(records.bestStreak?.endDate).toEqual(new Date(2026, 3, 1))
  })

  it('finds the month with the most no-spend days', () => {
    const today = new Date(2026, 3, 30)
    const transactions = [
      // March: 5 spend days -> 26 no-spend days
      ...[1, 2, 3, 4, 5].map((d) => makeTransaction({ date: new Date(2026, 2, d) })),
      // April: 1 spend day -> 29 no-spend days (best)
      makeTransaction({ date: new Date(2026, 3, 1) }),
    ]

    const records = computeAllTimeNoSpendRecords(transactions, [], today)

    expect(records.bestMonth?.count).toBe(29)
    expect(records.bestMonth?.monthStart).toEqual(new Date(2026, 3, 1))
  })

  it('returns undefined when there is no transaction or visit history', () => {
    const records = computeAllTimeNoSpendRecords([], [], new Date(2026, 2, 1))
    expect(records.bestStreak).toBeUndefined()
    expect(records.bestMonth).toBeUndefined()
  })

  it('a no-data gap breaks the all-time streak and is excluded from the month count', () => {
    const today = new Date(2026, 2, 20)
    // Tracking starts Mar 1; Mar 10 is a gap (no visit, no transaction).
    const appVisits = [
      makeVisit(new Date(2026, 2, 1)),
      makeVisit(new Date(2026, 2, 5)),
      makeVisit(today),
    ]

    const records = computeAllTimeNoSpendRecords([], appVisits, today)

    // The streak resets at the Mar 10 gap, so it can't reach all 20 evaluated days.
    expect(records.bestStreak?.length).toBeLessThan(20)
    expect(records.bestMonth?.count).toBeLessThan(20)
  })
})

describe('computeMonthSpendHighlights', () => {
  it('finds the day with the highest total expense amount', () => {
    const transactions = [
      makeTransaction({ amount: 50, date: new Date(2026, 2, 5) }),
      makeTransaction({ amount: 30, date: new Date(2026, 2, 5) }),
      makeTransaction({ amount: 200, date: new Date(2026, 2, 12) }),
    ]

    const highlights = computeMonthSpendHighlights(transactions, new Date(2026, 2, 1))

    expect(highlights.maxAmountDay?.amount).toBe(200)
    expect(highlights.maxAmountDay?.date).toEqual(new Date(2026, 2, 12))
  })

  it('prefers mainCurrencyAmount over amount when summing', () => {
    const transactions = [
      makeTransaction({ amount: 10, mainCurrencyAmount: 500, date: new Date(2026, 2, 5) }),
      makeTransaction({ amount: 300, date: new Date(2026, 2, 12) }),
    ]

    const highlights = computeMonthSpendHighlights(transactions, new Date(2026, 2, 1))

    expect(highlights.maxAmountDay?.amount).toBe(500)
  })

  it('finds the day with the most expense transactions', () => {
    const transactions = [
      makeTransaction({ date: new Date(2026, 2, 5) }),
      makeTransaction({ date: new Date(2026, 2, 5) }),
      makeTransaction({ date: new Date(2026, 2, 5) }),
      makeTransaction({ date: new Date(2026, 2, 12) }),
    ]

    const highlights = computeMonthSpendHighlights(transactions, new Date(2026, 2, 1))

    expect(highlights.maxCountDay?.count).toBe(3)
    expect(highlights.maxCountDay?.date).toEqual(new Date(2026, 2, 5))
  })

  it('ignores non-expense transactions and transactions outside the month', () => {
    const transactions = [
      makeTransaction({ type: 'loan_payment', amount: 1000, date: new Date(2026, 2, 5) }),
      makeTransaction({ type: 'expense', amount: 40, date: new Date(2026, 1, 28) }),
    ]

    const highlights = computeMonthSpendHighlights(transactions, new Date(2026, 2, 1))

    expect(highlights.maxAmountDay).toBeUndefined()
    expect(highlights.maxCountDay).toBeUndefined()
  })

  it('returns undefined when there are no expenses in the month', () => {
    const highlights = computeMonthSpendHighlights([], new Date(2026, 2, 1))
    expect(highlights.maxAmountDay).toBeUndefined()
    expect(highlights.maxCountDay).toBeUndefined()
  })
})
