import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

import { transactionRepo } from '@/database/repositories'
import type { Transaction, TransactionType } from '@/database/types'

type DateFilterType =
  | 'all'
  | 'today'
  | 'week'
  | 'month'
  | 'last3months'
  | 'last6months'
  | 'year'
  | 'custom'

interface FilterOptions {
  typeFilter: 'all' | TransactionType | 'transfers' | 'loans'
  categoryFilter: string
  accountFilter: string
  dateFilter: DateFilterType
  customDateFrom: string
  customDateTo: string
}

interface PeriodSummary {
  inflows: number
  outflows: number
  net: number
}

interface UsePaginatedTransactionsResult {
  transactions: Transaction[]
  periodSummary: PeriodSummary
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  isOffline: boolean
  loadMore: () => Promise<void>
}

const PAGE_SIZE = 50

// Helper to process transactions synchronously (pure function, no hooks)
function getDateRange(dateFilter: DateFilterType, customDateFrom?: string, customDateTo?: string) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (dateFilter) {
    case 'today':
      return { startDate: today, endDate: now }
    case 'week': {
      const weekStart = new Date(today)
      const day = weekStart.getDay()
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1)
      weekStart.setDate(diff)
      return { startDate: weekStart, endDate: now }
    }
    case 'month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      return { startDate: monthStart, endDate: now }
    }
    case 'last3months': {
      const threeMonthsAgo = new Date(today)
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      return { startDate: threeMonthsAgo, endDate: now }
    }
    case 'last6months': {
      const sixMonthsAgo = new Date(today)
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      return { startDate: sixMonthsAgo, endDate: now }
    }
    case 'year': {
      const yearStart = new Date(now.getFullYear(), 0, 1)
      return { startDate: yearStart, endDate: now }
    }
    case 'custom': {
      let startDate: Date | undefined
      let endDate: Date | undefined
      if (customDateFrom) {
        startDate = new Date(customDateFrom)
        startDate.setHours(0, 0, 0, 0)
      }
      if (customDateTo) {
        endDate = new Date(customDateTo)
        endDate.setHours(23, 59, 59, 999)
      }
      return { startDate, endDate }
    }
    default:
      return { startDate: undefined, endDate: undefined }
  }
}

function applyFilters(txs: Transaction[], opts: FilterOptions) {
  const { typeFilter, categoryFilter, accountFilter, dateFilter, customDateFrom, customDateTo } =
    opts
  const { startDate, endDate } = getDateRange(dateFilter, customDateFrom, customDateTo)

  return txs.filter((tx) => {
    if (typeFilter !== 'all') {
      if (typeFilter === 'transfers') {
        if (tx.type !== 'transfer') return false
      } else if (typeFilter === 'loans') {
        if (tx.type !== 'loan_given' && tx.type !== 'loan_received' && tx.type !== 'loan_payment')
          return false
      } else if (tx.type !== typeFilter) {
        return false
      }
    }

    if (categoryFilter !== 'all') {
      if (tx.type === 'expense' && tx.categoryId?.toString() !== categoryFilter) return false
      if (tx.type === 'income' && tx.incomeSourceId?.toString() !== categoryFilter) return false
    }

    if (accountFilter !== 'all') {
      const matchesAccount =
        tx.accountId?.toString() === accountFilter || tx.toAccountId?.toString() === accountFilter
      if (!matchesAccount) return false
    }

    if (startDate || endDate) {
      const txDate = new Date(tx.date)
      if (startDate && txDate < startDate) return false
      if (endDate && txDate > endDate) return false
    }

    return true
  })
}

function sortTransactions(txs: Transaction[]) {
  return txs.sort((a, b) => {
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
}

function calculateSummary(txs: Transaction[]): PeriodSummary {
  let inflows = 0
  let outflows = 0

  txs.forEach((tx) => {
    const amount = tx.mainCurrencyAmount ?? tx.amount

    if (tx.type === 'income' || tx.type === 'loan_received') {
      inflows += amount
    } else if (tx.type === 'expense' || tx.type === 'loan_given') {
      outflows += amount
    }
  })

  return { inflows, outflows, net: inflows - outflows }
}

function processTransactions(txs: Transaction[], opts: FilterOptions) {
  const filtered = applyFilters(txs, opts)
  const sorted = sortTransactions(filtered)
  const summary = calculateSummary(sorted)
  return { sorted, summary }
}

export function usePaginatedTransactions(
  filterOptions: FilterOptions,
  initialTransactions: Transaction[]
): UsePaginatedTransactionsResult {
  // Initialize state synchronously from initialTransactions if available
  // This prevents the blink effect on page load
  const initialProcessed = useMemo(() => {
    return processTransactions(initialTransactions, filterOptions)
  }, [initialTransactions, filterOptions])

  const [transactions, setTransactions] = useState<Transaction[]>(() => initialProcessed.sorted)
  const [periodSummary, setPeriodSummary] = useState<PeriodSummary>(() => initialProcessed.summary)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(() => initialProcessed.sorted.length >= PAGE_SIZE)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  // isLoading is always false since we initialize synchronously from cached data
  // This prevents the blink effect when opening the history page
  const isLoading = false

  const cursorRef = useRef<{ date: Date; id: number } | null>(null)
  const loadedFilterKeyRef = useRef<string>('')

  const filterKey = useMemo(() => JSON.stringify(filterOptions), [filterOptions])

  // Track transactions by their content to detect ANY changes
  // This includes IDs, amounts, comments, dates, etc.
  const transactionKey = useMemo(() => {
    const count = initialTransactions.length
    // Hash all transaction content, not just IDs
    const content = initialTransactions
      .map((t) => `${t.id}:${t.amount}:${t.comment}:${t.date}:${t.mainCurrencyAmount}`)
      .join('|')
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.codePointAt(i) ?? 0
      hash = Math.trunc((hash << 5) - hash + char)
    }
    return `${count}-${hash}`
  }, [initialTransactions])

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    globalThis.addEventListener('online', handleOnline)
    globalThis.addEventListener('offline', handleOffline)

    return () => {
      globalThis.removeEventListener('online', handleOnline)
      globalThis.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Update state when filters or transactions change (but not on initial mount)
  useEffect(() => {
    // Combine filter key and transaction key to detect changes
    const combinedKey = `${filterKey}-${transactionKey}`
    if (loadedFilterKeyRef.current === combinedKey) {
      return
    }

    // Set this synchronously at the start to prevent race conditions
    // with StrictMode's double-invocation of effects
    loadedFilterKeyRef.current = combinedKey

    // Process synchronously - no need for async since data is already in memory
    const { sorted, summary } = processTransactions(initialTransactions, filterOptions)

    setTransactions(sorted)
    setPeriodSummary(summary)

    if (sorted.length > 0) {
      const oldest = sorted.at(-1)!
      cursorRef.current = {
        date: new Date(oldest.date),
        id: oldest.id!,
      }
    } else {
      cursorRef.current = null
    }

    // If we have fewer transactions than PAGE_SIZE, we've loaded all available
    setHasMore(sorted.length >= PAGE_SIZE && !isOffline)
  }, [filterKey, transactionKey, initialTransactions, filterOptions, isOffline])

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || isOffline) return

    if (!cursorRef.current && transactions.length > 0) {
      const oldest = transactions.at(-1)!
      cursorRef.current = {
        date: new Date(oldest.date),
        id: oldest.id!,
      }
    }

    if (!cursorRef.current) {
      setHasMore(false)
      return
    }

    setIsLoadingMore(true)

    try {
      const { startDate, endDate } = getDateRange(
        filterOptions.dateFilter,
        filterOptions.customDateFrom,
        filterOptions.customDateTo
      )

      const newTransactions = await transactionRepo.getPaginated({
        beforeDate: cursorRef.current.date,
        beforeId: cursorRef.current.id,
        limit: PAGE_SIZE,
        startDate,
        endDate,
      })

      const filtered = applyFilters(newTransactions, filterOptions)
      const sorted = sortTransactions(filtered)

      if (sorted.length === 0) {
        setHasMore(false)
      } else {
        setTransactions((prev) => {
          const existingIds = new Set(prev.map((t) => t.id))
          const unique = sorted.filter((t) => !existingIds.has(t.id))
          return [...prev, ...unique]
        })

        if (sorted.length > 0) {
          const oldest = sorted.at(-1)!
          cursorRef.current = {
            date: new Date(oldest.date),
            id: oldest.id!,
          }
        }

        if (sorted.length < PAGE_SIZE) {
          setHasMore(false)
        }
      }
    } catch (error) {
      console.error('Failed to load more transactions:', error)
      setHasMore(false)
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, isOffline, transactions, filterOptions])

  return {
    transactions,
    periodSummary,
    isLoading,
    isLoadingMore,
    hasMore,
    isOffline,
    loadMore,
  }
}
