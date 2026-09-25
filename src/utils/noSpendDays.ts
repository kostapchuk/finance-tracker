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
 * from "never opened the app that day at all" (see `dayStatus`).
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

/** Date key of the first ever recorded app visit; there's no history before it (see `dayStatus`). */
function earliestVisitDayKey(appVisits: AppVisit[]): string | undefined {
  if (appVisits.length === 0) return undefined
  let min = appVisits[0].date
  for (const visit of appVisits) {
    if (visit.date < min) min = visit.date
  }
  return min
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
    trackingStartKey: earliestVisitDayKey(appVisits),
  }
}

/**
 * A day is:
 * - 'future' if it hasn't happened yet
 * - 'no-data' if it's before the very first recorded app visit ever - we don't reconstruct
 *   history from transactions alone, only from the moment visit tracking actually started
 * - 'spend' if it had a real expense
 * - 'no-spend' if there's evidence the app was used that day (a recorded visit or any
 *   transaction) and no real expense
 * - 'no-data' otherwise - no evidence the app was even opened that day, so it can't be
 *   credited as a deliberate no-spend day
 */
function dayStatus(date: Date, evidence: DayEvidence, today: Date): DayStatus {
  if (date > today) return 'future'

  const key = formatDateForInput(date)
  if (evidence.trackingStartKey === undefined || key < evidence.trackingStartKey) return 'no-data'
  if (evidence.spendDayKeys.has(key)) return 'spend'
  return evidence.activityDayKeys.has(key) ? 'no-spend' : 'no-data'
}

/** Per-day breakdown for a single calendar month (days after `today` are 'future'). */
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

  return { days, noSpendCount }
}
