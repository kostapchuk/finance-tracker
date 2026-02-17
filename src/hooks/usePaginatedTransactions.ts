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

export function usePaginatedTransactions(
  filterOptions: FilterOptions,
  initialTransactions: Transaction[]
): UsePaginatedTransactionsResult {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [periodSummary, setPeriodSummary] = useState<PeriodSummary>({
    inflows: 0,
    outflows: 0,
    net: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  const cursorRef = useRef<{ date: Date; id: number } | null>(null)
  const loadedFilterKeyRef = useRef<string>('')

  const filterKey = useMemo(() => JSON.stringify(filterOptions), [filterOptions])

  // Track transactions by their IDs to detect changes
  // Use count + first ID + last ID to efficiently detect additions/deletions
  // This avoids truncation issues with many transactions or long temp IDs
  const transactionKey = useMemo(() => {
    const count = initialTransactions.length
    const firstId = count > 0 ? initialTransactions[0].id : ''
    const lastId = count > 0 ? initialTransactions[count - 1].id : ''
    // Also include a hash of all IDs to detect reordering or middle insertions
    const allIds = initialTransactions.map((t) => t.id).join(',')
    let hash = 0
    for (let i = 0; i < allIds.length; i++) {
      const char = allIds.codePointAt(i) ?? 0
      hash = Math.trunc((hash << 5) - hash + char)
    }
    return `${count}-${firstId}-${lastId}-${hash}`
  }, [initialTransactions])

  const getDateRange = useCallback(
    (dateFilter: DateFilterType, customDateFrom?: string, customDateTo?: string) => {
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
    },
    []
  )

  const applyFilters = useCallback(
    (txs: Transaction[], opts: FilterOptions) => {
      const {
        typeFilter,
        categoryFilter,
        accountFilter,
        dateFilter,
        customDateFrom,
        customDateTo,
      } = opts
      const { startDate, endDate } = getDateRange(dateFilter, customDateFrom, customDateTo)

      return txs.filter((tx) => {
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

        if (categoryFilter !== 'all') {
          if (tx.type === 'expense' && tx.categoryId?.toString() !== categoryFilter) return false
          if (tx.type === 'income' && tx.incomeSourceId?.toString() !== categoryFilter) return false
        }

        if (accountFilter !== 'all') {
          const matchesAccount =
            tx.accountId?.toString() === accountFilter ||
            tx.toAccountId?.toString() === accountFilter
          if (!matchesAccount) return false
        }

        if (startDate || endDate) {
          const txDate = new Date(tx.date)
          if (startDate && txDate < startDate) return false
          if (endDate && txDate > endDate) return false
        }

        return true
      })
    },
    [getDateRange]
  )

  const sortTransactions = useCallback((txs: Transaction[]) => {
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
      // DIAGNOSTIC: Check if IDs are strings and log NaN issue
      const idA = a.id
      const idB = b.id
      const sortResult = (idB || 0) - (idA || 0)
      if (Number.isNaN(sortResult)) {
        console.log('[DIAG] sortTransactions NaN detected:', {
          idA,
          idB,
          typeA: typeof idA,
          typeB: typeof idB,
        })
      }
      return sortResult
    })
  }, [])

  const calculateSummary = useCallback((txs: Transaction[]): PeriodSummary => {
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
  }, [])

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

  useEffect(() => {
    // Combine filter key and transaction key to detect changes
    const combinedKey = `${filterKey}-${transactionKey}`

    // DIAGNOSTIC: Log when effect runs
    console.log('[DIAG] usePaginatedTransactions effect running:', {
      combinedKey,
      prevKey: loadedFilterKeyRef.current,
      sameKey: loadedFilterKeyRef.current === combinedKey,
      txCount: initialTransactions.length,
      firstTxId: initialTransactions[0]?.id,
      filterKey,
      transactionKey,
    })

    if (loadedFilterKeyRef.current === combinedKey) {
      console.log('[DIAG] Skipping effect - same combinedKey')
      return
    }

    // Set this synchronously at the start to prevent race conditions
    // with StrictMode's double-invocation of effects
    loadedFilterKeyRef.current = combinedKey

    let cancelled = false

    const loadInitial = async () => {
      console.log('[DIAG] loadInitial starting, initialTransactions:', initialTransactions.length)
      setIsLoading(true)
      setTransactions([])
      cursorRef.current = null
      setHasMore(!isOffline)

      const filtered = applyFilters(initialTransactions, filterOptions)
      const sorted = sortTransactions(filtered)

      if (cancelled) return

      setTransactions(sorted)

      if (sorted.length > 0) {
        const oldest = sorted.at(-1)!
        cursorRef.current = {
          date: new Date(oldest.date),
          id: oldest.id!,
        }
      }

      // If we have fewer transactions than PAGE_SIZE, we've loaded all available
      // This handles the case where user has fewer than 50 total transactions
      if (sorted.length < PAGE_SIZE) {
        setHasMore(false)
      }

      // Calculate summary from already-loaded local transactions
      // This avoids unnecessary network requests since transactions are already in memory
      // ReportPage uses the same approach - local calculation from cached data
      const localSummary = calculateSummary(sorted)
      if (!cancelled) {
        setPeriodSummary(localSummary)
      }

      setIsLoading(false)
    }

    loadInitial()

    return () => {
      cancelled = true
    }
  }, [
    filterKey,
    transactionKey,
    initialTransactions,
    filterOptions,
    applyFilters,
    sortTransactions,
    calculateSummary,
    isOffline,
    getDateRange,
  ])

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
  }, [
    isLoadingMore,
    hasMore,
    isOffline,
    transactions,
    filterOptions,
    applyFilters,
    sortTransactions,
    getDateRange,
  ])

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
