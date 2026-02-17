import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { usePaginatedTransactions } from './usePaginatedTransactions'

import type { Transaction, TransactionType } from '@/database/types'

// Mock the transactionRepo to track if network requests are made
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
  id: number,
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
    accountId: 1,
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
        createMockTransaction(1, 'income', 1000),
        createMockTransaction(2, 'expense', 300),
        createMockTransaction(3, 'income', 500),
        createMockTransaction(4, 'expense', 200),
      ]

      const { result } = renderHook(() =>
        usePaginatedTransactions(defaultFilterOptions, localTransactions)
      )

      // Wait for the initial load to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Summary should be calculated locally
      expect(result.current.periodSummary).toEqual({
        inflows: 1500, // 1000 + 500
        outflows: 500, // 300 + 200
        net: 1000, // 1500 - 500
      })

      // No network request should be made for summary
      expect(mockGetSummaryByDateRange).not.toHaveBeenCalled()
    })

    it('calculates summary correctly in offline mode', async () => {
      const localTransactions: Transaction[] = [
        createMockTransaction(1, 'income', 2000),
        createMockTransaction(2, 'expense', 800),
        createMockTransaction(3, 'loan_given', 200),
        createMockTransaction(4, 'loan_received', 500),
      ]

      // Set navigator.onLine to false before rendering
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

      const { result } = renderHook(() =>
        usePaginatedTransactions(defaultFilterOptions, localTransactions)
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Summary should be calculated from local data even when offline
      expect(result.current.periodSummary).toEqual({
        inflows: 2500, // 2000 (income) + 500 (loan_received)
        outflows: 1000, // 800 (expense) + 200 (loan_given)
        net: 1500,
      })

      // No network request should be made
      expect(mockGetSummaryByDateRange).not.toHaveBeenCalled()
      expect(mockGetPaginated).not.toHaveBeenCalled()
    })

    it('uses mainCurrencyAmount when calculating summary', async () => {
      const localTransactions: Transaction[] = [
        { ...createMockTransaction(1, 'income', 100), mainCurrencyAmount: 85 },
        { ...createMockTransaction(2, 'expense', 50), mainCurrencyAmount: 42 },
      ]

      const { result } = renderHook(() =>
        usePaginatedTransactions(defaultFilterOptions, localTransactions)
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should use mainCurrencyAmount instead of amount
      expect(result.current.periodSummary).toEqual({
        inflows: 85,
        outflows: 42,
        net: 43,
      })
    })

    it('recalculates summary when filter options change', async () => {
      const localTransactions: Transaction[] = [
        createMockTransaction(1, 'income', 1000),
        createMockTransaction(2, 'expense', 500),
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

      // Change filter options to trigger recalculation
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
          outflows: 0, // expenses filtered out
          net: 1000,
        })
      })

      // Still no network requests
      expect(mockGetSummaryByDateRange).not.toHaveBeenCalled()
    })

    it('calculates summary based on filtered transactions', async () => {
      const localTransactions: Transaction[] = [
        createMockTransaction(1, 'income', 1000),
        createMockTransaction(2, 'expense', 300),
        createMockTransaction(3, 'income', 500),
        createMockTransaction(4, 'expense', 200),
      ]

      // Filter to only show income transactions
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

      // Summary should reflect only filtered transactions
      expect(result.current.periodSummary).toEqual({
        inflows: 1500, // only income transactions
        outflows: 0, // expenses are filtered out
        net: 1500,
      })

      // No network request should be made
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
        createMockTransaction(1, 'income', 1000),
        createMockTransaction(2, 'expense', 500),
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

      // Add a new transaction
      const updatedTransactions = [createMockTransaction(3, 'income', 300), ...initialTransactions]

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
      // Create 20 transactions with temp IDs (simulating offline creation)
      // Temp IDs are long strings like "temp_12345_abc123" (~20 chars each)
      const createTempId = (n: number) =>
        `temp_${Date.now()}_${n}_${Math.random().toString(36).slice(2, 11)}`
      const initialTransactions: Transaction[] = Array.from({ length: 20 }, (_, i) => ({
        ...createMockTransaction(i + 1, i % 2 === 0 ? 'income' : 'expense', 100 * (i + 1)),
        id: createTempId(i) as unknown as number,
      }))

      const { result, rerender } = renderHook(
        ({ transactions }) => usePaginatedTransactions(defaultFilterOptions, transactions),
        { initialProps: { transactions: initialTransactions } }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.transactions).toHaveLength(20)

      // Add a new transaction with a temp ID at the beginning
      const newTempId = createTempId(99)
      const newTransaction: Transaction = {
        ...createMockTransaction(999, 'income', 5000),
        id: newTempId as unknown as number,
      }
      const updatedTransactions = [newTransaction, ...initialTransactions]

      act(() => {
        rerender({ transactions: updatedTransactions })
      })

      await waitFor(() => {
        expect(result.current.transactions).toHaveLength(21)
      })

      // Verify the new transaction is included
      expect(result.current.transactions.find((t) => String(t.id) === newTempId)).toBeDefined()
    })
  })
})
