import { QueryClient } from '@tanstack/react-query'
import React from 'react'

import { localCache } from './localCache'
import { isCloudUnlocked } from './migration'
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

import { isSupabaseConfigured } from '@/lib/supabase'

// QueryClient instance for invalidating React Query cache after sync
let queryClient: QueryClient | null = null

export function setSyncQueryClient(client: QueryClient): void {
  queryClient = client
}

const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY = 5000
const MAX_RETRY_DELAY = 300000

type SyncStatus = 'idle' | 'syncing' | 'error' | 'success'

interface SyncState {
  status: SyncStatus
  lastSyncAt: Date | null
  pendingCount: number
  error: string | null
}

type SyncListener = (state: SyncState) => void

class SyncService {
  private state: SyncState = {
    status: 'idle',
    lastSyncAt: null,
    pendingCount: 0,
    error: null,
  }

  private listeners = new Set<SyncListener>()
  private retryTimer: ReturnType<typeof setTimeout> | null = null

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
        this.retryTimer = setTimeout(checkAndSync, MAX_RETRY_DELAY)
        return
      }

      localCache.syncQueue.getAll().then((items) => {
        const now = new Date()
        let minDelay = MAX_RETRY_DELAY

        for (const item of items) {
          if (item.attempts >= MAX_RETRIES) continue

          const lastAttempt = item.lastAttemptAt ? new Date(item.lastAttemptAt) : null
          const elapsed = lastAttempt ? now.getTime() - lastAttempt.getTime() : MAX_RETRY_DELAY

          const backoffDelay = this.calculateBackoffDelay(item.attempts)
          const remainingDelay = Math.max(0, backoffDelay - elapsed)

          if (remainingDelay < minDelay) {
            minDelay = remainingDelay
          }
        }

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

  private invalidateQueries(): void {
    if (!queryClient) return

    // Invalidate all relevant query keys to refresh UI after sync
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
    queryClient.invalidateQueries({ queryKey: ['incomeSources'] })
    queryClient.invalidateQueries({ queryKey: ['categories'] })
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['loans'] })
    queryClient.invalidateQueries({ queryKey: ['settings'] })
    queryClient.invalidateQueries({ queryKey: ['customCurrencies'] })
  }

  async syncAll(): Promise<void> {
    if (!isSupabaseConfigured() || !isCloudUnlocked()) {
      return
    }

    if (this.state.status === 'syncing') {
      return
    }

    this.updateState({ status: 'syncing', error: null })

    try {
      const items = await localCache.syncQueue.getAll()

      const transactionCreates = items.filter(
        (item) => item.entity === 'transactions' && item.operation === 'create' && item.data
      )
      const otherItems = items.filter(
        (item) => !(item.entity === 'transactions' && item.operation === 'create' && item.data)
      )

      if (transactionCreates.length > 0) {
        try {
          const transactionsToSync: Transaction[] = []

          for (const item of transactionCreates) {
            const txData = item.data as Record<string, unknown>

            if (typeof item.recordId === 'string' && item.recordId.startsWith('temp_')) {
              const localTx = await localCache.transactions.getById(item.recordId)
              if (localTx) {
                transactionsToSync.push({
                  ...(txData as unknown as Transaction),
                  accountId: localTx.accountId,
                  toAccountId: localTx.toAccountId,
                  categoryId: localTx.categoryId,
                  incomeSourceId: localTx.incomeSourceId,
                  loanId: localTx.loanId,
                })
                continue
              }
            }

            transactionsToSync.push(txData as unknown as Transaction)
          }

          const hasTempRefs = transactionsToSync.some((tx) => {
            const fields = [
              'accountId',
              'toAccountId',
              'categoryId',
              'incomeSourceId',
              'loanId',
            ] as const
            return fields.some((field) => {
              const value = (tx as unknown as Record<string, unknown>)[field]
              return typeof value === 'string' && value.startsWith('temp_')
            })
          })

          if (hasTempRefs) {
            throw new Error(
              'Some transactions have temp references. Transaction sync will be retried.'
            )
          }

          const results = await supabaseApi.transactions.bulkCreate(transactionsToSync)

          const tempIds = new Set(
            transactionCreates
              .filter(
                (item) => typeof item.recordId === 'string' && item.recordId.startsWith('temp_')
              )
              .map((item) => item.recordId as unknown as number)
          )
          if (tempIds.size > 0) {
            const allTransactions = await localCache.transactions.getAll()
            const toDelete = allTransactions.filter((t) => t.id !== undefined && tempIds.has(t.id))
            for (const tx of toDelete) {
              if (tx.id !== undefined) {
                await localCache.transactions.delete(tx.id)
              }
            }
          }

          await localCache.transactions.putAll(results)

          for (const item of transactionCreates) {
            if (item.id) {
              await localCache.syncQueue.delete(item.id)
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          for (const item of transactionCreates) {
            if (item.id) {
              await localCache.syncQueue.update(item.id, {
                attempts: item.attempts + 1,
                lastAttemptAt: new Date(),
                error: errorMessage,
              })
              if (item.attempts >= MAX_RETRIES) {
                await localCache.syncQueue.delete(item.id)
              }
            }
          }
        }
      }

      for (const item of otherItems) {
        try {
          await this.processQueueItem(item)

          if (item.id) {
            await localCache.syncQueue.delete(item.id)
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'

          if (item.id) {
            await localCache.syncQueue.update(item.id, {
              attempts: item.attempts + 1,
              lastAttemptAt: new Date(),
              error: errorMessage,
            })
          }

          if (item.attempts >= MAX_RETRIES && item.id) {
            await localCache.syncQueue.delete(item.id)
          }
        }
      }

      this.saveLastSyncTime()
      const remainingCount = await localCache.syncQueue.getCount()
      this.updateState({ status: 'success', lastSyncAt: new Date(), pendingCount: remainingCount })

      // Invalidate React Query cache so UI reflects sync changes
      this.invalidateQueries()

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
    recordId: number | string,
    data?: Record<string, unknown>
  ): Promise<void> {
    switch (operation) {
      case 'create': {
        const result = await supabaseApi.accounts.create(data as unknown as Account)
        if (typeof recordId === 'string' && recordId.startsWith('temp_')) {
          await localCache.accounts.delete(recordId as unknown as number)
          await this.updateTransactionReferences('accountId', recordId, result.id!)
          await this.updateTransactionReferences('toAccountId', recordId, result.id!)
          await this.updateLoanReferences('accountId', recordId, result.id!)
        }
        await localCache.accounts.put(result)
        break
      }
      case 'update': {
        if (typeof recordId === 'number') {
          await supabaseApi.accounts.update(recordId, data as unknown as Partial<Account>)
        }
        break
      }
      case 'delete': {
        if (typeof recordId === 'number') {
          await supabaseApi.accounts.delete(recordId)
        }
        break
      }
    }
  }

  private async processIncomeSourceOperation(
    operation: SyncOperation,
    recordId: number | string,
    data?: Record<string, unknown>
  ): Promise<void> {
    switch (operation) {
      case 'create': {
        const result = await supabaseApi.incomeSources.create(data as unknown as IncomeSource)
        if (typeof recordId === 'string' && recordId.startsWith('temp_')) {
          await localCache.incomeSources.delete(recordId as unknown as number)
          await this.updateTransactionReferences('incomeSourceId', recordId, result.id!)
        }
        await localCache.incomeSources.put(result)
        break
      }
      case 'update': {
        if (typeof recordId === 'number') {
          await supabaseApi.incomeSources.update(recordId, data as unknown as Partial<IncomeSource>)
        }
        break
      }
      case 'delete': {
        if (typeof recordId === 'number') {
          await supabaseApi.incomeSources.delete(recordId)
        }
        break
      }
    }
  }

  private async processCategoryOperation(
    operation: SyncOperation,
    recordId: number | string,
    data?: Record<string, unknown>
  ): Promise<void> {
    switch (operation) {
      case 'create': {
        const result = await supabaseApi.categories.create(data as unknown as Category)
        if (typeof recordId === 'string' && recordId.startsWith('temp_')) {
          await localCache.categories.delete(recordId as unknown as number)
          await this.updateTransactionReferences('categoryId', recordId, result.id!)
        }
        await localCache.categories.put(result)
        break
      }
      case 'update': {
        if (typeof recordId === 'number') {
          await supabaseApi.categories.update(recordId, data as unknown as Partial<Category>)
        }
        break
      }
      case 'delete': {
        if (typeof recordId === 'number') {
          await supabaseApi.categories.delete(recordId)
        }
        break
      }
    }
  }

  private async processTransactionOperation(
    operation: SyncOperation,
    recordId: number | string,
    data?: Record<string, unknown>
  ): Promise<void> {
    switch (operation) {
      case 'create': {
        if (!data) throw new Error('Transaction data is required for create operation')

        let txData = data as Record<string, unknown>

        if (typeof recordId === 'string' && recordId.startsWith('temp_')) {
          const localTx = await localCache.transactions.getById(recordId)
          if (localTx) {
            txData = {
              ...data,
              accountId: localTx.accountId,
              toAccountId: localTx.toAccountId,
              categoryId: localTx.categoryId,
              incomeSourceId: localTx.incomeSourceId,
              loanId: localTx.loanId,
            }
          }
        }

        const tempRefChecks = [
          { field: 'accountId', name: 'Account' },
          { field: 'toAccountId', name: 'Account' },
          { field: 'categoryId', name: 'Category' },
          { field: 'incomeSourceId', name: 'Income source' },
          { field: 'loanId', name: 'Loan' },
        ]

        for (const { field, name } of tempRefChecks) {
          const value = txData[field as keyof typeof txData]
          if (typeof value === 'string' && value.startsWith('temp_')) {
            throw new Error(
              `${name} with temp ID ${value} not yet synced. Transaction sync will be retried.`
            )
          }
        }

        const result = await supabaseApi.transactions.create(txData as unknown as Transaction)
        if (typeof recordId === 'string' && recordId.startsWith('temp_')) {
          await localCache.transactions.delete(recordId as unknown as number)
        }
        await localCache.transactions.put(result)

        if (txData.date) {
          await supabaseApi.reportCache.invalidatePeriodsAfterDate(new Date(txData.date as string))
        }
        break
      }
      case 'update': {
        if (typeof recordId === 'number') {
          await supabaseApi.transactions.update(recordId, data as unknown as Partial<Transaction>)

          if (data?.date) {
            await supabaseApi.reportCache.invalidatePeriodsAfterDate(new Date(data.date as string))
          }
        }
        break
      }
      case 'delete': {
        if (typeof recordId === 'number') {
          await supabaseApi.transactions.delete(recordId)
        }
        break
      }
    }
  }

  private async processLoanOperation(
    operation: SyncOperation,
    recordId: number | string,
    data?: Record<string, unknown>
  ): Promise<void> {
    switch (operation) {
      case 'create': {
        if (!data) throw new Error('Loan data is required for create operation')

        let loanData = data as Record<string, unknown>

        if (typeof recordId === 'string' && recordId.startsWith('temp_')) {
          const localLoan = await localCache.loans.getById(recordId)
          if (localLoan) {
            loanData = {
              ...data,
              accountId: localLoan.accountId,
            }
          }
        }

        if (typeof loanData.accountId === 'string' && loanData.accountId.startsWith('temp_')) {
          throw new Error(
            `Account with temp ID ${loanData.accountId} not yet synced. Loan sync will be retried.`
          )
        }

        const result = await supabaseApi.loans.create(loanData as unknown as Loan)
        if (typeof recordId === 'string' && recordId.startsWith('temp_')) {
          await localCache.loans.delete(recordId as unknown as number)
          await this.updateTransactionReferences('loanId', recordId, result.id!)
        }
        await localCache.loans.put(result)
        break
      }
      case 'update': {
        if (typeof recordId === 'number') {
          await supabaseApi.loans.update(recordId, data as unknown as Partial<Loan>)
        }
        break
      }
      case 'delete': {
        if (typeof recordId === 'number') {
          await supabaseApi.loans.delete(recordId)
        }
        break
      }
    }
  }

  private async processCustomCurrencyOperation(
    operation: SyncOperation,
    recordId: number | string,
    data?: Record<string, unknown>
  ): Promise<void> {
    switch (operation) {
      case 'create': {
        const result = await supabaseApi.customCurrencies.create(data as unknown as CustomCurrency)
        if (typeof recordId === 'string' && recordId.startsWith('temp_')) {
          await localCache.customCurrencies.delete(recordId as unknown as number)
        }
        await localCache.customCurrencies.put(result)
        break
      }
      case 'update': {
        if (typeof recordId === 'number') {
          await supabaseApi.customCurrencies.update(
            recordId,
            data as unknown as Partial<CustomCurrency>
          )
        }
        break
      }
      case 'delete': {
        if (typeof recordId === 'number') {
          await supabaseApi.customCurrencies.delete(recordId)
        }
        break
      }
    }
  }

  private async processSettingsOperation(
    operation: SyncOperation,
    recordId: number | string,
    data?: Record<string, unknown>
  ): Promise<void> {
    switch (operation) {
      case 'create': {
        const result = await supabaseApi.settings.create(data as unknown as AppSettings)
        if (typeof recordId === 'string' && recordId.startsWith('temp_')) {
          await localCache.settings.clear()
        }
        await localCache.settings.put(result)
        break
      }
      case 'update': {
        await supabaseApi.settings.update(data as unknown as Partial<AppSettings>)
        break
      }
    }
  }

  async queueOperation(
    operation: SyncQueueItem['operation'],
    entity: SyncQueueItem['entity'],
    recordId: number | string,
    data?: Record<string, unknown>
  ): Promise<void> {
    await localCache.syncQueue.add({
      operation,
      entity,
      recordId,
      data,
    })

    const count = await localCache.syncQueue.getCount()
    this.updateState({ pendingCount: count })

    if (navigator.onLine) {
      this.syncAll()
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

  async pullFromRemote(): Promise<void> {
    if (!isSupabaseConfigured() || !isCloudUnlocked()) {
      return
    }

    if (!navigator.onLine) {
      return
    }

    try {
      const [accounts, incomeSources, categories, transactions, loans, customCurrencies, settings] =
        await Promise.all([
          supabaseApi.accounts.getAll(),
          supabaseApi.incomeSources.getAll(),
          supabaseApi.categories.getAll(),
          supabaseApi.transactions.getAll(),
          supabaseApi.loans.getAll(),
          supabaseApi.customCurrencies.getAll(),
          supabaseApi.settings.get(),
        ])

      await localCache.accounts.clear()
      await localCache.incomeSources.clear()
      await localCache.categories.clear()
      await localCache.transactions.clear()
      await localCache.loans.clear()
      await localCache.customCurrencies.clear()
      await localCache.settings.clear()

      if (accounts.length > 0) {
        for (const account of accounts) {
          await localCache.accounts.put(account)
        }
      }
      if (incomeSources.length > 0) {
        for (const source of incomeSources) {
          await localCache.incomeSources.put(source)
        }
      }
      if (categories.length > 0) {
        for (const category of categories) {
          await localCache.categories.put(category)
        }
      }
      if (transactions.length > 0) {
        for (const transaction of transactions) {
          await localCache.transactions.put(transaction)
        }
      }
      if (loans.length > 0) {
        for (const loan of loans) {
          await localCache.loans.put(loan)
        }
      }
      if (customCurrencies.length > 0) {
        for (const currency of customCurrencies) {
          await localCache.customCurrencies.put(currency)
        }
      }
      if (settings) {
        await localCache.settings.put(settings)
      }
    } catch (error) {
      console.error('Failed to pull from remote:', error)
    }
  }

  async getPendingCount(): Promise<number> {
    return localCache.syncQueue.getCount()
  }

  private async updateTransactionReferences(
    field: 'accountId' | 'toAccountId' | 'categoryId' | 'incomeSourceId' | 'loanId',
    oldId: number | string,
    newId: number | string
  ): Promise<void> {
    const transactions = await localCache.transactions.getAll()
    const oldIdStr = typeof oldId === 'string' ? oldId : String(oldId)

    for (const tx of transactions) {
      const txFieldValue = tx[field]
      if (txFieldValue == null) continue

      const txFieldStr = typeof txFieldValue === 'string' ? txFieldValue : String(txFieldValue)

      if (txFieldStr === oldIdStr || txFieldValue === oldId) {
        await localCache.transactions.put({
          ...tx,
          [field]: newId,
        })
      }
    }
  }

  private async updateLoanReferences(
    field: 'accountId',
    oldId: number | string,
    newId: number
  ): Promise<void> {
    const loans = await localCache.loans.getAll()
    const oldIdStr = typeof oldId === 'string' ? oldId : String(oldId)

    for (const loan of loans) {
      const loanFieldValue = loan[field]
      if (loanFieldValue == null) continue

      const loanFieldStr =
        typeof loanFieldValue === 'string' ? loanFieldValue : String(loanFieldValue)

      if (loanFieldStr === oldIdStr || loanFieldValue === oldId) {
        await localCache.loans.put({
          ...loan,
          [field]: newId,
        })
      }
    }
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
