import { useState, useMemo } from 'react'
import { Trash2, ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, Search, X, Filter, Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore } from '@/store/useAppStore'
import { useLanguage } from '@/hooks/useLanguage'
import { transactionRepo, accountRepo, loanRepo } from '@/database/repositories'
import { formatCurrency } from '@/utils/currency'
import { cn } from '@/utils/cn'
import type { Transaction, TransactionType } from '@/database/types'

function formatShortDate(date: Date, language: string): string {
  const d = new Date(date)
  return d.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short', day: 'numeric' })
}

export function HistoryPage() {
  const transactions = useAppStore((state) => state.transactions)
  const accounts = useAppStore((state) => state.accounts)
  const categories = useAppStore((state) => state.categories)
  const incomeSources = useAppStore((state) => state.incomeSources)
  const mainCurrency = useAppStore((state) => state.mainCurrency)
  const loans = useAppStore((state) => state.loans)
  const refreshTransactions = useAppStore((state) => state.refreshTransactions)
  const refreshAccounts = useAppStore((state) => state.refreshAccounts)
  const refreshLoans = useAppStore((state) => state.refreshLoans)
  const { t, language } = useLanguage()

  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType | 'transfers' | 'investments' | 'loans'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('all')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  const typeConfig: Record<TransactionType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
    income: { label: t('income'), icon: ArrowUpCircle, color: 'text-success' },
    expense: { label: t('expense'), icon: ArrowDownCircle, color: 'text-destructive' },
    transfer: { label: t('transfer'), icon: ArrowLeftRight, color: 'text-primary' },
    investment_buy: { label: t('buy'), icon: ArrowDownCircle, color: 'text-investment' },
    investment_sell: { label: t('sell'), icon: ArrowUpCircle, color: 'text-investment' },
    loan_given: { label: t('moneyGiven'), icon: ArrowDownCircle, color: 'text-loan' },
    loan_received: { label: t('moneyReceived'), icon: ArrowUpCircle, color: 'text-loan' },
    loan_payment: { label: t('paid'), icon: ArrowLeftRight, color: 'text-loan' },
  }

  function getDateGroup(date: Date): string {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const monthAgo = new Date(today)
    monthAgo.setMonth(monthAgo.getMonth() - 1)

    const txDate = new Date(date)
    const txDateOnly = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate())

    if (txDateOnly.getTime() === today.getTime()) return t('today')
    if (txDateOnly.getTime() === yesterday.getTime()) return t('yesterday')
    if (txDateOnly >= weekAgo) return t('thisWeek')
    if (txDateOnly >= monthAgo) return t('thisMonth')
    return txDate.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { month: 'long', year: 'numeric' })
  }

  const getAccountName = (id?: number) => accounts.find((a) => a.id === id)?.name || 'Unknown'
  const getCategoryName = (id?: number) => categories.find((c) => c.id === id)?.name || 'Unknown'
  const getIncomeSourceName = (id?: number) => incomeSources.find((s) => s.id === id)?.name || 'Unknown'

  const filteredTransactions = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const monthAgo = new Date(today)
    monthAgo.setMonth(monthAgo.getMonth() - 1)
    const yearAgo = new Date(today)
    yearAgo.setFullYear(yearAgo.getFullYear() - 1)

    return transactions
      .filter((tx) => {
        // Type filter
        if (typeFilter !== 'all') {
          if (typeFilter === 'transfers') {
            if (tx.type !== 'transfer') return false
          } else if (typeFilter === 'investments') {
            if (tx.type !== 'investment_buy' && tx.type !== 'investment_sell') return false
          } else if (typeFilter === 'loans') {
            if (tx.type !== 'loan_given' && tx.type !== 'loan_received' && tx.type !== 'loan_payment') return false
          } else if (tx.type !== typeFilter) {
            return false
          }
        }

        // Category filter
        if (categoryFilter !== 'all') {
          if (tx.type === 'expense' && tx.categoryId?.toString() !== categoryFilter) return false
          if (tx.type === 'income' && tx.incomeSourceId?.toString() !== categoryFilter) return false
        }

        // Date filter
        if (dateFilter !== 'all') {
          const txDate = new Date(tx.date)
          if (dateFilter === 'today' && txDate < today) return false
          if (dateFilter === 'week' && txDate < weekAgo) return false
          if (dateFilter === 'month' && txDate < monthAgo) return false
          if (dateFilter === 'year' && txDate < yearAgo) return false
          if (dateFilter === 'custom') {
            if (customDateFrom) {
              const fromDate = new Date(customDateFrom)
              fromDate.setHours(0, 0, 0, 0)
              if (txDate < fromDate) return false
            }
            if (customDateTo) {
              const toDate = new Date(customDateTo)
              toDate.setHours(23, 59, 59, 999)
              if (txDate > toDate) return false
            }
          }
        }

        // Search query
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          const comment = tx.comment?.toLowerCase() || ''
          const accountName = getAccountName(tx.accountId).toLowerCase()
          const categoryName = getCategoryName(tx.categoryId).toLowerCase()
          const sourceName = getIncomeSourceName(tx.incomeSourceId).toLowerCase()
          if (!comment.includes(query) && !accountName.includes(query) && !categoryName.includes(query) && !sourceName.includes(query)) {
            return false
          }
        }
        return true
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions, typeFilter, categoryFilter, dateFilter, customDateFrom, customDateTo, searchQuery, accounts, categories, incomeSources])

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {}
    filteredTransactions.forEach((t) => {
      const group = getDateGroup(new Date(t.date))
      if (!groups[group]) groups[group] = []
      groups[group].push(t)
    })
    return groups
  }, [filteredTransactions])

  const handleDelete = async (transaction: Transaction) => {
    if (!transaction.id) return
    if (!confirm(t('deleteTransaction'))) return

    // Reverse the balance change
    if (transaction.type === 'income' && transaction.accountId) {
      await accountRepo.updateBalance(transaction.accountId, -transaction.amount)
    } else if (transaction.type === 'expense' && transaction.accountId) {
      await accountRepo.updateBalance(transaction.accountId, transaction.amount)
    } else if (transaction.type === 'transfer') {
      // Reverse transfer: add back to source, subtract from target
      if (transaction.accountId) {
        await accountRepo.updateBalance(transaction.accountId, transaction.amount)
      }
      if (transaction.toAccountId) {
        // Use toAmount for multi-currency transfers, otherwise use amount
        const targetAmount = transaction.toAmount ?? transaction.amount
        await accountRepo.updateBalance(transaction.toAccountId, -targetAmount)
      }
    } else if (transaction.type === 'loan_payment' && transaction.loanId) {
      const paymentAmount = transaction.mainCurrencyAmount ?? transaction.amount
      await loanRepo.reversePayment(transaction.loanId, paymentAmount)
      // Reverse account balance change
      if (transaction.accountId) {
        const loan = loans.find((l) => l.id === transaction.loanId)
        if (loan?.type === 'given') {
          await accountRepo.updateBalance(transaction.accountId, -transaction.amount)
        } else if (loan?.type === 'received') {
          await accountRepo.updateBalance(transaction.accountId, transaction.amount)
        }
      }
    }

    await transactionRepo.delete(transaction.id)
    await Promise.all([refreshTransactions(), refreshAccounts(), refreshLoans()])
  }

  const getTransactionTitle = (t: Transaction): string => {
    switch (t.type) {
      case 'income':
        return getIncomeSourceName(t.incomeSourceId)
      case 'expense':
        return getCategoryName(t.categoryId)
      case 'transfer':
        return `${getAccountName(t.accountId)} → ${getAccountName(t.toAccountId)}`
      default:
        return typeConfig[t.type].label
    }
  }

  // Get unique categories/sources for filter
  const filterOptions = useMemo(() => {
    if (typeFilter === 'expense') {
      return categories.map(c => ({ id: c.id!.toString(), name: c.name }))
    } else if (typeFilter === 'income') {
      return incomeSources.map(s => ({ id: s.id!.toString(), name: s.name }))
    }
    return []
  }, [typeFilter, categories, incomeSources])

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        {showSearch ? (
          <div className="flex-1 flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('searchTransactions')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
              autoFocus
            />
            <button onClick={() => { setShowSearch(false); setSearchQuery('') }}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold">{t('history')}</h1>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "p-2 rounded-full hover:bg-secondary touch-target",
                  showFilters && "bg-primary/20"
                )}
              >
                <Filter className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowSearch(true)}
                className="p-2 rounded-full hover:bg-secondary touch-target"
              >
                <Search className="h-5 w-5" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Filter Pills */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
        {(['all', 'income', 'expense', 'transfers', 'investments', 'loans'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => { setTypeFilter(filter); setCategoryFilter('all') }}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
              typeFilter === filter
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground'
            )}
          >
            {filter === 'all' ? t('all') :
             filter === 'transfers' ? t('transfers') :
             filter === 'investments' ? t('investments') :
             filter === 'loans' ? t('loansFilter') :
             t(filter)}
          </button>
        ))}
      </div>

      {/* Additional Filters */}
      {showFilters && (
        <div className="px-4 pb-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as typeof dateFilter)}>
              <SelectTrigger className="h-9">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allTime')}</SelectItem>
                <SelectItem value="today">{t('today')}</SelectItem>
                <SelectItem value="week">{t('thisWeek')}</SelectItem>
                <SelectItem value="month">{t('thisMonth')}</SelectItem>
                <SelectItem value="year">{t('thisYear')}</SelectItem>
                <SelectItem value="custom">{t('customRange')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Category/Source Filter */}
            {filterOptions.length > 0 && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={typeFilter === 'income' ? t('incomeSources') : t('categories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all')}</SelectItem>
                  {filterOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Custom Date Range */}
          {dateFilter === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t('from')}</label>
                <Input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t('to')}</label>
                <Input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transaction List */}
      <div className="flex-1 overflow-auto px-4">
        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>{t('noTransactionsFound')}</p>
          </div>
        ) : (
          Object.entries(groupedTransactions).map(([group, txs]) => (
            <div key={group} className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 sticky top-0 bg-background py-2">
                {group}
              </h3>
              <div className="space-y-2">
                {txs.map((transaction) => {
                  const config = typeConfig[transaction.type]
                  const Icon = config.icon
                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl"
                    >
                      <div className={cn('p-2 rounded-full bg-secondary', config.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {getTransactionTitle(transaction)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getAccountName(transaction.accountId)} • {formatShortDate(new Date(transaction.date), language)}
                          {transaction.comment && ` • ${transaction.comment}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          {transaction.type === 'transfer' ? (
                            // Transfer: show both amounts
                            <>
                              <span className="font-mono font-semibold text-foreground">
                                {formatCurrency(transaction.amount, transaction.currency)}
                              </span>
                              {transaction.toAmount != null && (
                                <p className="text-xs text-muted-foreground">
                                  → {formatCurrency(transaction.toAmount, accounts.find(a => a.id === transaction.toAccountId)?.currency || transaction.currency)}
                                </p>
                              )}
                            </>
                          ) : (
                            // Income/Expense
                            <>
                              <span
                                className={cn(
                                  'font-mono font-semibold',
                                  transaction.type === 'income' ? 'text-success' : 'text-foreground'
                                )}
                              >
                                {formatCurrency(transaction.amount, transaction.currency)}
                              </span>
                              {transaction.mainCurrencyAmount != null && (
                                <p className="text-xs text-muted-foreground">
                                  {formatCurrency(transaction.mainCurrencyAmount, mainCurrency)}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                        <button
                          onClick={() => handleDelete(transaction)}
                          className="p-2 rounded-full hover:bg-destructive/20 touch-target"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
