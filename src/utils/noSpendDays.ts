import type { AppVisit, Transaction } from '@/database/types'
import { formatDateForInput, getEndOfMonth, getStartOfMonth } from '@/utils/date'

export type DayStatus = 'no-spend' | 'spend' | 'no-data' | 'future'

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

/** A day only breaks a no-spend streak if it has a real expense; loans/transfers/income don't count. */
function isRealExpense(transaction: Transaction): boolean {
  return transaction.type === 'expense'
}

/** Builds a set of date keys (local calendar days) that had at least one real expense. */
export function buildSpendDayKeys(transactions: Transaction[]): Set<string> {
  const keys = new Set<string>()
  for (const transaction of transactions) {
    if (!isRealExpense(transaction)) continue
    keys.add(formatDateForInput(new Date(transaction.date)))
  }
  return keys
}

/**
 * Days where we have evidence the app was actually used: either a recorded visit, or any
 * transaction (of any type) dated that day. Used to tell "opened the app, spent nothing" apart
 * from "never opened the app that day" once visit tracking exists (see `earliestTrackingDayKey`).
 */
function buildActivityDayKeys(transactions: Transaction[], appVisits: AppVisit[]): Set<string> {
  const keys = new Set<string>()
  for (const transaction of transactions) {
    keys.add(formatDateForInput(new Date(transaction.date)))
  }
  for (const visit of appVisits) {
    keys.add(visit.date)
  }
  return keys
}

/** The earliest day visit tracking has data for; days before it are grandfathered (see `dayStatus`). */
function earliestTrackingDayKey(appVisits: AppVisit[]): string | undefined {
  if (appVisits.length === 0) return undefined
  let min = appVisits[0].date
  for (const visit of appVisits) {
    if (visit.date < min) min = visit.date
  }
  return min
}

/** Earliest day we have any record for at all (a transaction or a visit), local calendar day. */
function earliestKnownDay(transactions: Transaction[], appVisits: AppVisit[]): Date | undefined {
  const times = [
    ...transactions.map((t) => new Date(t.date).getTime()),
    ...appVisits.map((v) => new Date(v.date).getTime()),
  ]
  if (times.length === 0) return undefined
  const earliest = new Date(Math.min(...times))
  return new Date(earliest.getFullYear(), earliest.getMonth(), earliest.getDate())
}

interface DayEvidence {
  spendDayKeys: Set<string>
  activityDayKeys: Set<string>
  trackingStartKey: string | undefined
}

function buildDayEvidence(transactions: Transaction[], appVisits: AppVisit[]): DayEvidence {
  return {
    spendDayKeys: buildSpendDayKeys(transactions),
    activityDayKeys: buildActivityDayKeys(transactions, appVisits),
    trackingStartKey: earliestTrackingDayKey(appVisits),
  }
}

/**
 * A day is:
 * - 'future' if it hasn't happened yet
 * - 'spend' if it had a real expense
 * - 'no-data' if visit tracking covers it (on/after `trackingStartKey`) but there's no evidence
 *   the app was even opened that day - it shouldn't count as a deliberate no-spend day
 * - 'no-spend' otherwise (including all days before tracking existed, grandfathered in)
 */
function dayStatus(date: Date, evidence: DayEvidence, today: Date): DayStatus {
  if (date > today) return 'future'

  const key = formatDateForInput(date)
  if (evidence.spendDayKeys.has(key)) return 'spend'
  if (
    evidence.trackingStartKey !== undefined &&
    key >= evidence.trackingStartKey &&
    !evidence.activityDayKeys.has(key)
  ) {
    return 'no-data'
  }
  return 'no-spend'
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
  appVisits: AppVisit[],
  month: Date,
  today: Date = new Date()
): MonthNoSpendStats {
  const evidence = buildDayEvidence(transactions, appVisits)
  const start = getStartOfMonth(month)
  const end = getEndOfMonth(month)
  const daysInMonth = end.getDate()

  const days: DayCell[] = []
  for (let dayOfMonth = 1; dayOfMonth <= daysInMonth; dayOfMonth++) {
    const date = new Date(start.getFullYear(), start.getMonth(), dayOfMonth)
    days.push({
      date,
      dateKey: formatDateForInput(date),
      status: dayStatus(date, evidence, today),
    })
  }

  const noSpendCount = days.filter((d) => d.status === 'no-spend').length
  const evaluatedCount = days.filter((d) => d.status !== 'future').length

  return { days, noSpendCount, evaluatedCount, bestStreakInMonth: longestNoSpendRun(days) }
}

/** Consecutive no-spend days ending today (crosses month boundaries); 0 if today broke the streak. */
export function computeCurrentStreak(
  transactions: Transaction[],
  appVisits: AppVisit[],
  today: Date = new Date()
): number {
  const earliest = earliestKnownDay(transactions, appVisits)
  if (!earliest) return 0

  const evidence = buildDayEvidence(transactions, appVisits)
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  let streak = 0
  const cursor = new Date(todayStart)
  while (cursor >= earliest) {
    if (dayStatus(cursor, evidence, todayStart) !== 'no-spend') break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/**
 * All-time records computed over the full history of transactions and app visits:
 * - bestStreak: the longest unbroken run of no-spend days ever (may span months)
 * - bestMonth: the calendar month with the most no-spend days
 * History starts at the first transaction or visit ever recorded; days before that aren't evaluated.
 */
export function computeAllTimeNoSpendRecords(
  transactions: Transaction[],
  appVisits: AppVisit[],
  today: Date = new Date()
): AllTimeNoSpendRecords {
  const earliest = earliestKnownDay(transactions, appVisits)
  if (!earliest) return { bestStreak: undefined, bestMonth: undefined }

  const evidence = buildDayEvidence(transactions, appVisits)
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  let bestStreakLength = 0
  let bestStreakEnd: Date | undefined = undefined
  let currentStreakLength = 0

  const monthCounts = new Map<string, { count: number; monthStart: Date }>()

  const cursor = new Date(earliest)
  while (cursor <= todayStart) {
    const isNoSpend = dayStatus(cursor, evidence, todayStart) === 'no-spend'

    if (isNoSpend) {
      currentStreakLength += 1
      if (currentStreakLength > bestStreakLength) {
        bestStreakLength = currentStreakLength
        bestStreakEnd = new Date(cursor)
      }

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
    } else {
      currentStreakLength = 0
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

    const key = formatDateForInput(date)
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
