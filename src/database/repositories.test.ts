import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { reportCacheRepo, transactionRepo } from './repositories'

const mockTransactionDelete = vi.fn()
const mockTransactionGetById = vi.fn()
const mockTransactionPut = vi.fn()
const mockReportCacheInvalidate = vi.fn()
const mockReportCacheDeleteByPeriod = vi.fn()
const mockSyncQueueDeleteByRecordId = vi.fn()

vi.mock('./localCache', () => ({
  localCache: {
    transactions: {
      put: (tx: unknown) => mockTransactionPut(tx),
      delete: (id: number | string) => mockTransactionDelete(id),
      getById: (id: number | string) => mockTransactionGetById(id),
    },
    reportCache: {
      invalidatePeriodsAfterDate: () => mockReportCacheInvalidate(),
      deleteByPeriod: () => mockReportCacheDeleteByPeriod(),
    },
    syncQueue: {
      deleteByRecordId: (id: number | string) => mockSyncQueueDeleteByRecordId(id),
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
    it('deletes transaction with temp ID and removes pending create from sync queue', async () => {
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

      // Should remove the pending create operation from sync queue
      expect(mockSyncQueueDeleteByRecordId).toHaveBeenCalledWith(tempId)
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

      // Should NOT remove from sync queue for numeric IDs
      expect(mockSyncQueueDeleteByRecordId).not.toHaveBeenCalled()
    })
  })

  describe('transactionRepo.update', () => {
    it('updates transaction with temp ID in local cache', async () => {
      const tempId = 'temp_12345_abc123'
      const originalDate = new Date('2024-01-15')

      // Mock the transaction exists
      mockTransactionGetById.mockResolvedValue({
        id: tempId,
        type: 'expense',
        amount: 100,
        currency: 'USD',
        date: originalDate,
        accountId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const updates = { amount: 200, comment: 'Updated' }
      await transactionRepo.update(tempId, updates)

      // Should update the transaction in local cache
      expect(mockTransactionPut).toHaveBeenCalled()
      const putArg = mockTransactionPut.mock.calls[0][0]
      expect(putArg.amount).toBe(200)
      expect(putArg.comment).toBe('Updated')
      expect(putArg.id).toBe(tempId)

      // Should remove old pending create and queue new one with updated data
      expect(mockSyncQueueDeleteByRecordId).toHaveBeenCalledWith(tempId)
      expect(mockQueueOperation).toHaveBeenCalledWith(
        'create',
        'transactions',
        tempId,
        expect.objectContaining({ amount: 200 })
      )

      // Should NOT call queueOperation with 'update' for temp IDs
      expect(mockQueueOperation).not.toHaveBeenCalledWith(
        'update',
        expect.anything(),
        expect.anything(),
        expect.anything()
      )
    })

    it('updates transaction with numeric ID and queues sync update', async () => {
      const numericId = 42
      const originalDate = new Date('2024-01-15')

      // Mock the transaction exists
      mockTransactionGetById.mockResolvedValue({
        id: numericId,
        type: 'expense',
        amount: 100,
        currency: 'USD',
        date: originalDate,
        accountId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const updates = { amount: 200, comment: 'Updated' }
      await transactionRepo.update(numericId, updates)

      // Should update the transaction in local cache
      expect(mockTransactionPut).toHaveBeenCalled()
      const putArg = mockTransactionPut.mock.calls[0][0]
      expect(putArg.amount).toBe(200)
      expect(putArg.comment).toBe('Updated')
      expect(putArg.id).toBe(numericId)

      // Should queue sync operation for numeric IDs
      expect(mockQueueOperation).toHaveBeenCalledWith('update', 'transactions', numericId, updates)

      // Should NOT remove from sync queue for numeric IDs
      expect(mockSyncQueueDeleteByRecordId).not.toHaveBeenCalled()
    })
  })
})
