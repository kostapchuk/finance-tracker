import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { reportCacheRepo, transactionRepo } from './repositories'

const mockTransactionDelete = vi.fn()
const mockTransactionGetById = vi.fn()
const mockTransactionPut = vi.fn()
const mockReportCacheInvalidate = vi.fn()
const mockReportCacheDeleteByPeriod = vi.fn()
const mockReportCacheInvalidateForTransaction = vi.fn()
const mockSyncQueueDeleteByRecordId = vi.fn()

vi.mock('./localCache', () => ({
  localCache: {
    transactions: {
      put: (tx: unknown) => mockTransactionPut(tx),
      delete: (id: string) => mockTransactionDelete(id),
      getById: (id: string) => mockTransactionGetById(id),
    },
    reportCache: {
      invalidatePeriodsAfterDate: () => mockReportCacheInvalidate(),
      deleteByPeriod: () => mockReportCacheDeleteByPeriod(),
      invalidateForTransaction: () => mockReportCacheInvalidateForTransaction(),
    },
    syncQueue: {
      deleteByRecordId: (id: string) => mockSyncQueueDeleteByRecordId(id),
    },
  },
}))

vi.mock('./supabaseApi', () => ({
  supabaseApi: {
    reportCache: {
      invalidatePeriodsAfterDate: vi.fn().mockRejectedValue(new Error('Network error')),
      deleteByPeriod: vi.fn().mockRejectedValue(new Error('Network error')),
      invalidateForTransaction: vi.fn().mockRejectedValue(new Error('Network error')),
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
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

      await expect(reportCacheRepo.invalidatePeriodsAfterDate(new Date())).resolves.not.toThrow()
    })

    it('catches network errors when online but request fails', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)

      await expect(reportCacheRepo.invalidatePeriodsAfterDate(new Date())).resolves.not.toThrow()
    })
  })

  describe('transactionRepo.delete', () => {
    it('deletes transaction and queues sync delete', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000'

      mockTransactionGetById.mockResolvedValue({
        id: uuid,
        type: 'expense',
        amount: 100,
        currency: 'USD',
        date: new Date(),
        accountId: 'account-uuid',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await transactionRepo.delete(uuid)

      expect(mockTransactionDelete).toHaveBeenCalledWith(uuid)
      expect(mockQueueOperation).toHaveBeenCalledWith('delete', 'transactions', uuid)
    })
  })

  describe('transactionRepo.update', () => {
    it('updates transaction and queues sync update', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000'
      const originalDate = new Date('2024-01-15')

      mockTransactionGetById.mockResolvedValue({
        id: uuid,
        type: 'expense',
        amount: 100,
        currency: 'USD',
        date: originalDate,
        accountId: 'account-uuid',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const updates = { amount: 200, comment: 'Updated' }
      await transactionRepo.update(uuid, updates)

      expect(mockTransactionPut).toHaveBeenCalled()
      const putArg = mockTransactionPut.mock.calls[0][0]
      expect(putArg.amount).toBe(200)
      expect(putArg.comment).toBe('Updated')
      expect(putArg.id).toBe(uuid)

      expect(mockQueueOperation).toHaveBeenCalledWith('update', 'transactions', uuid, updates)
    })
  })
})
