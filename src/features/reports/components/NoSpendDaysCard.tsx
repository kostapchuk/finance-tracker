import { useMemo } from 'react'

import type { AppVisit, Transaction } from '@/database/types'
import { useLanguage } from '@/hooks/useLanguage'
import { cn } from '@/utils/cn'
import { formatDateForInput } from '@/utils/date'
import { computeMonthNoSpendStats, type DayCell } from '@/utils/noSpendDays'

interface NoSpendDaysCardProps {
  transactions: Transaction[]
  appVisits: AppVisit[]
  selectedMonth: Date
  /** Defaults to the real current date; overridable in tests. */
  today?: Date
}

function DayGridCell({ day, isToday }: { day: DayCell; isToday: boolean }) {
  return (
    <div
      className={cn(
        'aspect-square rounded-md flex items-center justify-center text-[11px] font-medium tabular-nums',
        day.status === 'no-spend' && 'bg-success/15 text-success',
        day.status === 'spend' && 'bg-destructive/15 text-destructive',
        (day.status === 'no-data' || day.status === 'future') &&
          'bg-secondary/30 text-muted-foreground/40',
        isToday && 'ring-2 ring-primary'
      )}
    >
      {day.date.getDate()}
    </div>
  )
}

export function NoSpendDaysCard({
  transactions,
  appVisits,
  selectedMonth,
  today: todayProp,
}: NoSpendDaysCardProps) {
  const { language } = useLanguage()

  const today = useMemo(() => todayProp ?? new Date(), [todayProp])

  const monthStats = useMemo(
    () => computeMonthNoSpendStats(transactions, appVisits, selectedMonth, today),
    [transactions, appVisits, selectedMonth, today]
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

  return (
    <div className="p-4 bg-secondary/50 rounded-2xl">
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
          <DayGridCell
            key={day.dateKey}
            day={day}
            isToday={day.dateKey === formatDateForInput(today)}
          />
        ))}
      </div>
    </div>
  )
}
