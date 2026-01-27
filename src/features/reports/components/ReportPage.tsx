import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { MonthSelector } from '@/components/ui/MonthSelector'
import { useAppStore } from '@/store/useAppStore'
import { useLanguage } from '@/hooks/useLanguage'
import { formatCurrency, formatCurrencyWithSign, getAmountColorClass } from '@/utils/currency'
import { getStartOfMonth, getEndOfMonth } from '@/utils/date'
import { cn } from '@/utils/cn'

export function ReportPage() {
  const accounts = useAppStore((state) => state.accounts)
  const transactions = useAppStore((state) => state.transactions)
  const categories = useAppStore((state) => state.categories)
  const loans = useAppStore((state) => state.loans)
  const selectedMonth = useAppStore((state) => state.selectedMonth)
  const mainCurrency = useAppStore((state) => state.mainCurrency)
  const { t, language } = useLanguage()

  const stats = useMemo(() => {
    const startOfMonth = getStartOfMonth(selectedMonth)
    const endOfMonth = getEndOfMonth(selectedMonth)

    const monthlyTransactions = transactions.filter(
      (t) => new Date(t.date) >= startOfMonth && new Date(t.date) <= endOfMonth
    )

    const totalBalance = accounts.reduce((sum, a) => {
      if (a.currency === mainCurrency) return sum + a.balance
      return sum
    }, 0)

    // Exclude transfers (they don't have incomeSourceId/categoryId)
    const monthlyIncome = monthlyTransactions
      .filter((t) => t.type === 'income' && t.incomeSourceId)
      .reduce((sum, t) => sum + (t.mainCurrencyAmount ?? t.amount), 0)

    const monthlyExpenses = monthlyTransactions
      .filter((t) => t.type === 'expense' && t.categoryId)
      .reduce((sum, t) => sum + (t.mainCurrencyAmount ?? t.amount), 0)

    const netFlow = monthlyIncome - monthlyExpenses

    return { totalBalance, monthlyIncome, monthlyExpenses, netFlow }
  }, [accounts, transactions, selectedMonth])

  // Calculate loan totals
  const loanStats = useMemo(() => {
    const activeLoans = loans.filter(l => l.status !== 'fully_paid')
    const givenTotal = activeLoans
      .filter(l => l.type === 'given')
      .reduce((sum, l) => sum + (l.amount - l.paidAmount), 0)
    const receivedTotal = activeLoans
      .filter(l => l.type === 'received')
      .reduce((sum, l) => sum + (l.amount - l.paidAmount), 0)
    const netLoan = givenTotal - receivedTotal // Positive means more owed to you
    return { givenTotal, receivedTotal, netLoan }
  }, [loans])

  const spendingByCategory = useMemo(() => {
    const startOfMonth = getStartOfMonth(selectedMonth)
    const endOfMonth = getEndOfMonth(selectedMonth)

    const monthlyExpenses = transactions.filter(
      (t) =>
        t.type === 'expense' &&
        new Date(t.date) >= startOfMonth &&
        new Date(t.date) <= endOfMonth
    )

    const byCategory = monthlyExpenses.reduce((acc, t) => {
      const categoryId = t.categoryId || 0
      if (!acc[categoryId]) {
        acc[categoryId] = 0
      }
      acc[categoryId] += t.mainCurrencyAmount ?? t.amount
      return acc
    }, {} as Record<number, number>)

    return Object.entries(byCategory)
      .map(([categoryId, amount]) => {
        const category = categories.find((c) => c.id === parseInt(categoryId))
        return {
          name: category?.name || 'Unknown',
          value: amount,
          color: category?.color || '#888888',
        }
      })
      .sort((a, b) => b.value - a.value)
  }, [transactions, categories, selectedMonth])

  const monthlyTrend = useMemo(() => {
    const months: Record<string, { income: number; expenses: number }> = {}

    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(selectedMonth)
      date.setMonth(date.getMonth() - i)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      months[monthKey] = { income: 0, expenses: 0 }
    }

    // Exclude transfers (they don't have incomeSourceId/categoryId)
    transactions.forEach((t) => {
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
    })

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { month: 'short' }),
        income: data.income,
        expenses: data.expenses,
      }))
  }, [transactions, selectedMonth, language])

  return (
    <div className="flex flex-col min-h-full pb-4">
      {/* Header */}
      <div className="px-4 py-3">
        <h1 className="text-xl font-bold">{t('report')}</h1>
      </div>

      {/* Month Selector */}
      <MonthSelector />

      {/* Summary Cards */}
      <div className="px-4 py-4 space-y-3">
        {/* Total Balance */}
        <div className="p-4 bg-secondary/50 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/20">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">{t('totalBalance')}</p>
              <p className={cn('text-2xl font-bold', getAmountColorClass(stats.totalBalance))}>
                {formatCurrency(stats.totalBalance, mainCurrency)}
              </p>
            </div>
          </div>
        </div>

        {/* Income vs Expenses */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-secondary/50 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className={`h-4 w-4 ${getAmountColorClass(stats.monthlyIncome)}`} />
              <span className="text-sm text-muted-foreground">{t('income')}</span>
            </div>
            <p className={cn('text-xl font-bold', getAmountColorClass(stats.monthlyIncome))}>
              {formatCurrencyWithSign(stats.monthlyIncome, mainCurrency)}
            </p>
          </div>
          <div className="p-4 bg-secondary/50 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className={`h-4 w-4 ${stats.monthlyExpenses === 0 ? 'text-foreground' : 'text-destructive'}`} />
              <span className="text-sm text-muted-foreground">{t('expenses')}</span>
            </div>
            <p className={cn('text-xl font-bold', stats.monthlyExpenses === 0 ? 'text-foreground' : 'text-destructive')}>
              {stats.monthlyExpenses === 0 ? formatCurrency(0, mainCurrency) : `- ${formatCurrency(stats.monthlyExpenses, mainCurrency)}`}
            </p>
          </div>
        </div>

        {/* Net Flow */}
        <div className="p-4 bg-secondary/50 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('netFlow')}</span>
            <span className={cn('text-xl font-bold', getAmountColorClass(stats.netFlow))}>
              {formatCurrencyWithSign(stats.netFlow, mainCurrency)}
            </span>
          </div>
        </div>

      </div>

      {/* Current Loans Status - separate from monthly data */}
      {(loanStats.givenTotal > 0 || loanStats.receivedTotal > 0) && (
        <div className="px-4 py-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            {t('currentLoansStatus')}
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-secondary/50 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpRight className={`h-4 w-4 ${getAmountColorClass(loanStats.givenTotal)}`} />
                  <span className="text-sm text-muted-foreground">{t('owedToYou')}</span>
                </div>
                <p className={cn('text-xl font-bold', getAmountColorClass(loanStats.givenTotal))}>
                  {formatCurrency(loanStats.givenTotal, mainCurrency)}
                </p>
              </div>
              <div className="p-4 bg-secondary/50 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDownLeft className={`h-4 w-4 ${loanStats.receivedTotal === 0 ? 'text-foreground' : 'text-destructive'}`} />
                  <span className="text-sm text-muted-foreground">{t('youOwe')}</span>
                </div>
                <p className={cn('text-xl font-bold', loanStats.receivedTotal === 0 ? 'text-foreground' : 'text-destructive')}>
                  {formatCurrency(loanStats.receivedTotal, mainCurrency)}
                </p>
              </div>
            </div>
            <div className="p-4 bg-secondary/50 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('netLoans')}</span>
                <span className={cn('text-xl font-bold', getAmountColorClass(loanStats.netLoan))}>
                  {formatCurrencyWithSign(loanStats.netLoan, mainCurrency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spending by Category */}
      <div className="px-4 py-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          {t('spendingByCategory')}
        </h3>
        {spendingByCategory.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground bg-secondary/30 rounded-2xl">
            {t('noExpenseDataThisMonth')}
          </div>
        ) : (
          <>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={spendingByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {spendingByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value), mainCurrency)}
                    contentStyle={{ background: '#1a1a1a', border: 'none', borderRadius: '8px' }}
                    wrapperStyle={{ zIndex: 0 }}
                  />
                </PieChart>
              </ResponsiveContainer>
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
                  <span className="text-sm font-medium">
                    {formatCurrency(category.value, mainCurrency)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Income vs Expenses Trend */}
      <div className="px-4 py-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          {t('sixMonthTrend')}
        </h3>
        {monthlyTrend.every((m) => m.income === 0 && m.expenses === 0) ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground bg-secondary/30 rounded-2xl">
            {t('noTransactionDataYet')}
          </div>
        ) : (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend}>
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#888', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value), mainCurrency)}
                  contentStyle={{ background: '#1a1a1a', border: 'none', borderRadius: '8px' }}
                  wrapperStyle={{ zIndex: 0 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="income" name={t('income')} fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name={t('expenses')} fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
