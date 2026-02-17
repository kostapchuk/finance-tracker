import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { reportCacheRepo, transactionRepo } from './repositories'

const mockTransactionDelete = vi.fn()
const mockTransactionGetById = vi.fn()
const mockReportCacheInvalidate = vi.fn()
const mockReportCacheDeleteByPeriod = vi.fn()

vi.mock('./localCache', () => ({
  localCache: {
    transactions: {
      put: vi.fn(),
      delete: (id: number | string) => mockTransactionDelete(id),
      getById: (id: number | string) => mockTransactionGetById(id),
    },
    reportCache: {
      invalidatePeriodsAfterDate: () => mockReportCacheInvalidate(),
      deleteByPeriod: () => mockReportCacheDeleteByPeriod(),
    },
  },
}))

vi.mock('./supabaseApi', () => ({
  supabaseApi: {
    reportCache: {
      invalidatePeriodsAfterDate: vi.fn().mockRejectedValue(new Error('Network error')),
      deleteByPeriod: vi.fn().mockRejectedValue(new Error('Network error')),
    },
  },
}))

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => true,
}))

vi.mock('@/lib/deviceId', () => ({
  getDeviceId: () => 'test-device-id',
}))

const mockQueueOperation = vi.fn()

vi.mock('./syncService', () => ({
  syncService: {
    queueOperation: (...args: unknown[]) => mockQueueOperation(...args),
  },
}))

describe('repositories offline handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('reportCacheRepo.invalidatePeriodsAfterDate', () => {
    it('does not throw when offline (navigator.onLine is false)', async () => {
      // Mock offline state
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

      // Should not throw even though supabase would fail
      await expect(reportCacheRepo.invalidatePeriodsAfterDate(new Date())).resolves.not.toThrow()
    })

    it('catches network errors when online but request fails', async () => {
      // Mock online state
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)

      // Should not throw even when supabaseApi throws
      await expect(reportCacheRepo.invalidatePeriodsAfterDate(new Date())).resolves.not.toThrow()
    })
  })

  describe('transactionRepo.delete', () => {
    it('deletes transaction with temp ID (created offline)', async () => {
      const tempId = 'temp_12345_abc123'

      // Mock the transaction exists
      mockTransactionGetById.mockResolvedValue({
        id: tempId,
        type: 'expense',
        amount: 100,
        currency: 'USD',
        date: new Date(),
        accountId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await transactionRepo.delete(tempId)

      // Should delete from local cache using the temp ID
      expect(mockTransactionDelete).toHaveBeenCalledWith(tempId)

      // Should NOT queue sync operation for temp IDs
      expect(mockQueueOperation).not.toHaveBeenCalled()
    })

    it('deletes transaction with numeric ID and queues sync', async () => {
      const numericId = 42

      // Mock the transaction exists
      mockTransactionGetById.mockResolvedValue({
        id: numericId,
        type: 'expense',
        amount: 100,
        currency: 'USD',
        date: new Date(),
        accountId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await transactionRepo.delete(numericId)

      // Should delete from local cache
      expect(mockTransactionDelete).toHaveBeenCalledWith(numericId)

      // Should queue sync operation for numeric IDs
      expect(mockQueueOperation).toHaveBeenCalledWith('delete', 'transactions', numericId)
    })
  })
})
