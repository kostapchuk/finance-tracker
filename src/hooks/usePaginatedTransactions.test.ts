import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { usePaginatedTransactions } from './usePaginatedTransactions'

import type { Transaction, TransactionType } from '@/database/types'

const mockGetPaginated = vi.fn()
const mockGetSummaryByDateRange = vi.fn()

vi.mock('@/database/repositories', () => ({
  transactionRepo: {
    getPaginated: () => mockGetPaginated(),
    getSummaryByDateRange: () => mockGetSummaryByDateRange(),
  },
}))

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

function createMockTransaction(
  id: string,
  type: Transaction['type'],
  amount: number,
  date: Date = new Date()
): Transaction {
  return {
    id,
    type,
    amount,
    currency: 'USD',
    date,
    accountId: 'acc-1',
    createdAt: date,
    updatedAt: date,
  }
}

describe('usePaginatedTransactions', () => {
  const defaultFilterOptions: FilterOptions = {
    typeFilter: 'all',
    categoryFilter: 'all',
    accountFilter: 'all',
    dateFilter: 'month',
    customDateFrom: '',
    customDateTo: '',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPaginated.mockResolvedValue([])
    mockGetSummaryByDateRange.mockResolvedValue({ inflows: 0, outflows: 0, net: 0 })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('periodSummary calculation', () => {
    it('calculates summary from local transactions without network requests', async () => {
      const localTransactions: Transaction[] = [
        createMockTransaction('tx-1', 'income', 1000),
        createMockTransaction('tx-2', 'expense', 300),
        createMockTransaction('tx-3', 'income', 500),
        createMockTransaction('tx-4', 'expense', 200),
      ]

      const { result } = renderHook(() =>
        usePaginatedTransactions(defaultFilterOptions, localTransactions)
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.periodSummary).toEqual({
        inflows: 1500,
        outflows: 500,
        net: 1000,
      })

      expect(mockGetSummaryByDateRange).not.toHaveBeenCalled()
    })

    it('calculates summary correctly in offline mode', async () => {
      const localTransactions: Transaction[] = [
        createMockTransaction('tx-1', 'income', 2000),
        createMockTransaction('tx-2', 'expense', 800),
        createMockTransaction('tx-3', 'loan_given', 200),
        createMockTransaction('tx-4', 'loan_received', 500),
      ]

      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

      const { result } = renderHook(() =>
        usePaginatedTransactions(defaultFilterOptions, localTransactions)
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.periodSummary).toEqual({
        inflows: 2500,
        outflows: 1000,
        net: 1500,
      })

      expect(mockGetSummaryByDateRange).not.toHaveBeenCalled()
      expect(mockGetPaginated).not.toHaveBeenCalled()
    })

    it('uses mainCurrencyAmount when calculating summary', async () => {
      const localTransactions: Transaction[] = [
        { ...createMockTransaction('tx-1', 'income', 100), mainCurrencyAmount: 85 },
        { ...createMockTransaction('tx-2', 'expense', 50), mainCurrencyAmount: 42 },
      ]

      const { result } = renderHook(() =>
        usePaginatedTransactions(defaultFilterOptions, localTransactions)
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.periodSummary).toEqual({
        inflows: 85,
        outflows: 42,
        net: 43,
      })
    })

    it('recalculates summary when filter options change', async () => {
      const localTransactions: Transaction[] = [
        createMockTransaction('tx-1', 'income', 1000),
        createMockTransaction('tx-2', 'expense', 500),
      ]

      const { result, rerender } = renderHook(
        ({ filterOptions }) => usePaginatedTransactions(filterOptions, localTransactions),
        { initialProps: { filterOptions: defaultFilterOptions } }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.periodSummary).toEqual({
        inflows: 1000,
        outflows: 500,
        net: 500,
      })

      const newFilterOptions = {
        ...defaultFilterOptions,
        typeFilter: 'income' as const,
      }

      act(() => {
        rerender({ filterOptions: newFilterOptions })
      })

      await waitFor(() => {
        expect(result.current.periodSummary).toEqual({
          inflows: 1000,
          outflows: 0,
          net: 1000,
        })
      })

      expect(mockGetSummaryByDateRange).not.toHaveBeenCalled()
    })

    it('calculates summary based on filtered transactions', async () => {
      const localTransactions: Transaction[] = [
        createMockTransaction('tx-1', 'income', 1000),
        createMockTransaction('tx-2', 'expense', 300),
        createMockTransaction('tx-3', 'income', 500),
        createMockTransaction('tx-4', 'expense', 200),
      ]

      const incomeFilterOptions = {
        ...defaultFilterOptions,
        typeFilter: 'income' as const,
      }

      const { result } = renderHook(() =>
        usePaginatedTransactions(incomeFilterOptions, localTransactions)
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.periodSummary).toEqual({
        inflows: 1500,
        outflows: 0,
        net: 1500,
      })

      expect(mockGetSummaryByDateRange).not.toHaveBeenCalled()
    })

    it('handles empty transactions list', async () => {
      const { result } = renderHook(() => usePaginatedTransactions(defaultFilterOptions, []))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.periodSummary).toEqual({
        inflows: 0,
        outflows: 0,
        net: 0,
      })
      expect(result.current.transactions).toEqual([])
    })

    it('updates when new transactions are added', async () => {
      const initialTransactions: Transaction[] = [
        createMockTransaction('tx-1', 'income', 1000),
        createMockTransaction('tx-2', 'expense', 500),
      ]

      const { result, rerender } = renderHook(
        ({ transactions }) => usePaginatedTransactions(defaultFilterOptions, transactions),
        { initialProps: { transactions: initialTransactions } }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.transactions).toHaveLength(2)
      expect(result.current.periodSummary).toEqual({
        inflows: 1000,
        outflows: 500,
        net: 500,
      })

      const updatedTransactions = [
        createMockTransaction('tx-3', 'income', 300),
        ...initialTransactions,
      ]

      act(() => {
        rerender({ transactions: updatedTransactions })
      })

      await waitFor(() => {
        expect(result.current.transactions).toHaveLength(3)
      })

      expect(result.current.periodSummary).toEqual({
        inflows: 1300,
        outflows: 500,
        net: 800,
      })
    })

    it('detects new transaction with temp ID when many transactions exist', async () => {
      const createTempId = (n: number) =>
        `temp_${Date.now()}_${n}_${Math.random().toString(36).slice(2, 11)}`
      const initialTransactions: Transaction[] = Array.from({ length: 20 }, (_, i) => ({
        ...createMockTransaction(
          createTempId(i),
          i % 2 === 0 ? 'income' : 'expense',
          100 * (i + 1)
        ),
      }))

      const { result, rerender } = renderHook(
        ({ transactions }) => usePaginatedTransactions(defaultFilterOptions, transactions),
        { initialProps: { transactions: initialTransactions } }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.transactions).toHaveLength(20)

      const newTempId = createTempId(99)
      const newTransaction: Transaction = {
        ...createMockTransaction(newTempId, 'income', 5000),
      }
      const updatedTransactions = [newTransaction, ...initialTransactions]

      act(() => {
        rerender({ transactions: updatedTransactions })
      })

      await waitFor(() => {
        expect(result.current.transactions).toHaveLength(21)
      })

      expect(result.current.transactions.find((t) => t.id === newTempId)).toBeDefined()
    })
  })
})
