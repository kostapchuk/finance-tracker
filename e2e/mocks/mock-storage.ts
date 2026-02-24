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
    const now = new Date().toISOString()

    // Use provided ID if available (for UUID support), otherwise generate numeric ID
    const id = record.id ?? Date.now()

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
    id: string | number,
    updates: Record<string, unknown>
  ): Record<string, unknown> | null {
    // Find by ID, supporting both string and numeric IDs
    const index = this.db[table].findIndex((r) => {
      const recordId = r.id
      const matchesUserId = r.user_id === this.currentUserId
      // Compare as strings to handle both UUID and numeric IDs
      return String(recordId) === String(id) && matchesUserId
    })
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

  delete(table: keyof MockDatabase, id: string | number): boolean {
    const index = this.db[table].findIndex((r) => {
      const recordId = r.id
      const matchesUserId = r.user_id === this.currentUserId
      return String(recordId) === String(id) && matchesUserId
    })
    if (index === -1) return false
    this.db[table].splice(index, 1)
    return true
  }

  getAll(table: keyof MockDatabase): Record<string, unknown>[] {
    return this.db[table]
      .filter((r) => r.user_id === this.currentUserId)
      .map((r) => this.transformToCamelCase(r))
  }

  getById(table: keyof MockDatabase, id: string | number): Record<string, unknown> | null {
    const record = this.db[table].find((r) => {
      const recordId = r.id
      const matchesUserId = r.user_id === this.currentUserId
      return String(recordId) === String(id) && matchesUserId
    })
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
  }

  clearForUser(): void {
    for (const table of Object.keys(this.db) as (keyof MockDatabase)[]) {
      this.db[table] = this.db[table].filter((r) => r.user_id !== this.currentUserId)
    }
  }
}

export const mockStorage = new MockStorage()
