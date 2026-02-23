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

function generateUUID(): string {
  return crypto.randomUUID()
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

    for (const account of accounts) {
      await supabaseApi.accounts.upsert({
        ...account,
        id: generateUUID(),
      })
      updateProgress('accounts')
    }

    for (const source of incomeSources) {
      await supabaseApi.incomeSources.upsert({
        ...source,
        id: generateUUID(),
      })
      updateProgress('incomeSources')
    }

    for (const category of categories) {
      await supabaseApi.categories.upsert({
        ...category,
        id: generateUUID(),
      })
      updateProgress('categories')
    }

    for (const transaction of transactions) {
      await supabaseApi.transactions.upsert({
        ...transaction,
        id: generateUUID(),
      })
      updateProgress('transactions')
    }

    for (const loan of loans) {
      await supabaseApi.loans.upsert({
        ...loan,
        id: generateUUID(),
      })
      updateProgress('loans')
    }

    if (settings.length > 0) {
      await supabaseApi.settings.upsert({
        ...settings[0],
        id: generateUUID(),
      })
      updateProgress('settings')
    }

    for (const currency of customCurrencies) {
      await supabaseApi.customCurrencies.upsert({
        ...currency,
        id: generateUUID(),
      })
      updateProgress('customCurrencies')
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
