import { db } from './db'
import { localCache } from './localCache'
import { supabaseApi } from './supabaseApi'

import { isSupabaseConfigured } from '@/lib/supabase'

const MIGRATION_KEY = 'finance-tracker-migration-complete'
const CLOUD_UNLOCK_KEY = 'finance-tracker-cloud-unlocked'

export function isMigrationComplete(): boolean {
  return localStorage.getItem(MIGRATION_KEY) === 'true'
}

export function markMigrationComplete(): void {
  localStorage.setItem(MIGRATION_KEY, 'true')
}

export function isCloudUnlocked(): boolean {
  return localStorage.getItem(CLOUD_UNLOCK_KEY) === 'true'
}

export function setCloudUnlocked(): void {
  localStorage.setItem(CLOUD_UNLOCK_KEY, 'true')
}

/**
 * Checks if the app is ready to use cloud storage.
 * Requires: 1) Supabase configured, 2) Cloud unlocked, 3) Migration complete
 */
export function isCloudReady(): boolean {
  return isSupabaseConfigured() && isCloudUnlocked() && isMigrationComplete()
}

export async function hasLocalData(): Promise<boolean> {
  // Check both the old database (FinanceTrackerDB) and the new cache (FinanceTrackerCache)
  const [oldAccounts, oldTransactions, oldIncomeSources] = await Promise.all([
    db.accounts.count(),
    db.transactions.count(),
    db.incomeSources.count(),
  ])

  if (oldAccounts > 0 || oldTransactions > 0 || oldIncomeSources > 0) {
    return true
  }

  // Also check the new localCache database
  const [cacheAccounts, cacheTransactions, cacheIncomeSources] = await Promise.all([
    localCache.accounts.count(),
    localCache.transactions.count(),
    localCache.incomeSources.count(),
  ])

  return cacheAccounts > 0 || cacheTransactions > 0 || cacheIncomeSources > 0
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidUUID(id: unknown): id is string {
  return typeof id === 'string' && UUID_REGEX.test(id)
}

function generateUUID(): string {
  return crypto.randomUUID()
}

interface IdMapping {
  accounts: Map<string | number, string>
  incomeSources: Map<string | number, string>
  categories: Map<string | number, string>
  customCurrencies: Map<string | number, string>
  loans: Map<string | number, string>
}

export function getOrCreateMappedId(
  oldId: string | number | undefined,
  mapping: Map<string | number, string>
): string {
  if (oldId === undefined || oldId === null) {
    return generateUUID()
  }

  if (isValidUUID(oldId)) {
    return oldId
  }

  const existing = mapping.get(oldId)
  if (existing) {
    return existing
  }

  const newId = generateUUID()
  mapping.set(oldId, newId)
  return newId
}

export async function migrateLocalToSupabase(
  onProgress?: (progress: { current: number; total: number; entity: string }) => void
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase is not configured' }
  }

  try {
    const [accounts, incomeSources, categories, transactions, loans, settings, customCurrencies] =
      await Promise.all([
        db.accounts.toArray(),
        db.incomeSources.toArray(),
        db.categories.toArray(),
        db.transactions.toArray(),
        db.loans.toArray(),
        db.settings.toArray(),
        db.customCurrencies.toArray(),
      ])

    const totalItems =
      accounts.length +
      incomeSources.length +
      categories.length +
      transactions.length +
      loans.length +
      (settings.length > 0 ? 1 : 0) +
      customCurrencies.length

    let current = 0

    const updateProgress = (entity: string) => {
      current++
      onProgress?.({ current, total: totalItems, entity })
    }

    const idMapping: IdMapping = {
      accounts: new Map(),
      incomeSources: new Map(),
      categories: new Map(),
      customCurrencies: new Map(),
      loans: new Map(),
    }

    for (const account of accounts) {
      const newId = getOrCreateMappedId(account.id, idMapping.accounts)
      await supabaseApi.accounts.upsert({
        ...account,
        id: newId,
      })
      updateProgress('accounts')
    }

    for (const source of incomeSources) {
      const newId = getOrCreateMappedId(source.id, idMapping.incomeSources)
      await supabaseApi.incomeSources.upsert({
        ...source,
        id: newId,
      })
      updateProgress('incomeSources')
    }

    for (const category of categories) {
      const newId = getOrCreateMappedId(category.id, idMapping.categories)
      await supabaseApi.categories.upsert({
        ...category,
        id: newId,
      })
      updateProgress('categories')
    }

    for (const currency of customCurrencies) {
      const newId = getOrCreateMappedId(currency.id, idMapping.customCurrencies)
      await supabaseApi.customCurrencies.upsert({
        ...currency,
        id: newId,
      })
      updateProgress('customCurrencies')
    }

    for (const loan of loans) {
      const newId = getOrCreateMappedId(loan.id, idMapping.loans)
      const mappedAccountId = loan.accountId
        ? getOrCreateMappedId(loan.accountId, idMapping.accounts)
        : undefined
      await supabaseApi.loans.upsert({
        ...loan,
        id: newId,
        accountId: mappedAccountId,
      })
      updateProgress('loans')
    }

    for (const transaction of transactions) {
      const newId = isValidUUID(transaction.id) ? transaction.id : generateUUID()
      const mappedAccountId = transaction.accountId
        ? getOrCreateMappedId(transaction.accountId, idMapping.accounts)
        : undefined
      const mappedToAccountId = transaction.toAccountId
        ? getOrCreateMappedId(transaction.toAccountId, idMapping.accounts)
        : undefined
      const mappedCategoryId = transaction.categoryId
        ? getOrCreateMappedId(transaction.categoryId, idMapping.categories)
        : undefined
      const mappedIncomeSourceId = transaction.incomeSourceId
        ? getOrCreateMappedId(transaction.incomeSourceId, idMapping.incomeSources)
        : undefined
      const mappedLoanId = transaction.loanId
        ? getOrCreateMappedId(transaction.loanId, idMapping.loans)
        : undefined
      await supabaseApi.transactions.upsert({
        ...transaction,
        id: newId,
        accountId: mappedAccountId,
        toAccountId: mappedToAccountId,
        categoryId: mappedCategoryId,
        incomeSourceId: mappedIncomeSourceId,
        loanId: mappedLoanId,
      })
      updateProgress('transactions')
    }

    if (settings.length > 0) {
      const setting = settings[0]
      const newId = isValidUUID(setting.id) ? setting.id : generateUUID()
      await supabaseApi.settings.upsert({
        ...setting,
        id: newId,
      })
      updateProgress('settings')
    }

    await db.accounts.clear()
    await db.incomeSources.clear()
    await db.categories.clear()
    await db.transactions.clear()
    await db.loans.clear()
    await db.settings.clear()
    await db.customCurrencies.clear()

    const [
      remoteAccounts,
      remoteIncomeSources,
      remoteCategories,
      remoteTransactions,
      remoteLoans,
      remoteSettings,
      remoteCurrencies,
    ] = await Promise.all([
      supabaseApi.accounts.getAll(),
      supabaseApi.incomeSources.getAll(),
      supabaseApi.categories.getAll(),
      supabaseApi.transactions.getRecent(50),
      supabaseApi.loans.getAll(),
      supabaseApi.settings.get(),
      supabaseApi.customCurrencies.getAll(),
    ])

    await Promise.all([
      localCache.accounts.putAll(remoteAccounts),
      localCache.incomeSources.putAll(remoteIncomeSources),
      localCache.categories.putAll(remoteCategories),
      localCache.transactions.putAll(remoteTransactions),
      localCache.loans.putAll(remoteLoans),
      remoteSettings ? localCache.settings.put(remoteSettings) : Promise.resolve(),
      localCache.customCurrencies.putAll(remoteCurrencies),
    ])

    markMigrationComplete()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Migration failed',
    }
  }
}

export async function clearLocalData(): Promise<void> {
  await db.accounts.clear()
  await db.incomeSources.clear()
  await db.categories.clear()
  await db.transactions.clear()
  await db.loans.clear()
  await db.settings.clear()
  await db.customCurrencies.clear()
  await localCache.clearAll()
}
