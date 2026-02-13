import {
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowLeftRight,
  Search,
  X,
  Filter,
  Calendar,
  Wallet,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { useState, useMemo, useEffect, useCallback, useRef, useReducer } from 'react'

import { BlurredAmount } from '@/components/ui/BlurredAmount'
import { QuickTransactionModal, type TransactionMode } from '@/components/ui/QuickTransactionModal'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { transactionRepo, loanRepo, accountRepo } from '@/database/repositories'
import type { Transaction, TransactionType, Loan } from '@/database/types'
import { LoanForm, type LoanFormData } from '@/features/loans/components/LoanForm'
import { PaymentDialog } from '@/features/loans/components/PaymentDialog'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { useLanguage } from '@/hooks/useLanguage'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/currency'
import { getStartOfMonth, getStartOfWeek, getEndOfMonth, formatDateForInput } from '@/utils/date'
import { reverseTransactionBalance } from '@/utils/transactionBalance'

type DateFilterType =
  | 'all'
  | 'today'
  | 'week'
  | 'month'
  | 'last3months'
  | 'last6months'
  | 'year'
  | 'custom'

interface FilterState {
  typeFilter: 'all' | TransactionType | 'transfers' | 'loans'
  categoryFilter: string
  accountFilter: string
  dateFilter: DateFilterType
  customDateFrom: string
  customDateTo: string
  searchQuery: string
  displayCount: number
  showFilters: boolean
}

type FilterAction =
  | { type: 'SET_TYPE_FILTER'; payload: FilterState['typeFilter'] }
  | { type: 'SET_CATEGORY_FILTER'; payload: string }
  | { type: 'SET_ACCOUNT_FILTER'; payload: string }
  | { type: 'SET_DATE_FILTER'; payload: DateFilterType }
  | { type: 'SET_CUSTOM_DATE_FROM'; payload: string }
  | { type: 'SET_CUSTOM_DATE_TO'; payload: string }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SHOW_FILTERS'; payload: boolean }
  | { type: 'LOAD_MORE' }
  | { type: 'APPLY_CATEGORY_NAV'; payload: number }
  | { type: 'APPLY_ACCOUNT_NAV'; payload: number }

function getInitialFilterState(): FilterState {
  const selectedMonth = useAppStore.getState().selectedMonth
  const now = new Date()
  const isCurrentMonth =
    selectedMonth.getMonth() === now.getMonth() && selectedMonth.getFullYear() === now.getFullYear()

  return {
    typeFilter: 'all',
    categoryFilter: 'all',
    accountFilter: 'all',
    dateFilter: isCurrentMonth ? 'month' : 'custom',
    customDateFrom: isCurrentMonth ? '' : formatDateForInput(getStartOfMonth(selectedMonth)),
    customDateTo: isCurrentMonth ? '' : formatDateForInput(getEndOfMonth(selectedMonth)),
    searchQuery: '',
    displayCount: 50,
    showFilters: !isCurrentMonth,
  }
}

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'SET_TYPE_FILTER':
      return { ...state, typeFilter: action.payload, categoryFilter: 'all', displayCount: 50 }
    case 'SET_CATEGORY_FILTER':
      return { ...state, categoryFilter: action.payload, displayCount: 50 }
    case 'SET_ACCOUNT_FILTER':
      return { ...state, accountFilter: action.payload, displayCount: 50 }
    case 'SET_DATE_FILTER':
      return { ...state, dateFilter: action.payload, displayCount: 50 }
    case 'SET_CUSTOM_DATE_FROM':
      return { ...state, customDateFrom: action.payload, displayCount: 50 }
    case 'SET_CUSTOM_DATE_TO':
      return { ...state, customDateTo: action.payload, displayCount: 50 }
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload, displayCount: 50 }
    case 'SET_SHOW_FILTERS':
      return { ...state, showFilters: action.payload }
    case 'LOAD_MORE':
      return { ...state, displayCount: state.displayCount + 50 }
    case 'APPLY_CATEGORY_NAV':
      return {
        ...state,
        categoryFilter: String(action.payload),
        typeFilter: 'expense',
        dateFilter: 'month',
        showFilters: true,
        displayCount: 50,
      }
    case 'APPLY_ACCOUNT_NAV':
      return {
        ...state,
        accountFilter: String(action.payload),
        showFilters: true,
        displayCount: 50,
      }
    default:
      return state
  }
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

  const historyCategoryFilter = useAppStore((state) => state.historyCategoryFilter)
  const historyAccountFilter = useAppStore((state) => state.historyAccountFilter)

  const [filterState, dispatch] = useReducer(filterReducer, null, getInitialFilterState)
  const {
    typeFilter,
    categoryFilter,
    accountFilter,
    dateFilter,
    customDateFrom,
    customDateTo,
    searchQuery,
    displayCount,
    showFilters,
  } = filterState

  const [showSearch, setShowSearch] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [editModalType, setEditModalType] = useState<'quick' | 'loan' | 'payment' | null>(null)
  const [editTransactionMode, setEditTransactionMode] = useState<TransactionMode | null>(null)
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null)

  const navAppliedRef = useRef(false)

  useEffect(() => {
    if (historyCategoryFilter !== null && !navAppliedRef.current) {
      navAppliedRef.current = true
      dispatch({ type: 'APPLY_CATEGORY_NAV', payload: historyCategoryFilter })
      useAppStore.setState({ historyCategoryFilter: null })
    }
  }, [historyCategoryFilter])

  useEffect(() => {
    if (historyAccountFilter !== null && !navAppliedRef.current) {
      navAppliedRef.current = true
      dispatch({ type: 'APPLY_ACCOUNT_NAV', payload: historyAccountFilter })
      useAppStore.setState({ historyAccountFilter: null })
    }
  }, [historyAccountFilter])

  const typeConfig: Record<
    TransactionType,
    { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
  > = {
    income: { label: t('income'), icon: ArrowUpCircle, color: 'text-success' },
    expense: { label: t('expense'), icon: ArrowDownCircle, color: 'text-destructive' },
    transfer: { label: t('transfer'), icon: ArrowLeftRight, color: 'text-primary' },
    investment_buy: { label: t('buy'), icon: ArrowDownCircle, color: 'text-investment' },
    investment_sell: { label: t('sell'), icon: ArrowUpCircle, color: 'text-investment' },
    loan_given: { label: t('moneyGiven'), icon: ArrowDownCircle, color: 'text-loan' },
    loan_received: { label: t('moneyReceived'), icon: ArrowUpCircle, color: 'text-loan' },
    loan_payment: { label: t('paid'), icon: ArrowLeftRight, color: 'text-loan' },
  }

  const getAccountName = (id?: number) => {
    const account = accounts.find((a) => a.id === id)
    return account ? `${account.name} (${account.currency})` : 'Unknown'
  }
  const getAccountNameWithCurrency = getAccountName
  const getCategoryName = (id?: number) => categories.find((c) => c.id === id)?.name || 'Unknown'
  const getIncomeSourceName = (id?: number) =>
    incomeSources.find((s) => s.id === id)?.name || 'Unknown'

  const filteredTransactions = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = getStartOfWeek()
    const monthStart = getStartOfMonth()
    const threeMonthsAgo = new Date(today)
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const sixMonthsAgo = new Date(today)
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const yearStart = new Date(now.getFullYear(), 0, 1)

    const matchAccount = (id?: number) => {
      const account = accounts.find((a) => a.id === id)
      return account ? `${account.name} (${account.currency})` : 'Unknown'
    }
    const matchCategory = (id?: number) => categories.find((c) => c.id === id)?.name || 'Unknown'
    const matchIncomeSource = (id?: number) =>
      incomeSources.find((s) => s.id === id)?.name || 'Unknown'

    return transactions
      .filter((tx) => {
        // Type filter
        if (typeFilter !== 'all') {
          if (typeFilter === 'transfers') {
            if (tx.type !== 'transfer') return false
          } else if (typeFilter === 'loans') {
            if (
              tx.type !== 'loan_given' &&
              tx.type !== 'loan_received' &&
              tx.type !== 'loan_payment'
            )
              return false
          } else if (tx.type !== typeFilter) {
            return false
          }
        }

        // Category filter
        if (categoryFilter !== 'all') {
          if (tx.type === 'expense' && tx.categoryId?.toString() !== categoryFilter) return false
          if (tx.type === 'income' && tx.incomeSourceId?.toString() !== categoryFilter) return false
        }

        // Account filter
        if (accountFilter !== 'all') {
          const accountId = accountFilter
          if (tx.accountId?.toString() !== accountId && tx.toAccountId?.toString() !== accountId)
            return false
        }

        // Date filter
        if (dateFilter !== 'all') {
          const txDate = new Date(tx.date)
          if (dateFilter === 'today' && txDate < today) return false
          if (dateFilter === 'week' && txDate < weekStart) return false
          if (dateFilter === 'month' && txDate < monthStart) return false
          if (dateFilter === 'last3months' && txDate < threeMonthsAgo) return false
          if (dateFilter === 'last6months' && txDate < sixMonthsAgo) return false
          if (dateFilter === 'year' && txDate < yearStart) return false
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
          const accountName = matchAccount(tx.accountId).toLowerCase()
          const categoryName = matchCategory(tx.categoryId).toLowerCase()
          const sourceName = matchIncomeSource(tx.incomeSourceId).toLowerCase()
          if (
            !comment.includes(query) &&
            !accountName.includes(query) &&
            !categoryName.includes(query) &&
            !sourceName.includes(query)
          ) {
            return false
          }
        }
        return true
      })
      .sort((a, b) => {
        const dateA = new Date(a.date)
        const dateB = new Date(b.date)
        const dateOnlyA = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate()).getTime()
        const dateOnlyB = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate()).getTime()
        if (dateOnlyA !== dateOnlyB) {
          return dateOnlyB - dateOnlyA
        }
        const createdAtA = new Date(a.createdAt).getTime()
        const createdAtB = new Date(b.createdAt).getTime()
        if (createdAtA !== createdAtB) {
          return createdAtB - createdAtA
        }
        return (b.id || 0) - (a.id || 0)
      })
  }, [
    transactions,
    typeFilter,
    categoryFilter,
    accountFilter,
    dateFilter,
    customDateFrom,
    customDateTo,
    searchQuery,
    accounts,
    categories,
    incomeSources,
  ])

  // Period summary for header
  const periodSummary = useMemo(() => {
    let inflows = 0
    let outflows = 0

    filteredTransactions.forEach((tx) => {
      const amount = tx.mainCurrencyAmount ?? tx.amount

      if (tx.type === 'income' || tx.type === 'loan_received') {
        inflows += amount
      } else if (tx.type === 'expense' || tx.type === 'loan_given') {
        outflows += amount
      }
    })

    return { inflows, outflows, net: inflows - outflows }
  }, [filteredTransactions])

  // Paginated transactions for display
  const displayedTransactions = useMemo(() => {
    return filteredTransactions.slice(0, displayCount)
  }, [filteredTransactions, displayCount])

  const hasMore = displayCount < filteredTransactions.length

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    await new Promise((r) => setTimeout(r, 50))
    dispatch({ type: 'LOAD_MORE' })
    setIsLoadingMore(false)
  }, [isLoadingMore, hasMore])

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading: isLoadingMore,
  })

  const groupedTransactions = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const getDateGroup = (date: Date): string => {
      const txDate = new Date(date)
      const txDateOnly = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate())

      if (txDateOnly.getTime() === today.getTime()) {
        const weekday = txDate.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
          weekday: 'long',
        })
        return `${t('today')}, ${weekday}`
      }
      if (txDateOnly.getTime() === yesterday.getTime()) {
        const weekday = txDate.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
          weekday: 'long',
        })
        return `${t('yesterday')}, ${weekday}`
      }
      return txDate.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: txDate.getFullYear() === now.getFullYear() ? undefined : 'numeric',
      })
    }

    const groups: Record<string, Transaction[]> = {}
    displayedTransactions.forEach((tx) => {
      const group = getDateGroup(new Date(tx.date))
      if (!groups[group]) groups[group] = []
      groups[group].push(tx)
    })
    return groups
  }, [displayedTransactions, t, language])

  const handleDelete = async (transaction: Transaction) => {
    if (!transaction.id) return
    if (!confirm(t('deleteTransaction'))) return

    // Close the modal first
    handleCloseEditModal()

    // Reverse the balance effects
    await reverseTransactionBalance(transaction, loans)

    await transactionRepo.delete(transaction.id)
    await Promise.all([refreshTransactions(), refreshAccounts(), refreshLoans()])
  }

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction)

    // Determine the modal type based on transaction type
    switch (transaction.type) {
      case 'income':
      case 'expense':
      case 'transfer': {
        // Build the TransactionMode for QuickTransactionModal
        switch (transaction.type) {
          case 'income': {
            const source = incomeSources.find((s) => s.id === transaction.incomeSourceId)
            if (source) {
              setEditTransactionMode({ type: 'income', source })
              setEditModalType('quick')
            }

            break
          }
          case 'expense': {
            const category = categories.find((c) => c.id === transaction.categoryId)
            if (category) {
              setEditTransactionMode({ type: 'expense', category })
              setEditModalType('quick')
            }

            break
          }
          case 'transfer': {
            const fromAccount = accounts.find((a) => a.id === transaction.accountId)
            const toAccount = accounts.find((a) => a.id === transaction.toAccountId)
            if (fromAccount && toAccount) {
              setEditTransactionMode({ type: 'transfer', fromAccount, toAccount })
              setEditModalType('quick')
            }

            break
          }
          // No default
        }

        break
      }
      case 'loan_given':
      case 'loan_received': {
        // Find the associated loan
        const loan = loans.find((l) => l.id === transaction.loanId)
        if (loan) {
          setEditingLoan(loan)
          setEditModalType('loan')
        }

        break
      }
      case 'loan_payment': {
        // Find the associated loan for payment editing
        const loan = loans.find((l) => l.id === transaction.loanId)
        if (loan) {
          setEditingLoan(loan)
          setEditModalType('payment')
        }

        break
      }
      // No default
    }
  }

  const handleCloseEditModal = () => {
    setEditingTransaction(null)
    setEditModalType(null)
    setEditTransactionMode(null)
    setEditingLoan(null)
  }

  const handleSaveLoan = async (data: LoanFormData, isEdit: boolean, loanId?: number) => {
    if (!isEdit || !loanId || !editingTransaction) return

    // Get the old transaction to reverse its effects
    const oldTransaction = editingTransaction

    // 1. Reverse old transaction's balance effect
    await reverseTransactionBalance(oldTransaction, loans)

    // 2. Update the loan record
    await loanRepo.update(loanId, {
      type: data.type,
      personName: data.personName,
      description: data.description,
      amount: data.amount,
      currency: data.currency,
      accountId: data.accountId,
      dueDate: data.dueDate,
    })

    // 3. Calculate new balance amount
    const newBalanceAmount = data.accountAmount ?? data.amount
    const account = accounts.find((a) => a.id === data.accountId)

    // 4. Update the transaction record
    await transactionRepo.update(oldTransaction.id!, {
      amount: newBalanceAmount,
      currency: account?.currency || data.currency,
      accountId: data.accountId,
      mainCurrencyAmount: data.currency === mainCurrency ? data.amount : undefined,
      comment: oldTransaction.comment,
    })

    // 5. Apply new balance effect
    // loan_given: money goes out → balance decreases
    // loan_received: money comes in → balance increases
    const balanceChange = data.type === 'given' ? -newBalanceAmount : newBalanceAmount
    await accountRepo.updateBalance(data.accountId, balanceChange)

    // Refresh all data
    await Promise.all([refreshTransactions(), refreshAccounts(), refreshLoans()])
    handleCloseEditModal()
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
      return categories.map((c) => ({ id: c.id!.toString(), name: c.name }))
    } else if (typeFilter === 'income') {
      return incomeSources.map((s) => ({ id: s.id!.toString(), name: s.name }))
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
              onChange={(e) => dispatch({ type: 'SET_SEARCH_QUERY', payload: e.target.value })}
              className="flex-1 bg-transparent outline-none text-base"
              autoFocus
            />
            <button
              onClick={() => {
                setShowSearch(false)
                dispatch({ type: 'SET_SEARCH_QUERY', payload: '' })
              }}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold">{t('history')}</h1>
            <div className="flex items-center gap-1">
              <button
                onClick={() => dispatch({ type: 'SET_SHOW_FILTERS', payload: !showFilters })}
                className={cn(
                  'p-2 rounded-full hover:bg-secondary touch-target',
                  showFilters && 'bg-primary/20'
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
        {(['all', 'income', 'expense', 'transfers', 'loans'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => dispatch({ type: 'SET_TYPE_FILTER', payload: filter })}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
              typeFilter === filter
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground'
            )}
          >
            {filter === 'all'
              ? t('all')
              : filter === 'transfers'
                ? t('transfers')
                : filter === 'loans'
                  ? t('loansFilter')
                  : t(filter)}
          </button>
        ))}
      </div>

      {/* Additional Filters */}
      {showFilters && (
        <div className="px-4 pb-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {/* Date Filter */}
            <Select
              value={dateFilter}
              onValueChange={(v) =>
                dispatch({ type: 'SET_DATE_FILTER', payload: v as DateFilterType })
              }
            >
              <SelectTrigger className="h-9">
                <Calendar className="h-4 w-4 mr-2" />
                <span className="truncate">
                  {dateFilter === 'today'
                    ? t('today')
                    : dateFilter === 'week'
                      ? t('thisWeek')
                      : dateFilter === 'month'
                        ? t('thisMonth')
                        : dateFilter === 'last3months'
                          ? t('last3Months')
                          : dateFilter === 'last6months'
                            ? t('last6Months')
                            : dateFilter === 'year'
                              ? t('thisYear')
                              : dateFilter === 'custom'
                                ? t('customRange')
                                : t('allTime')}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">{t('today')}</SelectItem>
                <SelectItem value="week">{t('thisWeek')}</SelectItem>
                <SelectItem value="month">{t('thisMonth')}</SelectItem>
                <SelectItem value="last3months">{t('last3Months')}</SelectItem>
                <SelectItem value="last6months">{t('last6Months')}</SelectItem>
                <SelectItem value="year">{t('thisYear')}</SelectItem>
                <SelectItem value="custom">{t('customRange')}</SelectItem>
                <SelectItem value="all">{t('allTime')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Account Filter */}
            <Select
              value={accountFilter}
              onValueChange={(v) => dispatch({ type: 'SET_ACCOUNT_FILTER', payload: v })}
            >
              <SelectTrigger className="h-9">
                <Wallet className="h-4 w-4 mr-2" />
                <span className="truncate">
                  {accountFilter === 'all'
                    ? t('allAccounts')
                    : getAccountNameWithCurrency(parseInt(accountFilter))}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allAccounts')}</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id!.toString()}>
                    {acc.name} ({acc.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category/Source Filter */}
          {filterOptions.length > 0 && (
            <Select
              value={categoryFilter}
              onValueChange={(v) => dispatch({ type: 'SET_CATEGORY_FILTER', payload: v })}
            >
              <SelectTrigger className="h-9">
                <SelectValue
                  placeholder={typeFilter === 'income' ? t('incomeSources') : t('categories')}
                >
                  {categoryFilter === 'all'
                    ? t('all')
                    : filterOptions.find((opt) => opt.id === categoryFilter)?.name || t('all')}
                </SelectValue>
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

          {/* Custom Date Range */}
          {dateFilter === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t('from')}</label>
                <Input
                  type="date"
                  lang={language}
                  value={customDateFrom}
                  onChange={(e) =>
                    dispatch({ type: 'SET_CUSTOM_DATE_FROM', payload: e.target.value })
                  }
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t('to')}</label>
                <Input
                  type="date"
                  lang={language}
                  value={customDateTo}
                  onChange={(e) =>
                    dispatch({ type: 'SET_CUSTOM_DATE_TO', payload: e.target.value })
                  }
                  className="h-9"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Period Summary Header */}
      {filteredTransactions.length > 0 && (
        <div className="px-4 py-2 grid grid-cols-3 gap-2">
          <div className="p-3 bg-secondary/50 rounded-2xl text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-success" />
              <span className="text-xs text-muted-foreground">{t('inflows')}</span>
            </div>
            <BlurredAmount className="text-base font-bold text-success block">
              +{formatCurrency(periodSummary.inflows, mainCurrency)}
            </BlurredAmount>
          </div>
          <div className="p-3 bg-secondary/50 rounded-2xl text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              {periodSummary.net >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-foreground" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-foreground" />
              )}
              <span className="text-xs text-muted-foreground">{t('net')}</span>
            </div>
            <BlurredAmount className="text-base font-bold text-foreground block">
              {periodSummary.net >= 0 ? '+' : '-'}
              {formatCurrency(Math.abs(periodSummary.net), mainCurrency)}
            </BlurredAmount>
          </div>
          <div className="p-3 bg-secondary/50 rounded-2xl text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              <span className="text-xs text-muted-foreground">{t('outflows')}</span>
            </div>
            <BlurredAmount className="text-base font-bold text-destructive block">
              -{formatCurrency(periodSummary.outflows, mainCurrency)}
            </BlurredAmount>
          </div>
        </div>
      )}

      {/* Transaction List */}
      <div className="flex-1 overflow-auto px-4">
        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>{t('noTransactionsFound')}</p>
          </div>
        ) : (
          Object.entries(groupedTransactions).map(([group, txs]) => {
            const groupExpenseTotal = txs
              .filter((tx) => tx.type === 'expense')
              .reduce((sum, tx) => sum + (tx.mainCurrencyAmount ?? tx.amount), 0)

            return (
              <div key={group} className="mb-6">
                <h3 className="flex justify-between items-center text-sm font-semibold text-muted-foreground mb-2 sticky top-0 bg-background py-2">
                  <span>{group}</span>
                  {groupExpenseTotal > 0 && (
                    <BlurredAmount className="font-mono text-destructive">
                      -{formatCurrency(groupExpenseTotal, mainCurrency)}
                    </BlurredAmount>
                  )}
                </h3>
                <div className="space-y-2">
                  {txs.map((transaction) => {
                    const config = typeConfig[transaction.type]
                    const Icon = config.icon
                    return (
                      <button
                        type="button"
                        key={transaction.id}
                        onClick={() => handleEdit(transaction)}
                        className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl cursor-pointer active:bg-secondary/70 transition-colors w-full text-left"
                      >
                        <div className={cn('p-2 rounded-full bg-secondary', config.color)}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{getTransactionTitle(transaction)}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            <span>{getAccountNameWithCurrency(transaction.accountId)}</span>
                            {transaction.comment && (
                              <span className="truncate max-w-[100px] inline-block align-bottom">
                                {' '}
                                • {transaction.comment}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          {transaction.type === 'transfer' ? (
                            // Transfer: show amounts like other transaction types
                            (() => {
                              const fromAmount = transaction.amount
                              const fromCurrency = transaction.currency
                              const toAmount = transaction.toAmount
                              const toAccount = accounts.find(
                                (a) => a.id === transaction.toAccountId
                              )
                              const toCurrency = toAccount?.currency || fromCurrency

                              const isMultiCurrency =
                                toAmount != null && fromCurrency !== toCurrency

                              // For same currency, show single amount
                              if (!isMultiCurrency) {
                                return (
                                  <BlurredAmount className="font-mono font-semibold text-foreground">
                                    {formatCurrency(fromAmount, fromCurrency)}
                                  </BlurredAmount>
                                )
                              }

                              // For multi-currency, show main currency as primary
                              if (toCurrency === mainCurrency) {
                                return (
                                  <>
                                    <BlurredAmount className="font-mono font-semibold text-foreground">
                                      {formatCurrency(toAmount!, toCurrency)}
                                    </BlurredAmount>
                                    <p className="text-xs text-muted-foreground">
                                      <BlurredAmount>
                                        {formatCurrency(fromAmount, fromCurrency)}
                                      </BlurredAmount>
                                    </p>
                                  </>
                                )
                              }

                              if (fromCurrency === mainCurrency) {
                                return (
                                  <>
                                    <BlurredAmount className="font-mono font-semibold text-foreground">
                                      {formatCurrency(fromAmount, fromCurrency)}
                                    </BlurredAmount>
                                    <p className="text-xs text-muted-foreground">
                                      <BlurredAmount>
                                        {formatCurrency(toAmount!, toCurrency)}
                                      </BlurredAmount>
                                    </p>
                                  </>
                                )
                              }

                              // Neither is main currency, show from as primary
                              return (
                                <>
                                  <BlurredAmount className="font-mono font-semibold text-foreground">
                                    {formatCurrency(fromAmount, fromCurrency)}
                                  </BlurredAmount>
                                  <p className="text-xs text-muted-foreground">
                                    <BlurredAmount>
                                      {formatCurrency(toAmount!, toCurrency)}
                                    </BlurredAmount>
                                  </p>
                                </>
                              )
                            })()
                          ) : (
                            // Income/Expense/Loans/Investments
                            <>
                              <BlurredAmount
                                className={cn(
                                  'font-mono font-semibold',
                                  transaction.type === 'income' ? 'text-success' : 'text-foreground'
                                )}
                              >
                                {transaction.mainCurrencyAmount != null
                                  ? formatCurrency(transaction.mainCurrencyAmount, mainCurrency)
                                  : formatCurrency(transaction.amount, transaction.currency)}
                              </BlurredAmount>
                              {transaction.mainCurrencyAmount != null &&
                                transaction.currency !== mainCurrency && (
                                  <p className="text-xs text-muted-foreground">
                                    <BlurredAmount>
                                      {formatCurrency(transaction.amount, transaction.currency)}
                                    </BlurredAmount>
                                  </p>
                                )}
                            </>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}

        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} className="h-1" />

        {isLoadingMore && (
          <div className="flex justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {!hasMore && filteredTransactions.length > 50 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            {t('showingAllTransactions').replace('{count}', String(filteredTransactions.length))}
          </p>
        )}
      </div>

      {/* Edit Modals */}
      {editModalType === 'quick' && editTransactionMode && editingTransaction && (
        <QuickTransactionModal
          mode={editTransactionMode}
          accounts={accounts}
          preselectedAccountId={editingTransaction.accountId}
          editTransaction={editingTransaction}
          disableAutoFocus
          onDelete={handleDelete}
          onClose={handleCloseEditModal}
        />
      )}

      {editModalType === 'loan' && editingLoan && (
        <LoanForm
          loan={editingLoan}
          open={true}
          onClose={handleCloseEditModal}
          onSave={handleSaveLoan}
        />
      )}

      {editModalType === 'payment' && editingLoan && editingTransaction && (
        <PaymentDialog
          loan={editingLoan}
          open={true}
          onClose={handleCloseEditModal}
          editTransaction={editingTransaction}
        />
      )}
    </div>
  )
}
