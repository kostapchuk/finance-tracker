type DbRecord = Record<string, unknown>

interface MockDatabase {
  accounts: DbRecord[]
  income_sources: DbRecord[]
  categories: DbRecord[]
  transactions: DbRecord[]
  loans: DbRecord[]
  settings: DbRecord[]
  custom_currencies: DbRecord[]
  report_cache: DbRecord[]
}

class MockStorage {
  private db: MockDatabase = {
    accounts: [],
    income_sources: [],
    categories: [],
    transactions: [],
    loans: [],
    settings: [],
    custom_currencies: [],
    report_cache: [],
  }

  private currentUserId: string | null = null

  private idCounters: Record<string, number> = {
    accounts: 1,
    income_sources: 1,
    categories: 1,
    transactions: 1,
    loans: 1,
    settings: 1,
    custom_currencies: 1,
    report_cache: 1,
  }

  setUserId(userId: string): void {
    this.currentUserId = userId
  }

  getUserId(): string | null {
    return this.currentUserId
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
  }

  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
  }

  private transformToSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[this.toSnakeCase(key)] = value
    }
    return result
  }

  private transformToCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[this.toCamelCase(key)] = value
    }
    return result
  }

  private formatDate(date: Date | string | undefined): string | undefined {
    if (!date) return undefined
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toISOString()
  }

  insert(table: keyof MockDatabase, record: Record<string, unknown>): Record<string, unknown> {
    const id = this.idCounters[table]++
    const now = new Date().toISOString()

    const dbRecord: Record<string, unknown> = {
      id,
      user_id: this.currentUserId,
      created_at: now,
      updated_at: now,
      ...this.transformToSnakeCase(record),
    }

    if (dbRecord.date && typeof dbRecord.date !== 'string') {
      dbRecord.date = this.formatDate(dbRecord.date as Date)
    }
    if (dbRecord.due_date && typeof dbRecord.due_date !== 'string') {
      dbRecord.due_date = this.formatDate(dbRecord.due_date as Date)
    }

    this.db[table].push(dbRecord)
    return dbRecord
  }

  update(
    table: keyof MockDatabase,
    id: number,
    updates: Record<string, unknown>
  ): Record<string, unknown> | null {
    const index = this.db[table].findIndex((r) => r.id === id && r.user_id === this.currentUserId)
    if (index === -1) return null

    const existing = this.db[table][index]
    const snakeUpdates = this.transformToSnakeCase(updates)
    const updated: DbRecord = {
      ...existing,
      ...snakeUpdates,
      updated_at: new Date().toISOString(),
    }

    if ('date' in updated && typeof updated.date !== 'string') {
      updated.date = this.formatDate(updated.date as Date)
    }
    if ('due_date' in updated && typeof updated.due_date !== 'string') {
      updated.due_date = this.formatDate(updated.due_date as Date)
    }

    this.db[table][index] = updated
    return updated
  }

  delete(table: keyof MockDatabase, id: number): boolean {
    const index = this.db[table].findIndex((r) => r.id === id && r.user_id === this.currentUserId)
    if (index === -1) return false
    this.db[table].splice(index, 1)
    return true
  }

  getAll(table: keyof MockDatabase): Record<string, unknown>[] {
    return this.db[table]
      .filter((r) => r.user_id === this.currentUserId)
      .map((r) => this.transformToCamelCase(r))
  }

  getById(table: keyof MockDatabase, id: number): Record<string, unknown> | null {
    const record = this.db[table].find((r) => r.id === id && r.user_id === this.currentUserId)
    return record ? this.transformToCamelCase(record) : null
  }

  getCount(table: keyof MockDatabase): number {
    return this.db[table].filter((r) => r.user_id === this.currentUserId).length
  }

  clear(): void {
    this.db = {
      accounts: [],
      income_sources: [],
      categories: [],
      transactions: [],
      loans: [],
      settings: [],
      custom_currencies: [],
      report_cache: [],
    }
    this.idCounters = {
      accounts: 1,
      income_sources: 1,
      categories: 1,
      transactions: 1,
      loans: 1,
      settings: 1,
      custom_currencies: 1,
      report_cache: 1,
    }
  }

  clearForUser(): void {
    for (const table of Object.keys(this.db) as (keyof MockDatabase)[]) {
      this.db[table] = this.db[table].filter((r) => r.user_id !== this.currentUserId)
    }
  }
}

export const mockStorage = new MockStorage()
