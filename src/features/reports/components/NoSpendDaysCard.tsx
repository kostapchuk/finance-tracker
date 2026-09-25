import { Flame } from 'lucide-react'
import { useMemo } from 'react'

import { BlurredAmount } from '@/components/ui/BlurredAmount'
import type { Transaction } from '@/database/types'
import { useLanguage } from '@/hooks/useLanguage'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/currency'
import { formatDaysCount, formatOperationsCount } from '@/utils/i18n'
import {
  computeAllTimeNoSpendRecords,
  computeCurrentStreak,
  computeMonthNoSpendStats,
  computeMonthSpendHighlights,
  toDateKey,
  type DayCell,
} from '@/utils/noSpendDays'

const STREAK_ICON_THRESHOLD = 3

interface NoSpendDaysCardProps {
  transactions: Transaction[]
  selectedMonth: Date
}

function DayGridCell({ day, isToday }: { day: DayCell; isToday: boolean }) {
  return (
    <div
      className={cn(
        'aspect-square rounded-md flex items-center justify-center text-[11px] font-medium tabular-nums',
        day.status === 'no-spend' && 'bg-success/15 text-success',
        day.status === 'spend' && 'bg-destructive/15 text-destructive',
        day.status === 'future' && 'bg-secondary/30 text-muted-foreground/40',
        isToday && 'ring-2 ring-primary'
      )}
    >
      {day.date.getDate()}
    </div>
  )
}

export function NoSpendDaysCard({ transactions, selectedMonth }: NoSpendDaysCardProps) {
  const mainCurrency = useAppStore((state) => state.mainCurrency)
  const { t, language } = useLanguage()

  const today = useMemo(() => new Date(), [])

  const monthStats = useMemo(
    () => computeMonthNoSpendStats(transactions, selectedMonth, today),
    [transactions, selectedMonth, today]
  )

  const currentStreak = useMemo(
    () => computeCurrentStreak(transactions, today),
    [transactions, today]
  )

  const allTimeRecords = useMemo(
    () => computeAllTimeNoSpendRecords(transactions, today),
    [transactions, today]
  )

  const highlights = useMemo(
    () => computeMonthSpendHighlights(transactions, selectedMonth),
    [transactions, selectedMonth]
  )

  const weekdayLabels = useMemo(() => {
    const locale = language === 'ru' ? 'ru-RU' : 'en-US'
    // 2024-01-01 is a Monday; grid always starts the week on Monday.
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(2024, 0, 1 + i)
      return date.toLocaleDateString(locale, { weekday: 'short' })
    })
  }, [language])

  const leadingOffset = useMemo(() => {
    const firstDay = monthStats.days[0]?.date ?? selectedMonth
    return (firstDay.getDay() + 6) % 7
  }, [monthStats.days, selectedMonth])

  const locale = language === 'ru' ? 'ru-RU' : 'en-US'
  const formatDayMonth = (date: Date) =>
    date.toLocaleDateString(locale, { day: 'numeric', month: 'long' })
  const formatMonthYear = (date: Date) =>
    date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })

  const progressPct =
    monthStats.evaluatedCount === 0
      ? 0
      : (monthStats.noSpendCount / monthStats.evaluatedCount) * 100

  return (
    <div className="space-y-3">
      <div className="p-4 bg-secondary/50 rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-section-label">{t('noSpendDaysTitle')}</h3>
          <span className="text-sm text-muted-foreground">
            {monthStats.noSpendCount} / {monthStats.evaluatedCount}
          </span>
        </div>

        <div className="h-1.5 rounded-full bg-secondary overflow-hidden mb-4">
          <div
            className="h-full rounded-full bg-success transition-[width]"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 bg-background/40 rounded-xl">
            <div className="flex items-center gap-1.5 mb-1">
              {currentStreak >= STREAK_ICON_THRESHOLD && (
                <Flame className="h-3.5 w-3.5 text-success" />
              )}
              <span className="text-xs text-muted-foreground">{t('currentStreak')}</span>
            </div>
            <span className="text-lg font-bold tabular-nums">
              {formatDaysCount(currentStreak, language)}
            </span>
          </div>
          <div className="p-3 bg-background/40 rounded-xl">
            <span className="text-xs text-muted-foreground block mb-1">
              {t('bestStreakThisMonth')}
            </span>
            <span className="text-lg font-bold tabular-nums">
              {formatDaysCount(monthStats.bestStreakInMonth, language)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className="text-center text-[10px] text-muted-foreground uppercase tracking-wide"
            >
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: leadingOffset }, (_, i) => (
            <div key={`offset-${i}`} />
          ))}
          {monthStats.days.map((day) => (
            <DayGridCell key={day.dateKey} day={day} isToday={day.dateKey === toDateKey(today)} />
          ))}
        </div>

        {(highlights.maxAmountDay || highlights.maxCountDay) && (
          <div className="mt-4 pt-3 border-t border-border/50 space-y-2">
            {highlights.maxAmountDay && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('biggestSpendingDay')}</span>
                <span className="font-medium">
                  {formatDayMonth(highlights.maxAmountDay.date)} ·{' '}
                  <BlurredAmount className="tabular-nums">
                    {formatCurrency(highlights.maxAmountDay.amount, mainCurrency)}
                  </BlurredAmount>
                </span>
              </div>
            )}
            {highlights.maxCountDay && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('mostTransactionsDay')}</span>
                <span className="font-medium">
                  {formatDayMonth(highlights.maxCountDay.date)} ·{' '}
                  {formatOperationsCount(highlights.maxCountDay.count, language)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 bg-secondary/50 rounded-2xl">
        <h3 className="text-section-label mb-3">{t('allTimeRecords')}</h3>
        {allTimeRecords.bestStreak || allTimeRecords.bestMonth ? (
          <div className="space-y-2">
            {allTimeRecords.bestStreak && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('bestStreakEver')}</span>
                <span className="font-medium">
                  {formatDaysCount(allTimeRecords.bestStreak.length, language)} ·{' '}
                  {formatMonthYear(allTimeRecords.bestStreak.endDate)}
                </span>
              </div>
            )}
            {allTimeRecords.bestMonth && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('bestMonthEver')}</span>
                <span className="font-medium">
                  {formatDaysCount(allTimeRecords.bestMonth.count, language)} ·{' '}
                  {formatMonthYear(allTimeRecords.bestMonth.monthStart)}
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('notEnoughDataYet')}</p>
        )}
      </div>
    </div>
  )
}
