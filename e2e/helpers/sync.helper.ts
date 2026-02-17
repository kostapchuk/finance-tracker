import type { Page, Route } from '@playwright/test'
import { mockStorage } from '../mocks/mock-storage'

export type SyncMode = 'sync-disabled' | 'sync-enabled-online' | 'sync-enabled-offline'

interface SyncHelperOptions {
  page: Page
  dbHelper: {
    getUserId: () => Promise<string>
    clearDatabase: () => Promise<void>
    getTransactionCount: () => Promise<number>
    getAccountBalance: (id: number) => Promise<number>
  }
}

export class SyncHelper {
  private mode: SyncMode = 'sync-disabled'
  private page: Page
  private dbHelper: SyncHelperOptions['dbHelper']
  private isOffline = false
  private routesSetup = false

  constructor(options: SyncHelperOptions) {
    this.page = options.page
    this.dbHelper = options.dbHelper
  }

  async configureMode(mode: SyncMode): Promise<void> {
    this.mode = mode

    const userId = await this.dbHelper.getUserId()
    mockStorage.setUserId(userId)
    mockStorage.clearForUser()

    if (mode === 'sync-disabled') {
      await this.page.evaluate(() => {
        localStorage.setItem('finance-tracker-cloud-unlocked', 'false')
        ;(
          globalThis as unknown as { __TEST_SUPABASE_CONFIGURED__?: boolean }
        ).__TEST_SUPABASE_CONFIGURED__ = false
      })
    } else {
      await this.page.evaluate(() => {
        localStorage.setItem('finance-tracker-cloud-unlocked', 'true')
        ;(
          globalThis as unknown as { __TEST_SUPABASE_CONFIGURED__?: boolean }
        ).__TEST_SUPABASE_CONFIGURED__ = true
      })

      if (!this.routesSetup) {
        await this.setupRouteInterception()
        this.routesSetup = true
      }
    }
  }

  private async setupRouteInterception(): Promise<void> {
    await this.page.route('**/rest/v1/**', async (route: Route) => {
      if (this.isOffline) {
        await route.abort('failed')
        return
      }

      const url = route.request().url()
      const path = new URL(url).pathname
      const method = route.request().method()
      const postData = route.request().postDataJSON()

      await this.handleRestRequest(route, path, method, postData)
    })
  }

  private async handleRestRequest(
    route: Route,
    path: string,
    method: string,
    postData: unknown
  ): Promise<void> {
    const tableName = this.extractTableName(path)

    if (!tableName) {
      await route.fulfill({ status: 404, body: 'Not found' })
      return
    }

    switch (method) {
      case 'GET':
        await this.handleGet(route, tableName)
        break
      case 'POST':
        await this.handlePost(route, tableName, postData)
        break
      case 'PATCH':
        await this.handlePatch(route, tableName, postData, path)
        break
      case 'DELETE':
        await this.handleDelete(route, tableName, path)
        break
      default:
        await route.fulfill({ status: 405, body: 'Method not allowed' })
    }
  }

  private extractTableName(path: string): string | null {
    const match = path.match(/\/rest\/v1\/(\w+)/)
    return match ? match[1] : null
  }

  private tableNameToStorageKey(
    tableName: string
  ):
    | 'accounts'
    | 'income_sources'
    | 'categories'
    | 'transactions'
    | 'loans'
    | 'settings'
    | 'custom_currencies'
    | 'report_cache' {
    const mapping: Record<
      string,
      | 'accounts'
      | 'income_sources'
      | 'categories'
      | 'transactions'
      | 'loans'
      | 'settings'
      | 'custom_currencies'
      | 'report_cache'
    > = {
      accounts: 'accounts',
      income_sources: 'income_sources',
      categories: 'categories',
      transactions: 'transactions',
      loans: 'loans',
      settings: 'settings',
      custom_currencies: 'custom_currencies',
      report_cache: 'report_cache',
    }
    return mapping[tableName] || 'accounts'
  }

  private async handleGet(route: Route, tableName: string): Promise<void> {
    const storageKey = this.tableNameToStorageKey(tableName)
    const data = mockStorage.getAll(storageKey)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data),
    })
  }

  private async handlePost(route: Route, tableName: string, postData: unknown): Promise<void> {
    const storageKey = this.tableNameToStorageKey(tableName)

    // Handle bulk inserts (arrays)
    if (Array.isArray(postData)) {
      const records = postData.map((record) =>
        mockStorage.insert(storageKey, record as Record<string, unknown>)
      )
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(records),
      })
      return
    }

    const record = mockStorage.insert(storageKey, postData as Record<string, unknown>)
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(record),
    })
  }

  private async handlePatch(
    route: Route,
    tableName: string,
    postData: unknown,
    path: string
  ): Promise<void> {
    const storageKey = this.tableNameToStorageKey(tableName)
    const id = this.extractIdFromPath(path)

    if (id === null) {
      const data = mockStorage.getAll(storageKey)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(data),
      })
      return
    }

    const record = mockStorage.update(storageKey, id, postData as Record<string, unknown>)
    if (!record) {
      await route.fulfill({ status: 404, body: 'Not found' })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(record),
    })
  }

  private async handleDelete(route: Route, tableName: string, path: string): Promise<void> {
    const storageKey = this.tableNameToStorageKey(tableName)
    const id = this.extractIdFromPath(path)

    // Handle bulk deletes (no ID in path, e.g., DELETE from report_cache with query params)
    if (id === null) {
      // For report_cache and other tables, just clear all records for the user
      const allRecords = mockStorage.getAll(storageKey)
      for (const record of allRecords) {
        if (record.id) {
          mockStorage.delete(storageKey, record.id as number)
        }
      }
      await route.fulfill({ status: 200, body: '[]' })
      return
    }

    const success = mockStorage.delete(storageKey, id)
    await route.fulfill({ status: success ? 200 : 404, body: success ? '{}' : 'Not found' })
  }

  private extractIdFromPath(path: string): number | null {
    const match = path.match(/id=eq\.(\d+)/)
    return match ? parseInt(match[1], 10) : null
  }

  async goOffline(): Promise<void> {
    this.isOffline = true
    await this.page.context().setOffline(true)
    await this.page.evaluate(() => {
      globalThis.dispatchEvent(new Event('offline'))
    })
  }

  async goOnline(): Promise<void> {
    this.isOffline = false
    await this.page.context().setOffline(false)
    await this.page.evaluate(() => {
      globalThis.dispatchEvent(new Event('online'))
    })
  }

  async waitForSyncToComplete(timeout = 5000): Promise<void> {
    if (this.mode === 'sync-disabled') return

    const startTime = Date.now()
    while (Date.now() - startTime < timeout) {
      const count = await this.getSyncQueueCount()
      if (count === 0) {
        await this.page.waitForTimeout(200)
        return
      }
      await this.page.waitForTimeout(100)
    }
    throw new Error('Sync did not complete within timeout')
  }

  async getSyncQueueCount(): Promise<number> {
    return this.page.evaluate(() => {
      return new Promise<number>((resolve, reject) => {
        const request = indexedDB.open('FinanceTrackerCache')
        request.onsuccess = () => {
          const db = request.result
          if (!db.objectStoreNames.contains('syncQueue')) {
            db.close()
            resolve(0)
            return
          }
          const tx = db.transaction('syncQueue', 'readonly')
          const store = tx.objectStore('syncQueue')
          const countRequest = store.count()
          countRequest.onsuccess = () => {
            db.close()
            resolve(countRequest.result)
          }
          countRequest.onerror = () => {
            db.close()
            reject(countRequest.error)
          }
        }
        request.onerror = () => reject(request.error)
      })
    })
  }

  getMode(): SyncMode {
    return this.mode
  }

  getMockRemoteData(
    entity:
      | 'accounts'
      | 'income_sources'
      | 'categories'
      | 'transactions'
      | 'loans'
      | 'settings'
      | 'custom_currencies'
      | 'report_cache'
  ): Record<string, unknown>[] {
    return mockStorage.getAll(entity)
  }

  seedMockRemoteData(
    entity: 'accounts' | 'income_sources' | 'categories' | 'transactions' | 'loans' | 'settings',
    data: Record<string, unknown>
  ): Record<string, unknown> {
    return mockStorage.insert(entity, data)
  }

  async verifySyncState(expectedQueueCount: number): Promise<void> {
    const queueCount = await this.getSyncQueueCount()
    if (this.mode === 'sync-enabled-offline' && this.isOffline) {
      return
    }
    if (queueCount !== expectedQueueCount) {
      throw new Error(
        `Expected sync queue to have ${expectedQueueCount} items, but has ${queueCount}`
      )
    }
  }

  async clearRemoteData(): Promise<void> {
    mockStorage.clearForUser()
  }
}
