import { QueryClient } from '@tanstack/react-query'
import React from 'react'

import { localCache } from './localCache'
import { isCloudReady } from './migration'
import { supabaseApi } from './supabaseApi'
import type {
  SyncQueueItem,
  SyncOperation,
  Account,
  IncomeSource,
  Category,
  Transaction,
  Loan,
  CustomCurrency,
  AppSettings,
} from './types'

let queryClient: QueryClient | null = null

export function setSyncQueryClient(client: QueryClient): void {
  queryClient = client
}

const INITIAL_RETRY_DELAY = 5000
const MAX_RETRY_DELAY = 60000

type SyncStatus = 'idle' | 'syncing' | 'error' | 'success'

interface SyncState {
  status: SyncStatus
  lastSyncAt: Date | null
  pendingCount: number
  error: string | null
  nextRetryAt: Date | null
}

type SyncListener = (state: SyncState) => void

class SyncService {
  private state: SyncState = {
    status: 'idle',
    lastSyncAt: null,
    pendingCount: 0,
    error: null,
    nextRetryAt: null,
  }

  private listeners = new Set<SyncListener>()
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private fetchingEntities = new Set<string>()
  private syncDebounceTimer: ReturnType<typeof setTimeout> | null = null
  private readonly SYNC_DEBOUNCE_MS = 500

  constructor() {
    if (typeof globalThis !== 'undefined') {
      globalThis.addEventListener('online', () => this.syncAll())
      globalThis.addEventListener('focus', () => {
        if (navigator.onLine) this.syncAll()
      })
      this.loadLastSyncTime()
      this.scheduleBackgroundSync()
    }
  }

  private loadLastSyncTime() {
    const lastSync = localStorage.getItem('finance-tracker-last-sync')
    if (lastSync) {
      this.state.lastSyncAt = new Date(lastSync)
    }
  }

  private saveLastSyncTime() {
    localStorage.setItem('finance-tracker-last-sync', new Date().toISOString())
  }

  private calculateBackoffDelay(attempts: number): number {
    const delay = Math.min(INITIAL_RETRY_DELAY * 2 ** attempts, MAX_RETRY_DELAY)
    return delay + Math.random() * 1000
  }

  private scheduleBackgroundSync(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }

    const checkAndSync = async () => {
      if (!navigator.onLine) {
        this.scheduleBackgroundSync()
        return
      }

      const pendingCount = await this.getPendingCount()
      if (pendingCount > 0) {
        this.syncAll()
      }
    }

    this.getPendingCount().then((count) => {
      if (count === 0) {
        this.updateState({ nextRetryAt: null })
        this.retryTimer = setTimeout(checkAndSync, MAX_RETRY_DELAY)
        return
      }

      localCache.syncQueue.getAll().then((items) => {
        const now = new Date()
        let minDelay = MAX_RETRY_DELAY

        for (const item of items) {
          const lastAttempt = item.lastAttemptAt ? new Date(item.lastAttemptAt) : null
          const elapsed = lastAttempt ? now.getTime() - lastAttempt.getTime() : MAX_RETRY_DELAY

          const backoffDelay = this.calculateBackoffDelay(item.attempts)
          const remainingDelay = Math.max(0, backoffDelay - elapsed)

          if (remainingDelay < minDelay) {
            minDelay = remainingDelay
          }
        }

        const nextRetryAt = new Date(now.getTime() + minDelay)
        this.updateState({ nextRetryAt })
        this.retryTimer = setTimeout(checkAndSync, minDelay)
      })
    })
  }

  getState(): SyncState {
    return this.state
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private updateState(updates: Partial<SyncState>) {
    this.state = { ...this.state, ...updates }
    this.listeners.forEach((listener) => listener(this.state))
  }

  private invalidateQueries(entities?: string[]): void {
    if (!queryClient) return

    const toInvalidate = entities ?? [
      'accounts',
      'incomeSources',
      'categories',
      'transactions',
      'loans',
      'settings',
      'customCurrencies',
    ]

    for (const entity of toInvalidate) {
      queryClient.invalidateQueries({ queryKey: [entity] })
    }
  }

  async syncAll(): Promise<void> {
    if (!isCloudReady()) {
      return
    }

    if (this.state.status === 'syncing') {
      return
    }

    this.updateState({ status: 'syncing', error: null, nextRetryAt: null })

    const affectedEntities = new Set<string>()

    try {
      const items = await localCache.syncQueue.getAll()

      if (items.length === 0) {
        this.updateState({ status: 'success' })
        return
      }

      const entityOrder = [
        'accounts',
        'categories',
        'incomeSources',
        'loans',
        'transactions',
        'customCurrencies',
        'settings',
      ] as const

      for (const entity of entityOrder) {
        const entityItems = items.filter((item) => item.entity === entity)

        for (const item of entityItems) {
          try {
            await this.processQueueItem(item)

            if (item.id) {
              await localCache.syncQueue.delete(item.id)
            }
            affectedEntities.add(item.entity)
            if (item.entity === 'transactions') {
              affectedEntities.add('accounts')
            }
            if (item.entity === 'loans') {
              affectedEntities.add('accounts')
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'

            console.error('[SYNC] FAILED:', {
              operation: item.operation,
              entity: item.entity,
              recordId: item.recordId,
              error: errorMessage,
            })

            if (item.id) {
              await localCache.syncQueue.update(item.id, {
                attempts: item.attempts + 1,
                lastAttemptAt: new Date(),
                error: errorMessage,
              })
            }
          }
        }
      }

      this.saveLastSyncTime()
      const remainingCount = await localCache.syncQueue.getCount()
      this.updateState({
        status: 'success',
        lastSyncAt: new Date(),
        pendingCount: remainingCount,
        nextRetryAt: remainingCount > 0 ? this.state.nextRetryAt : null,
      })

      if (affectedEntities.size > 0) {
        this.invalidateQueries([...affectedEntities])
      }

      await supabaseApi.reportCache.deleteExpired()

      this.scheduleBackgroundSync()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.updateState({ status: 'error', error: errorMessage })
      this.scheduleBackgroundSync()
    }
  }

  private async processQueueItem(item: SyncQueueItem): Promise<void> {
    const { operation, entity, recordId, data } = item

    switch (entity) {
      case 'accounts':
        await this.processAccountOperation(
          operation,
          recordId,
          data as Record<string, unknown> | undefined
        )
        break
      case 'incomeSources':
        await this.processIncomeSourceOperation(
          operation,
          recordId,
          data as Record<string, unknown> | undefined
        )
        break
      case 'categories':
        await this.processCategoryOperation(
          operation,
          recordId,
          data as Record<string, unknown> | undefined
        )
        break
      case 'transactions':
        await this.processTransactionOperation(
          operation,
          recordId,
          data as Record<string, unknown> | undefined
        )
        break
      case 'loans':
        await this.processLoanOperation(
          operation,
          recordId,
          data as Record<string, unknown> | undefined
        )
        break
      case 'customCurrencies':
        await this.processCustomCurrencyOperation(
          operation,
          recordId,
          data as Record<string, unknown> | undefined
        )
        break
      case 'settings':
        await this.processSettingsOperation(
          operation,
          recordId,
          data as Record<string, unknown> | undefined
        )
        break
      default:
        throw new Error(`Unknown entity: ${entity}`)
    }
  }

  private async processAccountOperation(
    operation: SyncOperation,
    recordId: string,
    _data?: Record<string, unknown>
  ): Promise<void> {
    switch (operation) {
      case 'create':
      case 'update': {
        const fullData = await localCache.accounts.getById(recordId)
        if (!fullData) {
          return
        }
        await supabaseApi.accounts.upsert(fullData)
        break
      }
      case 'delete': {
        await supabaseApi.accounts.delete(recordId)
        break
      }
    }
  }

  private async processIncomeSourceOperation(
    operation: SyncOperation,
    recordId: string,
    _data?: Record<string, unknown>
  ): Promise<void> {
    switch (operation) {
      case 'create':
      case 'update': {
        const fullData = await localCache.incomeSources.getById(recordId)
        if (!fullData) {
          return
        }
        await supabaseApi.incomeSources.upsert(fullData)
        break
      }
      case 'delete': {
        await supabaseApi.incomeSources.delete(recordId)
        break
      }
    }
  }

  private async processCategoryOperation(
    operation: SyncOperation,
    recordId: string,
    _data?: Record<string, unknown>
  ): Promise<void> {
    switch (operation) {
      case 'create':
      case 'update': {
        const fullData = await localCache.categories.getById(recordId)
        if (!fullData) {
          return
        }
        await supabaseApi.categories.upsert(fullData)
        break
      }
      case 'delete': {
        await supabaseApi.categories.delete(recordId)
        break
      }
    }
  }

  private async processTransactionOperation(
    operation: SyncOperation,
    recordId: string,
    _data?: Record<string, unknown>
  ): Promise<void> {
    switch (operation) {
      case 'create':
      case 'update': {
        const fullData = await localCache.transactions.getById(recordId)
        if (!fullData) {
          return
        }
        await supabaseApi.transactions.upsert(fullData)

        if (fullData.date) {
          await supabaseApi.reportCache.invalidatePeriodsAfterDate(new Date(fullData.date))
        }
        break
      }
      case 'delete': {
        await supabaseApi.transactions.delete(recordId)
        break
      }
    }
  }

  private async processLoanOperation(
    operation: SyncOperation,
    recordId: string,
    _data?: Record<string, unknown>
  ): Promise<void> {
    switch (operation) {
      case 'create':
      case 'update': {
        const fullData = await localCache.loans.getById(recordId)
        if (!fullData) {
          return
        }
        await supabaseApi.loans.upsert(fullData)
        break
      }
      case 'delete': {
        await supabaseApi.loans.delete(recordId)
        break
      }
    }
  }

  private async processCustomCurrencyOperation(
    operation: SyncOperation,
    recordId: string,
    _data?: Record<string, unknown>
  ): Promise<void> {
    switch (operation) {
      case 'create':
      case 'update': {
        const fullData = await localCache.customCurrencies.getById(recordId)
        if (!fullData) {
          return
        }
        await supabaseApi.customCurrencies.upsert(fullData)
        break
      }
      case 'delete': {
        await supabaseApi.customCurrencies.delete(recordId)
        break
      }
    }
  }

  private async processSettingsOperation(
    operation: SyncOperation,
    _recordId: string,
    _data?: Record<string, unknown>
  ): Promise<void> {
    switch (operation) {
      case 'create':
      case 'update': {
        const fullData = await localCache.settings.get()
        if (!fullData) {
          return
        }
        await supabaseApi.settings.upsert(fullData)
        break
      }
    }
  }

  async queueOperation(
    operation: SyncQueueItem['operation'],
    entity: SyncQueueItem['entity'],
    recordId: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    await localCache.syncQueue.deleteByRecordId(recordId)

    await localCache.syncQueue.add({
      operation,
      entity,
      recordId,
      data,
    })

    const count = await localCache.syncQueue.getCount()
    this.updateState({ pendingCount: count })

    if (navigator.onLine) {
      if (this.syncDebounceTimer) {
        clearTimeout(this.syncDebounceTimer)
      }
      this.syncDebounceTimer = setTimeout(() => {
        this.syncAll()
        this.syncDebounceTimer = null
      }, this.SYNC_DEBOUNCE_MS)
    }
  }

  async queueBulkOperation(
    operation: SyncQueueItem['operation'],
    entity: SyncQueueItem['entity'],
    items: { tempId: string; data: Record<string, unknown> }[]
  ): Promise<void> {
    if (items.length === 0) return

    const queueItems = items.map((item) => ({
      operation,
      entity,
      recordId: item.tempId,
      data: item.data,
    }))

    await localCache.syncQueue.bulkAdd(queueItems)

    const count = await localCache.syncQueue.getCount()
    this.updateState({ pendingCount: count })

    if (navigator.onLine) {
      this.syncAll()
    }
  }

  async pullFromRemote(entities?: string[]): Promise<void> {
    if (!isCloudReady()) {
      return
    }

    if (!navigator.onLine) {
      return
    }

    const allEntities = [
      'accounts',
      'incomeSources',
      'categories',
      'transactions',
      'loans',
      'customCurrencies',
      'settings',
    ] as const
    type EntityType = (typeof allEntities)[number]
    const toFetch: EntityType[] = (entities ?? [...allEntities]).filter(
      (e) => !this.fetchingEntities.has(e)
    ) as EntityType[]

    if (toFetch.length === 0) return

    for (const entity of toFetch) {
      this.fetchingEntities.add(entity)
    }

    try {
      const fetchPromises: Promise<unknown>[] = []
      const entityOrder: EntityType[] = []

      for (const entity of allEntities) {
        if (toFetch.includes(entity)) {
          entityOrder.push(entity)
          switch (entity) {
            case 'accounts':
              fetchPromises.push(supabaseApi.accounts.getAll())
              break
            case 'incomeSources':
              fetchPromises.push(supabaseApi.incomeSources.getAll())
              break
            case 'categories':
              fetchPromises.push(supabaseApi.categories.getAll())
              break
            case 'transactions':
              fetchPromises.push(supabaseApi.transactions.getAll())
              break
            case 'loans':
              fetchPromises.push(supabaseApi.loans.getAll())
              break
            case 'customCurrencies':
              fetchPromises.push(supabaseApi.customCurrencies.getAll())
              break
            case 'settings':
              fetchPromises.push(supabaseApi.settings.get())
              break
          }
        }
      }

      const results = await Promise.all(fetchPromises)

      for (const [index, entity] of entityOrder.entries()) {
        const data = results[index]

        switch (entity) {
          case 'accounts': {
            const accounts = data as Account[]
            await localCache.accounts.clear()
            if (accounts.length > 0) {
              for (const account of accounts) {
                await localCache.accounts.put(account)
              }
            }
            break
          }
          case 'incomeSources': {
            const incomeSources = data as IncomeSource[]
            await localCache.incomeSources.clear()
            if (incomeSources.length > 0) {
              for (const source of incomeSources) {
                await localCache.incomeSources.put(source)
              }
            }
            break
          }
          case 'categories': {
            const categories = data as Category[]
            await localCache.categories.clear()
            if (categories.length > 0) {
              for (const category of categories) {
                await localCache.categories.put(category)
              }
            }
            break
          }
          case 'transactions': {
            const transactions = data as Transaction[]
            await localCache.transactions.clear()
            if (transactions.length > 0) {
              for (const transaction of transactions) {
                await localCache.transactions.put(transaction)
              }
            }
            break
          }
          case 'loans': {
            const loans = data as Loan[]
            await localCache.loans.clear()
            if (loans.length > 0) {
              for (const loan of loans) {
                await localCache.loans.put(loan)
              }
            }
            break
          }
          case 'customCurrencies': {
            const customCurrencies = data as CustomCurrency[]
            await localCache.customCurrencies.clear()
            if (customCurrencies.length > 0) {
              for (const currency of customCurrencies) {
                await localCache.customCurrencies.put(currency)
              }
            }
            break
          }
          case 'settings': {
            const settings = data as AppSettings | null
            await localCache.settings.clear()
            if (settings) {
              await localCache.settings.put(settings)
            }
            break
          }
        }
      }

      this.invalidateQueries(toFetch)
    } catch (error) {
      console.error('Failed to pull from remote:', error)
    } finally {
      for (const entity of toFetch) {
        this.fetchingEntities.delete(entity)
      }
    }
  }

  async getPendingCount(): Promise<number> {
    return localCache.syncQueue.getCount()
  }
}

export const syncService = new SyncService()

export function useSyncState(): SyncState {
  const [state, setState] = React.useState<SyncState>(syncService.getState())

  React.useEffect(() => {
    return syncService.subscribe(setState)
  }, [])

  return state
}
