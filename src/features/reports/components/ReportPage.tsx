import { TrendingUp, TrendingDown } from 'lucide-react'
import { useMemo } from 'react'

import { BlurredAmount } from '@/components/ui/BlurredAmount'
import { MonthSelector } from '@/components/ui/MonthSelector'
import { useLanguage } from '@/hooks/useLanguage'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/utils/cn'
import { formatCurrency, formatCurrencyWithSign, getAmountColorClass } from '@/utils/currency'
import { getStartOfMonth, getEndOfMonth, addMonths } from '@/utils/date'

export function ReportPage() {
  const transactions = useAppStore((state) => state.transactions)
  const categories = useAppStore((state) => state.categories)
  const selectedMonth = useAppStore((state) => state.selectedMonth)
  const mainCurrency = useAppStore((state) => state.mainCurrency)
  const { t, language } = useLanguage()

  const stats = useMemo(() => {
    const startOfMonth = getStartOfMonth(selectedMonth)
    const endOfMonth = getEndOfMonth(selectedMonth)

    const monthlyTransactions = transactions.filter(
      (t) => new Date(t.date) >= startOfMonth && new Date(t.date) <= endOfMonth
    )

    // Exclude transfers (they don't have incomeSourceId/categoryId)
    const monthlyIncome = monthlyTransactions
      .filter((t) => t.type === 'income' && t.incomeSourceId)
      .reduce((sum, t) => sum + (t.mainCurrencyAmount ?? t.amount), 0)

    const monthlyExpenses = monthlyTransactions
      .filter((t) => t.type === 'expense' && t.categoryId)
      .reduce((sum, t) => sum + (t.mainCurrencyAmount ?? t.amount), 0)

    const netFlow = monthlyIncome - monthlyExpenses

    return { monthlyIncome, monthlyExpenses, netFlow }
  }, [transactions, selectedMonth])

  const spendingByCategory = useMemo(() => {
    const startOfMonth = getStartOfMonth(selectedMonth)
    const endOfMonth = getEndOfMonth(selectedMonth)

    const monthlyExpenses = transactions.filter(
      (t) =>
        t.type === 'expense' && new Date(t.date) >= startOfMonth && new Date(t.date) <= endOfMonth
    )

    const byCategory: Record<number, number> = {}
    for (const t of monthlyExpenses) {
      const categoryId = t.categoryId || 0
      byCategory[categoryId] = (byCategory[categoryId] ?? 0) + (t.mainCurrencyAmount ?? t.amount)
    }

    return Object.entries(byCategory)
      .map(([categoryId, amount]) => {
        const category = categories.find((c) => c.id === Number.parseInt(categoryId))
        return {
          name: category?.name || 'Unknown',
          value: amount,
          color: category?.color || '#888888',
        }
      })
      .toSorted((a, b) => b.value - a.value)
  }, [transactions, categories, selectedMonth])

  const monthlyTrend = useMemo(() => {
    const months: Record<string, { income: number; expenses: number }> = {}

    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = addMonths(selectedMonth, -i)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      months[monthKey] = { income: 0, expenses: 0 }
    }

    // Exclude transfers (they don't have incomeSourceId/categoryId)
    for (const t of transactions) {
      const date = new Date(t.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (months[monthKey]) {
        const amount = t.mainCurrencyAmount ?? t.amount
        if (t.type === 'income' && t.incomeSourceId) {
          months[monthKey].income += amount
        } else if (t.type === 'expense' && t.categoryId) {
          months[monthKey].expenses += amount
        }
      }
    }

    return Object.entries(months)
      .toSorted(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
          month: 'short',
        }),
        income: data.income,
        expenses: data.expenses,
      }))
  }, [transactions, selectedMonth, language])

  return (
    <div className="flex flex-col min-h-full pb-4">
      {/* Header */}
      <div className="px-4 py-3">
        <h1 className="text-page-title">{t('report')}</h1>
      </div>

      {/* Month Selector */}
      <MonthSelector />

      {/* Summary Cards */}
      <div className="px-4 py-4 space-y-3">
        {/* Income vs Expenses */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-secondary/50 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className={`h-4 w-4 ${getAmountColorClass(stats.monthlyIncome)}`} />
              <span className="text-sm text-muted-foreground">{t('income')}</span>
            </div>
            <BlurredAmount
              className={cn(
                'tabular-nums text-xl font-bold block',
                getAmountColorClass(stats.monthlyIncome)
              )}
            >
              {formatCurrencyWithSign(stats.monthlyIncome, mainCurrency)}
            </BlurredAmount>
          </div>
          <div className="p-4 bg-secondary/50 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown
                className={`h-4 w-4 ${stats.monthlyExpenses === 0 ? 'text-foreground' : 'text-destructive'}`}
              />
              <span className="text-sm text-muted-foreground">{t('expenses')}</span>
            </div>
            <BlurredAmount
              className={cn(
                'tabular-nums text-xl font-bold block',
                stats.monthlyExpenses === 0 ? 'text-foreground' : 'text-destructive'
              )}
            >
              {stats.monthlyExpenses === 0
                ? formatCurrency(0, mainCurrency)
                : `- ${formatCurrency(stats.monthlyExpenses, mainCurrency)}`}
            </BlurredAmount>
          </div>
        </div>

        {/* Net Flow */}
        <div className="p-4 bg-secondary/50 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('netFlow')}</span>
            <BlurredAmount
              className={cn('tabular-nums text-xl font-bold', getAmountColorClass(stats.netFlow))}
            >
              {formatCurrencyWithSign(stats.netFlow, mainCurrency)}
            </BlurredAmount>
          </div>
        </div>
      </div>

      {/* Spending by Category */}
      <div className="px-4 py-4">
        <h3 className="text-section-label mb-4">{t('spendingByCategory')}</h3>
        {spendingByCategory.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground bg-secondary/30 rounded-2xl">
            {t('noExpenseDataThisMonth')}
          </div>
        ) : (
          <>
            <div className="h-[200px] flex items-center justify-center">
              <div
                className="w-[160px] h-[160px] rounded-full"
                style={{
                  background: (() => {
                    const total = spendingByCategory.reduce((s, c) => s + c.value, 0)
                    let angle = 0
                    const stops = spendingByCategory.map((c) => {
                      const start = angle
                      angle += (c.value / total) * 360
                      return `${c.color} ${start}deg ${angle}deg`
                    })
                    return `conic-gradient(${stops.join(', ')})`
                  })(),
                  WebkitMask:
                    'radial-gradient(circle 40px at center, transparent 100%, black 100%)',
                  mask: 'radial-gradient(circle 40px at center, transparent 100%, black 100%)',
                }}
              />
            </div>
            <div className="space-y-2 mt-4">
              {spendingByCategory.slice(0, 5).map((category) => (
                <div key={category.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm">{category.name}</span>
                  </div>
                  <BlurredAmount className="tabular-nums text-sm font-medium">
                    {formatCurrency(category.value, mainCurrency)}
                  </BlurredAmount>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Income vs Expenses Trend */}
      <div className="px-4 py-4">
        <h3 className="text-section-label mb-4">{t('sixMonthTrend')}</h3>
        {monthlyTrend.every((m) => m.income === 0 && m.expenses === 0) ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground bg-secondary/30 rounded-2xl">
            {t('noTransactionDataYet')}
          </div>
        ) : (
          <div>
            <div className="h-[170px] flex items-end gap-1 justify-between">
              {(() => {
                const maxVal = Math.max(
                  ...monthlyTrend.map((m) => Math.max(m.income, m.expenses)),
                  1
                )
                return monthlyTrend.map((m) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="flex items-end gap-0.5 w-full h-[145px]">
                      <div
                        className="flex-1 rounded-t bg-success min-h-[2px]"
                        style={{ height: `${(m.income / maxVal) * 100}%` }}
                      />
                      <div
                        className="flex-1 rounded-t bg-destructive min-h-[2px]"
                        style={{ height: `${(m.expenses / maxVal) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{m.month}</span>
                  </div>
                ))
              })()}
            </div>
            <div className="flex items-center justify-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-success" />
                <span className="text-xs text-muted-foreground">{t('income')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-destructive" />
                <span className="text-xs text-muted-foreground">{t('expenses')}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
