import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  getOrCreateMappedId,
  isValidUUID,
  migrateLocalToSupabase,
  isMigrationComplete,
  markMigrationComplete,
  isCloudUnlocked,
  setCloudUnlocked,
  isCloudReady,
  hasLocalData,
  clearLocalData,
} from './migration'

const mockAccountsUpsert = vi.fn()
const mockAccountsGetAll = vi.fn()
const mockIncomeSourcesUpsert = vi.fn()
const mockIncomeSourcesGetAll = vi.fn()
const mockCategoriesUpsert = vi.fn()
const mockCategoriesGetAll = vi.fn()
const mockTransactionsUpsert = vi.fn()
const mockTransactionsGetRecent = vi.fn()
const mockLoansUpsert = vi.fn()
const mockLoansGetAll = vi.fn()
const mockSettingsUpsert = vi.fn()
const mockSettingsGet = vi.fn()
const mockCustomCurrenciesUpsert = vi.fn()
const mockCustomCurrenciesGetAll = vi.fn()

const mockLocalCacheAccountsPutAll = vi.fn()
const mockLocalCacheIncomeSourcesPutAll = vi.fn()
const mockLocalCacheCategoriesPutAll = vi.fn()
const mockLocalCacheTransactionsPutAll = vi.fn()
const mockLocalCacheLoansPutAll = vi.fn()
const mockLocalCacheSettingsPut = vi.fn()
const mockLocalCacheCustomCurrenciesPutAll = vi.fn()
const mockLocalCacheAccountsClear = vi.fn()
const mockLocalCacheIncomeSourcesClear = vi.fn()
const mockLocalCacheCategoriesClear = vi.fn()
const mockLocalCacheTransactionsClear = vi.fn()
const mockLocalCacheLoansClear = vi.fn()
const mockLocalCacheSettingsClear = vi.fn()
const mockLocalCacheCustomCurrenciesClear = vi.fn()
const mockLocalCacheAccountsCount = vi.fn()
const mockLocalCacheTransactionsCount = vi.fn()
const mockLocalCacheIncomeSourcesCount = vi.fn()

const mockDbAccountsToArray = vi.fn()
const mockDbAccountsClear = vi.fn()
const mockDbAccountsCount = vi.fn()
const mockDbIncomeSourcesToArray = vi.fn()
const mockDbIncomeSourcesClear = vi.fn()
const mockDbIncomeSourcesCount = vi.fn()
const mockDbCategoriesToArray = vi.fn()
const mockDbCategoriesClear = vi.fn()
const mockDbTransactionsToArray = vi.fn()
const mockDbTransactionsClear = vi.fn()
const mockDbTransactionsCount = vi.fn()
const mockDbLoansToArray = vi.fn()
const mockDbLoansClear = vi.fn()
const mockDbSettingsToArray = vi.fn()
const mockDbSettingsClear = vi.fn()
const mockDbCustomCurrenciesToArray = vi.fn()
const mockDbCustomCurrenciesClear = vi.fn()
const mockLocalCacheClearAll = vi.fn()

vi.mock('./supabaseApi', () => ({
  supabaseApi: {
    accounts: {
      upsert: (data: unknown) => mockAccountsUpsert(data),
      getAll: () => mockAccountsGetAll(),
    },
    incomeSources: {
      upsert: (data: unknown) => mockIncomeSourcesUpsert(data),
      getAll: () => mockIncomeSourcesGetAll(),
    },
    categories: {
      upsert: (data: unknown) => mockCategoriesUpsert(data),
      getAll: () => mockCategoriesGetAll(),
    },
    transactions: {
      upsert: (data: unknown) => mockTransactionsUpsert(data),
      getRecent: (limit: number) => mockTransactionsGetRecent(limit),
    },
    loans: {
      upsert: (data: unknown) => mockLoansUpsert(data),
      getAll: () => mockLoansGetAll(),
    },
    settings: {
      upsert: (data: unknown) => mockSettingsUpsert(data),
      get: () => mockSettingsGet(),
    },
    customCurrencies: {
      upsert: (data: unknown) => mockCustomCurrenciesUpsert(data),
      getAll: () => mockCustomCurrenciesGetAll(),
    },
  },
}))

vi.mock('./localCache', () => ({
  localCache: {
    accounts: {
      putAll: (data: unknown) => mockLocalCacheAccountsPutAll(data),
      clear: () => mockLocalCacheAccountsClear(),
      count: () => mockLocalCacheAccountsCount(),
    },
    incomeSources: {
      putAll: (data: unknown) => mockLocalCacheIncomeSourcesPutAll(data),
      clear: () => mockLocalCacheIncomeSourcesClear(),
      count: () => mockLocalCacheIncomeSourcesCount(),
    },
    categories: {
      putAll: (data: unknown) => mockLocalCacheCategoriesPutAll(data),
      clear: () => mockLocalCacheCategoriesClear(),
    },
    transactions: {
      putAll: (data: unknown) => mockLocalCacheTransactionsPutAll(data),
      clear: () => mockLocalCacheTransactionsClear(),
      count: () => mockLocalCacheTransactionsCount(),
    },
    loans: {
      putAll: (data: unknown) => mockLocalCacheLoansPutAll(data),
      clear: () => mockLocalCacheLoansClear(),
    },
    settings: {
      put: (data: unknown) => mockLocalCacheSettingsPut(data),
      clear: () => mockLocalCacheSettingsClear(),
    },
    customCurrencies: {
      putAll: (data: unknown) => mockLocalCacheCustomCurrenciesPutAll(data),
      clear: () => mockLocalCacheCustomCurrenciesClear(),
    },
    clearAll: () => mockLocalCacheClearAll(),
  },
}))

vi.mock('./db', () => ({
  db: {
    accounts: {
      toArray: () => mockDbAccountsToArray(),
      clear: () => mockDbAccountsClear(),
      count: () => mockDbAccountsCount(),
    },
    incomeSources: {
      toArray: () => mockDbIncomeSourcesToArray(),
      clear: () => mockDbIncomeSourcesClear(),
      count: () => mockDbIncomeSourcesCount(),
    },
    categories: {
      toArray: () => mockDbCategoriesToArray(),
      clear: () => mockDbCategoriesClear(),
    },
    transactions: {
      toArray: () => mockDbTransactionsToArray(),
      clear: () => mockDbTransactionsClear(),
      count: () => mockDbTransactionsCount(),
    },
    loans: {
      toArray: () => mockDbLoansToArray(),
      clear: () => mockDbLoansClear(),
    },
    settings: {
      toArray: () => mockDbSettingsToArray(),
      clear: () => mockDbSettingsClear(),
    },
    customCurrencies: {
      toArray: () => mockDbCustomCurrenciesToArray(),
      clear: () => mockDbCustomCurrenciesClear(),
    },
  },
}))

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => true,
}))

describe('migration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('isValidUUID', () => {
    it('returns true for valid UUIDs', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
      expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true)
    })

    it('returns false for invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false)
      expect(isValidUUID('12345')).toBe(false)
      expect(isValidUUID('')).toBe(false)
      expect(isValidUUID(null)).toBe(false)
      expect(isValidUUID(undefined)).toBe(false)
      expect(isValidUUID(123)).toBe(false)
    })
  })

  describe('getOrCreateMappedId', () => {
    it('returns existing UUID as-is', () => {
      const mapping = new Map<string | number, string>()
      const uuid = '550e8400-e29b-41d4-a716-446655440000'
      const result = getOrCreateMappedId(uuid, mapping)
      expect(result).toBe(uuid)
      expect(mapping.size).toBe(0)
    })

    it('generates new UUID for numeric ID and stores mapping', () => {
      const mapping = new Map<string | number, string>()
      const result = getOrCreateMappedId(1, mapping)
      expect(isValidUUID(result)).toBe(true)
      expect(mapping.get(1)).toBe(result)
    })

    it('returns cached mapping for previously seen numeric ID', () => {
      const mapping = new Map<string | number, string>()
      const firstResult = getOrCreateMappedId(1, mapping)
      const secondResult = getOrCreateMappedId(1, mapping)
      expect(firstResult).toBe(secondResult)
    })

    it('generates new UUID for undefined ID', () => {
      const mapping = new Map<string | number, string>()
      const result = getOrCreateMappedId(undefined, mapping)
      expect(isValidUUID(result)).toBe(true)
    })
  })

  describe('migration state functions', () => {
    it('isMigrationComplete returns false by default', () => {
      expect(isMigrationComplete()).toBe(false)
    })

    it('markMigrationComplete sets migration complete', () => {
      markMigrationComplete()
      expect(isMigrationComplete()).toBe(true)
    })

    it('isCloudUnlocked returns false by default', () => {
      expect(isCloudUnlocked()).toBe(false)
    })

    it('setCloudUnlocked sets cloud unlocked', () => {
      setCloudUnlocked()
      expect(isCloudUnlocked()).toBe(true)
    })

    it('isCloudReady returns true only when all conditions met', () => {
      expect(isCloudReady()).toBe(false)
      markMigrationComplete()
      expect(isCloudReady()).toBe(false)
      setCloudUnlocked()
      expect(isCloudReady()).toBe(true)
    })
  })

  describe('migrateLocalToSupabase', () => {
    it('preserves existing UUID IDs during migration', async () => {
      const accountUuid = '550e8400-e29b-41d4-a716-446655440001'
      const categoryUuid = '550e8400-e29b-41d4-a716-446655440002'

      mockDbAccountsToArray.mockResolvedValue([
        {
          id: accountUuid,
          name: 'Test Account',
          type: 'cash',
          currency: 'USD',
          balance: 100,
          color: '#red',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      mockDbIncomeSourcesToArray.mockResolvedValue([])
      mockDbCategoriesToArray.mockResolvedValue([
        {
          id: categoryUuid,
          name: 'Food',
          color: '#green',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      mockDbTransactionsToArray.mockResolvedValue([
        {
          id: '550e8400-e29b-41d4-a716-446655440003',
          type: 'expense',
          amount: 50,
          currency: 'USD',
          date: new Date(),
          accountId: accountUuid,
          categoryId: categoryUuid,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      mockDbLoansToArray.mockResolvedValue([])
      mockDbSettingsToArray.mockResolvedValue([])
      mockDbCustomCurrenciesToArray.mockResolvedValue([])

      mockAccountsUpsert.mockResolvedValue({})
      mockCategoriesUpsert.mockResolvedValue({})
      mockTransactionsUpsert.mockResolvedValue({})
      mockAccountsGetAll.mockResolvedValue([])
      mockIncomeSourcesGetAll.mockResolvedValue([])
      mockCategoriesGetAll.mockResolvedValue([])
      mockTransactionsGetRecent.mockResolvedValue([])
      mockLoansGetAll.mockResolvedValue([])
      mockSettingsGet.mockResolvedValue(null)
      mockCustomCurrenciesGetAll.mockResolvedValue([])

      await migrateLocalToSupabase()

      expect(mockAccountsUpsert).toHaveBeenCalledWith(expect.objectContaining({ id: accountUuid }))
      expect(mockCategoriesUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ id: categoryUuid })
      )
      expect(mockTransactionsUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '550e8400-e29b-41d4-a716-446655440003',
          accountId: accountUuid,
          categoryId: categoryUuid,
        })
      )
    })

    it('maps numeric IDs to UUIDs and updates foreign keys', async () => {
      mockDbAccountsToArray.mockResolvedValue([
        {
          id: 1,
          name: 'Test Account',
          type: 'cash',
          currency: 'USD',
          balance: 100,
          color: '#red',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      mockDbIncomeSourcesToArray.mockResolvedValue([])
      mockDbCategoriesToArray.mockResolvedValue([
        {
          id: 2,
          name: 'Food',
          color: '#green',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      mockDbTransactionsToArray.mockResolvedValue([
        {
          id: 3,
          type: 'expense',
          amount: 50,
          currency: 'USD',
          date: new Date(),
          accountId: 1,
          categoryId: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      mockDbLoansToArray.mockResolvedValue([])
      mockDbSettingsToArray.mockResolvedValue([])
      mockDbCustomCurrenciesToArray.mockResolvedValue([])

      let savedAccountId: string | undefined
      let savedCategoryId: string | undefined

      mockAccountsUpsert.mockImplementation((data: { id: string }) => {
        savedAccountId = data.id
        return Promise.resolve(data)
      })
      mockCategoriesUpsert.mockImplementation((data: { id: string }) => {
        savedCategoryId = data.id
        return Promise.resolve(data)
      })
      mockTransactionsUpsert.mockImplementation((data: unknown) => {
        return Promise.resolve(data)
      })
      mockIncomeSourcesUpsert.mockResolvedValue({})
      mockAccountsGetAll.mockResolvedValue([])
      mockIncomeSourcesGetAll.mockResolvedValue([])
      mockCategoriesGetAll.mockResolvedValue([])
      mockTransactionsGetRecent.mockResolvedValue([])
      mockLoansGetAll.mockResolvedValue([])
      mockSettingsGet.mockResolvedValue(null)
      mockCustomCurrenciesGetAll.mockResolvedValue([])

      await migrateLocalToSupabase()

      expect(savedAccountId).toBeDefined()
      expect(savedCategoryId).toBeDefined()
      expect(isValidUUID(savedAccountId)).toBe(true)
      expect(isValidUUID(savedCategoryId)).toBe(true)

      expect(mockTransactionsUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: savedAccountId,
          categoryId: savedCategoryId,
        })
      )
    })

    it('maps loan accountId to new UUID', async () => {
      mockDbAccountsToArray.mockResolvedValue([
        {
          id: 1,
          name: 'Test Account',
          type: 'cash',
          currency: 'USD',
          balance: 100,
          color: '#red',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      mockDbIncomeSourcesToArray.mockResolvedValue([])
      mockDbCategoriesToArray.mockResolvedValue([])
      mockDbTransactionsToArray.mockResolvedValue([])
      mockDbLoansToArray.mockResolvedValue([
        {
          id: 2,
          type: 'given',
          personName: 'John',
          amount: 100,
          currency: 'USD',
          paidAmount: 0,
          status: 'active',
          accountId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      mockDbSettingsToArray.mockResolvedValue([])
      mockDbCustomCurrenciesToArray.mockResolvedValue([])

      let savedAccountId: string | undefined

      mockAccountsUpsert.mockImplementation((data: { id: string }) => {
        savedAccountId = data.id
        return Promise.resolve(data)
      })
      mockLoansUpsert.mockImplementation((data: unknown) => {
        return Promise.resolve(data)
      })
      mockAccountsGetAll.mockResolvedValue([])
      mockIncomeSourcesGetAll.mockResolvedValue([])
      mockCategoriesGetAll.mockResolvedValue([])
      mockTransactionsGetRecent.mockResolvedValue([])
      mockLoansGetAll.mockResolvedValue([])
      mockSettingsGet.mockResolvedValue(null)
      mockCustomCurrenciesGetAll.mockResolvedValue([])

      await migrateLocalToSupabase()

      expect(mockLoansUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: savedAccountId,
        })
      )
    })

    it('calls progress callback during migration', async () => {
      mockDbAccountsToArray.mockResolvedValue([
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Account',
          type: 'cash',
          currency: 'USD',
          balance: 0,
          color: '#red',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      mockDbIncomeSourcesToArray.mockResolvedValue([])
      mockDbCategoriesToArray.mockResolvedValue([])
      mockDbTransactionsToArray.mockResolvedValue([])
      mockDbLoansToArray.mockResolvedValue([])
      mockDbSettingsToArray.mockResolvedValue([])
      mockDbCustomCurrenciesToArray.mockResolvedValue([])

      mockAccountsUpsert.mockResolvedValue({})
      mockAccountsGetAll.mockResolvedValue([])
      mockIncomeSourcesGetAll.mockResolvedValue([])
      mockCategoriesGetAll.mockResolvedValue([])
      mockTransactionsGetRecent.mockResolvedValue([])
      mockLoansGetAll.mockResolvedValue([])
      mockSettingsGet.mockResolvedValue(null)
      mockCustomCurrenciesGetAll.mockResolvedValue([])

      const progressCallback = vi.fn()

      await migrateLocalToSupabase(progressCallback)

      expect(progressCallback).toHaveBeenCalledWith({
        current: 1,
        total: 1,
        entity: 'accounts',
      })
    })
  })

  describe('hasLocalData', () => {
    it('returns true when old database has data', async () => {
      mockLocalCacheAccountsCount.mockResolvedValue(0)
      mockLocalCacheTransactionsCount.mockResolvedValue(0)
      mockLocalCacheIncomeSourcesCount.mockResolvedValue(0)
      mockDbAccountsCount.mockResolvedValue(1)
      mockDbTransactionsCount.mockResolvedValue(0)
      mockDbIncomeSourcesCount.mockResolvedValue(0)

      const result = await hasLocalData()
      expect(result).toBe(true)
    })

    it('returns true when localCache has data', async () => {
      mockLocalCacheAccountsCount.mockResolvedValue(1)
      mockDbAccountsCount.mockResolvedValue(0)
      mockDbTransactionsCount.mockResolvedValue(0)
      mockDbIncomeSourcesCount.mockResolvedValue(0)

      const result = await hasLocalData()
      expect(result).toBe(true)
    })

    it('returns false when no data exists', async () => {
      mockLocalCacheAccountsCount.mockResolvedValue(0)
      mockLocalCacheTransactionsCount.mockResolvedValue(0)
      mockLocalCacheIncomeSourcesCount.mockResolvedValue(0)
      mockDbAccountsCount.mockResolvedValue(0)
      mockDbTransactionsCount.mockResolvedValue(0)
      mockDbIncomeSourcesCount.mockResolvedValue(0)

      const result = await hasLocalData()
      expect(result).toBe(false)
    })
  })

  describe('clearLocalData', () => {
    it('clears all local data', async () => {
      await clearLocalData()

      expect(mockDbAccountsClear).toHaveBeenCalled()
      expect(mockDbIncomeSourcesClear).toHaveBeenCalled()
      expect(mockDbCategoriesClear).toHaveBeenCalled()
      expect(mockDbTransactionsClear).toHaveBeenCalled()
      expect(mockDbLoansClear).toHaveBeenCalled()
      expect(mockDbSettingsClear).toHaveBeenCalled()
      expect(mockDbCustomCurrenciesClear).toHaveBeenCalled()
      expect(mockLocalCacheClearAll).toHaveBeenCalled()
    })
  })
})
