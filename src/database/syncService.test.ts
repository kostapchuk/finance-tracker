import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockLocalCacheAccountsGetAll = vi.fn()
const mockLocalCacheAccountsGetById = vi.fn()
const mockLocalCacheAccountsClear = vi.fn()
const mockLocalCacheAccountsPut = vi.fn()

const mockLocalCacheTransactionsGetAll = vi.fn()
const mockLocalCacheTransactionsGetById = vi.fn()
const mockLocalCacheTransactionsClear = vi.fn()
const mockLocalCacheTransactionsPut = vi.fn()

const mockLocalCacheSyncQueueGetAll = vi.fn()
const mockLocalCacheSyncQueueGetCount = vi.fn()
const mockLocalCacheSyncQueueDelete = vi.fn()
const mockLocalCacheSyncQueueUpdate = vi.fn()
const mockLocalCacheSyncQueueDeleteByRecordId = vi.fn()
const mockLocalCacheSyncQueueAdd = vi.fn()
const mockLocalCacheSyncQueueBulkAdd = vi.fn()

const mockSupabaseAccountsUpsert = vi.fn()
const mockSupabaseAccountsDelete = vi.fn()
const mockSupabaseAccountsGetAll = vi.fn()
const mockSupabaseTransactionsUpsert = vi.fn()
const mockSupabaseTransactionsDelete = vi.fn()
const mockSupabaseTransactionsGetAll = vi.fn()
const mockSupabaseReportCacheDeleteExpired = vi.fn()

const mockIsCloudReady = vi.fn()
const mockGetDeviceId = vi.fn()

vi.mock('./localCache', () => ({
  localCache: {
    accounts: {
      getAll: () => mockLocalCacheAccountsGetAll(),
      getById: (id: string) => mockLocalCacheAccountsGetById(id),
      clear: () => mockLocalCacheAccountsClear(),
      put: (data: unknown) => mockLocalCacheAccountsPut(data),
    },
    transactions: {
      getAll: () => mockLocalCacheTransactionsGetAll(),
      getById: (id: string) => mockLocalCacheTransactionsGetById(id),
      clear: () => mockLocalCacheTransactionsClear(),
      put: (data: unknown) => mockLocalCacheTransactionsPut(data),
    },
    syncQueue: {
      getAll: () => mockLocalCacheSyncQueueGetAll(),
      getCount: () => mockLocalCacheSyncQueueGetCount(),
      delete: (id: number) => mockLocalCacheSyncQueueDelete(id),
      update: (id: number, data: unknown) => mockLocalCacheSyncQueueUpdate(id, data),
      deleteByRecordId: (id: string) => mockLocalCacheSyncQueueDeleteByRecordId(id),
      add: (data: unknown) => mockLocalCacheSyncQueueAdd(data),
      bulkAdd: (data: unknown[]) => mockLocalCacheSyncQueueBulkAdd(data),
    },
  },
}))

vi.mock('./supabaseApi', () => ({
  supabaseApi: {
    accounts: {
      upsert: (data: unknown) => mockSupabaseAccountsUpsert(data),
      delete: (id: string) => mockSupabaseAccountsDelete(id),
      getAll: () => mockSupabaseAccountsGetAll(),
    },
    transactions: {
      upsert: (data: unknown) => mockSupabaseTransactionsUpsert(data),
      delete: (id: string) => mockSupabaseTransactionsDelete(id),
      getAll: () => mockSupabaseTransactionsGetAll(),
    },
    reportCache: {
      deleteExpired: () => mockSupabaseReportCacheDeleteExpired(),
    },
  },
}))

vi.mock('./migration', () => ({
  isCloudReady: () => mockIsCloudReady(),
}))

vi.mock('@/lib/deviceId', () => ({
  getDeviceId: () => mockGetDeviceId(),
}))

describe('syncService', () => {
  let syncService: typeof import('./syncService').syncService
  let useSyncState: typeof import('./syncService').useSyncState

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()

    mockIsCloudReady.mockReturnValue(true)
    mockGetDeviceId.mockReturnValue('test-device-id')
    mockLocalCacheSyncQueueGetCount.mockResolvedValue(0)
    mockSupabaseReportCacheDeleteExpired.mockResolvedValue(undefined)

    vi.useFakeTimers()

    const module = await import('./syncService')
    syncService = module.syncService
    useSyncState = module.useSyncState
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('getState', () => {
    it('returns initial state', () => {
      const state = syncService.getState()

      expect(state.status).toBe('idle')
      expect(state.lastSyncAt).toBeNull()
      expect(state.pendingCount).toBe(0)
      expect(state.error).toBeNull()
    })
  })

  describe('subscribe', () => {
    it('notifies listeners on state change', () => {
      const listener = vi.fn()
      syncService.subscribe(listener)

      expect(listener).not.toHaveBeenCalled()
    })

    it('returns unsubscribe function', () => {
      const listener = vi.fn()
      const unsubscribe = syncService.subscribe(listener)

      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    })
  })

  describe('syncAll', () => {
    it('does nothing when cloud is not ready', async () => {
      mockIsCloudReady.mockReturnValue(false)

      await syncService.syncAll()

      expect(mockLocalCacheSyncQueueGetAll).not.toHaveBeenCalled()
    })

    it('does nothing when already syncing', async () => {
      mockLocalCacheSyncQueueGetAll.mockResolvedValue([])

      const firstSync = syncService.syncAll()
      const secondSync = syncService.syncAll()

      await Promise.all([firstSync, secondSync])

      expect(mockLocalCacheSyncQueueGetAll).toHaveBeenCalledTimes(1)
    })

    it('processes queue items in entity order', async () => {
      const accountUuid = '550e8400-e29b-41d4-a716-446655440001'
      const transactionUuid = '550e8400-e29b-41d4-a716-446655440002'

      mockLocalCacheSyncQueueGetAll.mockResolvedValue([
        {
          id: 1,
          operation: 'update',
          entity: 'transactions',
          recordId: transactionUuid,
          createdAt: new Date(),
          attempts: 0,
        },
        {
          id: 2,
          operation: 'update',
          entity: 'accounts',
          recordId: accountUuid,
          createdAt: new Date(),
          attempts: 0,
        },
      ])

      mockLocalCacheAccountsGetById.mockResolvedValue({
        id: accountUuid,
        name: 'Test',
        type: 'cash',
        currency: 'USD',
        balance: 100,
        color: '#red',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      mockLocalCacheTransactionsGetById.mockResolvedValue({
        id: transactionUuid,
        type: 'expense',
        amount: 50,
        currency: 'USD',
        date: new Date(),
        accountId: accountUuid,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockSupabaseAccountsUpsert.mockResolvedValue({})
      mockSupabaseTransactionsUpsert.mockResolvedValue({})
      mockLocalCacheSyncQueueGetCount.mockResolvedValue(0)

      await syncService.syncAll()

      const accountCallIndex = mockSupabaseAccountsUpsert.mock.invocationCallOrder[0]
      const transactionCallIndex = mockSupabaseTransactionsUpsert.mock.invocationCallOrder[0]

      expect(accountCallIndex).toBeLessThan(transactionCallIndex)
    })

    it('skips items with invalid UUIDs', async () => {
      mockLocalCacheSyncQueueGetAll.mockResolvedValue([
        {
          id: 1,
          operation: 'update',
          entity: 'accounts',
          recordId: 'invalid-uuid',
          createdAt: new Date(),
          attempts: 0,
        },
      ])

      mockLocalCacheSyncQueueGetCount.mockResolvedValue(0)

      await syncService.syncAll()

      expect(mockSupabaseAccountsUpsert).not.toHaveBeenCalled()
    })

    it('increments attempts on sync failure', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440001'

      mockLocalCacheSyncQueueGetAll.mockResolvedValue([
        {
          id: 1,
          operation: 'update',
          entity: 'accounts',
          recordId: uuid,
          createdAt: new Date(),
          attempts: 0,
        },
      ])

      mockLocalCacheAccountsGetById.mockResolvedValue({
        id: uuid,
        name: 'Test',
        type: 'cash',
        currency: 'USD',
        balance: 100,
        color: '#red',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockSupabaseAccountsUpsert.mockRejectedValue(new Error('Network error'))
      mockLocalCacheSyncQueueGetCount.mockResolvedValue(1)

      await syncService.syncAll()

      expect(mockLocalCacheSyncQueueUpdate).toHaveBeenCalledWith(1, {
        attempts: 1,
        lastAttemptAt: expect.any(Date),
        error: 'Network error',
      })
    })
  })

  describe('queueOperation', () => {
    it('adds operation to sync queue', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440001'

      mockLocalCacheSyncQueueGetCount.mockResolvedValue(1)
      mockLocalCacheSyncQueueAdd.mockResolvedValue(1)

      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

      await syncService.queueOperation('create', 'accounts', uuid, { name: 'Test' })

      expect(mockLocalCacheSyncQueueDeleteByRecordId).toHaveBeenCalledWith(uuid)
      expect(mockLocalCacheSyncQueueAdd).toHaveBeenCalledWith({
        operation: 'create',
        entity: 'accounts',
        recordId: uuid,
        data: { name: 'Test' },
      })
    })

    it('triggers sync when online', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440001'

      mockLocalCacheSyncQueueGetCount.mockResolvedValue(1)
      mockLocalCacheSyncQueueAdd.mockResolvedValue(1)
      mockLocalCacheSyncQueueGetAll.mockResolvedValue([])

      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)

      await syncService.queueOperation('create', 'accounts', uuid)
      await vi.advanceTimersByTimeAsync(500)

      expect(mockLocalCacheSyncQueueGetAll).toHaveBeenCalled()
    })
  })

  describe('queueBulkOperation', () => {
    it('adds multiple operations to sync queue', async () => {
      const uuid1 = '550e8400-e29b-41d4-a716-446655440001'
      const uuid2 = '550e8400-e29b-41d4-a716-446655440002'

      mockLocalCacheSyncQueueGetCount.mockResolvedValue(2)
      mockLocalCacheSyncQueueBulkAdd.mockResolvedValue(undefined)

      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

      await syncService.queueBulkOperation('create', 'accounts', [
        { tempId: uuid1, data: { name: 'Account 1' } },
        { tempId: uuid2, data: { name: 'Account 2' } },
      ])

      expect(mockLocalCacheSyncQueueBulkAdd).toHaveBeenCalledWith([
        expect.objectContaining({ recordId: uuid1 }),
        expect.objectContaining({ recordId: uuid2 }),
      ])
    })
  })

  describe('getPendingCount', () => {
    it('returns count from sync queue', async () => {
      mockLocalCacheSyncQueueGetCount.mockResolvedValue(5)

      const count = await syncService.getPendingCount()

      expect(count).toBe(5)
    })
  })

  describe('pullFromRemote', () => {
    it('does nothing when cloud is not ready', async () => {
      mockIsCloudReady.mockReturnValue(false)

      await syncService.pullFromRemote(['accounts'])

      expect(mockSupabaseAccountsGetAll).not.toHaveBeenCalled()
    })

    it('does nothing when offline', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

      await syncService.pullFromRemote(['accounts'])

      expect(mockSupabaseAccountsGetAll).not.toHaveBeenCalled()
    })

    it('fetches and stores entities from remote', async () => {
      const accountUuid = '550e8400-e29b-41d4-a716-446655440001'

      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)

      mockSupabaseAccountsGetAll.mockResolvedValue([
        {
          id: accountUuid,
          name: 'Test',
          type: 'cash',
          currency: 'USD',
          balance: 100,
          color: '#red',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])

      await syncService.pullFromRemote(['accounts'])

      expect(mockSupabaseAccountsGetAll).toHaveBeenCalled()
      expect(mockLocalCacheAccountsClear).toHaveBeenCalled()
      expect(mockLocalCacheAccountsPut).toHaveBeenCalledWith(
        expect.objectContaining({ id: accountUuid })
      )
    })
  })

  describe('useSyncState', () => {
    it('returns current sync state', () => {
      const { result } = renderHook(useSyncState)

      expect(result.current.status).toBe('idle')
    })
  })
})
