import type { Transaction } from '@/database/types'
import { getEndOfMonth, getStartOfMonth } from '@/utils/date'

export type DayStatus = 'no-spend' | 'spend' | 'future'

export interface DayCell {
  date: Date
  dateKey: string
  status: DayStatus
}

export interface MonthNoSpendStats {
  days: DayCell[]
  noSpendCount: number
  evaluatedCount: number
  bestStreakInMonth: number
}

export interface StreakPeriod {
  length: number
  endDate: Date
}

export interface BestMonth {
  count: number
  monthStart: Date
}

export interface AllTimeNoSpendRecords {
  bestStreak: StreakPeriod | undefined
  bestMonth: BestMonth | undefined
}

export interface DayAmount {
  date: Date
  amount: number
}

export interface DayCount {
  date: Date
  count: number
}

export interface MonthSpendHighlights {
  maxAmountDay: DayAmount | undefined
  maxCountDay: DayCount | undefined
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** A day only breaks a no-spend streak if it has a real expense; loans/transfers/income don't count. */
function isRealExpense(transaction: Transaction): boolean {
  return transaction.type === 'expense'
}

/** Builds a set of date keys (local calendar days) that had at least one real expense. */
export function buildSpendDayKeys(transactions: Transaction[]): Set<string> {
  const keys = new Set<string>()
  for (const transaction of transactions) {
    if (!isRealExpense(transaction)) continue
    keys.add(toDateKey(new Date(transaction.date)))
  }
  return keys
}

function dayStatus(date: Date, spendDayKeys: Set<string>, today: Date): DayStatus {
  if (date > today) return 'future'
  return spendDayKeys.has(toDateKey(date)) ? 'spend' : 'no-spend'
}

function longestNoSpendRun(days: DayCell[]): number {
  let best = 0
  let current = 0
  for (const day of days) {
    if (day.status === 'no-spend') {
      current += 1
      best = Math.max(best, current)
    } else {
      current = 0
    }
  }
  return best
}

/** Per-day breakdown and stats for a single calendar month (days after `today` are 'future'). */
export function computeMonthNoSpendStats(
  transactions: Transaction[],
  month: Date,
  today: Date = new Date()
): MonthNoSpendStats {
  const spendDayKeys = buildSpendDayKeys(transactions)
  const start = getStartOfMonth(month)
  const end = getEndOfMonth(month)
  const daysInMonth = end.getDate()

  const days: DayCell[] = []
  for (let dayOfMonth = 1; dayOfMonth <= daysInMonth; dayOfMonth++) {
    const date = new Date(start.getFullYear(), start.getMonth(), dayOfMonth)
    days.push({ date, dateKey: toDateKey(date), status: dayStatus(date, spendDayKeys, today) })
  }

  const noSpendCount = days.filter((d) => d.status === 'no-spend').length
  const evaluatedCount = days.filter((d) => d.status !== 'future').length

  return { days, noSpendCount, evaluatedCount, bestStreakInMonth: longestNoSpendRun(days) }
}

/** Consecutive no-spend days ending today (crosses month boundaries); 0 if today itself had spending. */
export function computeCurrentStreak(
  transactions: Transaction[],
  today: Date = new Date()
): number {
  const spendDayKeys = buildSpendDayKeys(transactions)
  if (transactions.length === 0) return 0

  let streak = 0
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const earliest = earliestTransactionDay(transactions)
  if (!earliest) return 0

  while (cursor >= earliest) {
    if (spendDayKeys.has(toDateKey(cursor))) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function earliestTransactionDay(transactions: Transaction[]): Date | undefined {
  if (transactions.length === 0) return undefined
  const earliestTime = Math.min(...transactions.map((t) => new Date(t.date).getTime()))
  const earliest = new Date(earliestTime)
  return new Date(earliest.getFullYear(), earliest.getMonth(), earliest.getDate())
}

/**
 * All-time records computed over the full history of transactions:
 * - bestStreak: the longest unbroken run of no-spend days ever (may span months)
 * - bestMonth: the calendar month with the most no-spend days
 * History starts at the first transaction ever recorded; days before that aren't evaluated.
 */
export function computeAllTimeNoSpendRecords(
  transactions: Transaction[],
  today: Date = new Date()
): AllTimeNoSpendRecords {
  const earliest = earliestTransactionDay(transactions)
  if (!earliest) return { bestStreak: undefined, bestMonth: undefined }

  const spendDayKeys = buildSpendDayKeys(transactions)
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  let bestStreakLength = 0
  let bestStreakEnd: Date | undefined = undefined
  let currentStreakLength = 0

  const monthCounts = new Map<string, { count: number; monthStart: Date }>()

  const cursor = new Date(earliest)
  while (cursor <= todayStart) {
    const isNoSpend = !spendDayKeys.has(toDateKey(cursor))

    if (isNoSpend) {
      currentStreakLength += 1
      if (currentStreakLength > bestStreakLength) {
        bestStreakLength = currentStreakLength
        bestStreakEnd = new Date(cursor)
      }
    } else {
      currentStreakLength = 0
    }

    if (isNoSpend) {
      const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
      const existing = monthCounts.get(monthKey)
      if (existing) {
        existing.count += 1
      } else {
        monthCounts.set(monthKey, {
          count: 1,
          monthStart: new Date(cursor.getFullYear(), cursor.getMonth(), 1),
        })
      }
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  let bestMonth: BestMonth | undefined = undefined
  for (const { count, monthStart } of monthCounts.values()) {
    if (!bestMonth || count > bestMonth.count) {
      bestMonth = { count, monthStart }
    }
  }

  return {
    bestStreak: bestStreakEnd ? { length: bestStreakLength, endDate: bestStreakEnd } : undefined,
    bestMonth,
  }
}

/** The days within the month with the highest total expense amount and the most expense transactions. */
export function computeMonthSpendHighlights(
  transactions: Transaction[],
  month: Date
): MonthSpendHighlights {
  const start = getStartOfMonth(month)
  const end = getEndOfMonth(month)

  const amountByDay = new Map<string, number>()
  const countByDay = new Map<string, number>()
  const dateByKey = new Map<string, Date>()

  for (const transaction of transactions) {
    if (!isRealExpense(transaction)) continue
    const date = new Date(transaction.date)
    if (date < start || date > end) continue

    const key = toDateKey(date)
    dateByKey.set(key, new Date(date.getFullYear(), date.getMonth(), date.getDate()))
    amountByDay.set(
      key,
      (amountByDay.get(key) ?? 0) + (transaction.mainCurrencyAmount ?? transaction.amount)
    )
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1)
  }

  let maxAmountDay: DayAmount | undefined = undefined
  for (const [key, amount] of amountByDay) {
    if (!maxAmountDay || amount > maxAmountDay.amount) {
      maxAmountDay = { date: dateByKey.get(key)!, amount }
    }
  }

  let maxCountDay: DayCount | undefined = undefined
  for (const [key, count] of countByDay) {
    if (!maxCountDay || count > maxCountDay.count) {
      maxCountDay = { date: dateByKey.get(key)!, count }
    }
  }

  return { maxAmountDay, maxCountDay }
}
