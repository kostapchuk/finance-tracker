import { useState, useMemo, useEffect } from 'react'
import { ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, Search, X, Filter, Calendar, Wallet } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore } from '@/store/useAppStore'
import { useLanguage } from '@/hooks/useLanguage'
import { transactionRepo, loanRepo, accountRepo } from '@/database/repositories'
import { formatCurrency } from '@/utils/currency'
import { BlurredAmount } from '@/components/ui/BlurredAmount'
import { cn } from '@/utils/cn'
import { reverseTransactionBalance } from '@/utils/transactionBalance'
import { QuickTransactionModal, type TransactionMode } from '@/components/ui/QuickTransactionModal'
import { LoanForm, type LoanFormData } from '@/features/loans/components/LoanForm'
import { PaymentDialog } from '@/features/loans/components/PaymentDialog'
import type { Transaction, TransactionType, Loan } from '@/database/types'

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

  const historyCategoryFilter = useAppStore((state) => state.historyCategoryFilter)
  const historyAccountFilter = useAppStore((state) => state.historyAccountFilter)

  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType | 'transfers' | 'loans'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [accountFilter, setAccountFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('all')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  // Edit state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [editModalType, setEditModalType] = useState<'quick' | 'loan' | 'payment' | null>(null)
  const [editTransactionMode, setEditTransactionMode] = useState<TransactionMode | null>(null)
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null)

  useEffect(() => {
    if (historyCategoryFilter !== null) {
      setCategoryFilter(String(historyCategoryFilter))
      setTypeFilter('expense')
      setDateFilter('month')
      setShowFilters(true)
      useAppStore.setState({ historyCategoryFilter: null })
    }
  }, [historyCategoryFilter])

  useEffect(() => {
    if (historyAccountFilter !== null) {
      setAccountFilter(String(historyAccountFilter))
      setShowFilters(true)
      useAppStore.setState({ historyAccountFilter: null })
    }
  }, [historyAccountFilter])

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

  const getAccountName = (id?: number) => {
    const account = accounts.find((a) => a.id === id)
    return account ? `${account.name} (${account.currency})` : 'Unknown'
  }
  const getAccountNameWithCurrency = getAccountName
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

        // Account filter
        if (accountFilter !== 'all') {
          const accountId = accountFilter
          if (tx.accountId?.toString() !== accountId && tx.toAccountId?.toString() !== accountId) return false
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
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        if (dateA !== dateB) {
          return dateB - dateA
        }
        return (b.id || 0) - (a.id || 0)
      })
  }, [transactions, typeFilter, categoryFilter, accountFilter, dateFilter, customDateFrom, customDateTo, searchQuery, accounts, categories, incomeSources])

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
    if (transaction.type === 'income' || transaction.type === 'expense' || transaction.type === 'transfer') {
      // Build the TransactionMode for QuickTransactionModal
      if (transaction.type === 'income') {
        const source = incomeSources.find(s => s.id === transaction.incomeSourceId)
        if (source) {
          setEditTransactionMode({ type: 'income', source })
          setEditModalType('quick')
        }
      } else if (transaction.type === 'expense') {
        const category = categories.find(c => c.id === transaction.categoryId)
        if (category) {
          setEditTransactionMode({ type: 'expense', category })
          setEditModalType('quick')
        }
      } else if (transaction.type === 'transfer') {
        const fromAccount = accounts.find(a => a.id === transaction.accountId)
        const toAccount = accounts.find(a => a.id === transaction.toAccountId)
        if (fromAccount && toAccount) {
          setEditTransactionMode({ type: 'transfer', fromAccount, toAccount })
          setEditModalType('quick')
        }
      }
    } else if (transaction.type === 'loan_given' || transaction.type === 'loan_received') {
      // Find the associated loan
      const loan = loans.find(l => l.id === transaction.loanId)
      if (loan) {
        setEditingLoan(loan)
        setEditModalType('loan')
      }
    } else if (transaction.type === 'loan_payment') {
      // Find the associated loan for payment editing
      const loan = loans.find(l => l.id === transaction.loanId)
      if (loan) {
        setEditingLoan(loan)
        setEditModalType('payment')
      }
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
    const account = accounts.find(a => a.id === data.accountId)

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
              className="flex-1 bg-transparent outline-none text-base"
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
        {(['all', 'income', 'expense', 'transfers', 'loans'] as const).map((filter) => (
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
                <span className="truncate">
                  {dateFilter === 'all' ? t('allTime') :
                   dateFilter === 'today' ? t('today') :
                   dateFilter === 'week' ? t('thisWeek') :
                   dateFilter === 'month' ? t('thisMonth') :
                   dateFilter === 'year' ? t('thisYear') :
                   t('customRange')}
                </span>
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

            {/* Account Filter */}
            <Select value={accountFilter} onValueChange={setAccountFilter}>
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
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder={typeFilter === 'income' ? t('incomeSources') : t('categories')}>
                  {categoryFilter === 'all'
                    ? t('all')
                    : filterOptions.find(opt => opt.id === categoryFilter)?.name || t('all')}
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
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t('to')}</label>
                <Input
                  type="date"
                  lang={language}
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
                      onClick={() => handleEdit(transaction)}
                      className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl cursor-pointer active:bg-secondary/70 transition-colors"
                    >
                      <div className={cn('p-2 rounded-full bg-secondary', config.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {getTransactionTitle(transaction)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getAccountNameWithCurrency(transaction.accountId)}
                          {group !== t('today') && group !== t('yesterday') && ` • ${formatShortDate(new Date(transaction.date), language)}`}
                          {transaction.comment && ` • ${transaction.comment}`}
                        </p>
                      </div>
                      <div className="text-right">
                        {transaction.type === 'transfer' ? (
                          // Transfer: show both amounts
                          (() => {
                            const fromAmount = transaction.amount
                            const fromCurrency = transaction.currency
                            const toAmount = transaction.toAmount
                            const toAccount = accounts.find(a => a.id === transaction.toAccountId)
                            const toCurrency = toAccount?.currency || fromCurrency
                            
                            const isMultiCurrency = toAmount != null && fromCurrency !== toCurrency
                            
                            // If target is main currency but source is not, swap them to show main currency as primary
                            if (isMultiCurrency && toCurrency === mainCurrency && fromCurrency !== mainCurrency) {
                              return (
                                <>
                                  <BlurredAmount className="font-mono font-semibold text-foreground">
                                    {formatCurrency(toAmount, toCurrency)}
                                  </BlurredAmount>
                                  <p className="text-xs text-muted-foreground">
                                    ← <BlurredAmount>{formatCurrency(fromAmount, fromCurrency)}</BlurredAmount>
                                  </p>
                                </>
                              )
                            }

                            return (
                              <>
                                <BlurredAmount className="font-mono font-semibold text-foreground">
                                  {formatCurrency(fromAmount, fromCurrency)}
                                </BlurredAmount>
                                {toAmount != null && (
                                  <p className="text-xs text-muted-foreground">
                                    → <BlurredAmount>{formatCurrency(toAmount, toCurrency)}</BlurredAmount>
                                  </p>
                                )}
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
                                <BlurredAmount>{formatCurrency(transaction.amount, transaction.currency)}</BlurredAmount>
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
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
