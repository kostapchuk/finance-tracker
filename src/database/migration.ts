import { db } from './db'
import { localCache } from './localCache'
import { supabaseApi } from './supabaseApi'
import type {
  Account,
  IncomeSource,
  Category,
  Transaction,
  Loan,
  AppSettings,
  CustomCurrency,
} from './types'

import { getDeviceId } from '@/lib/deviceId'
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

export async function migrateLocalToSupabase(
  onProgress?: (progress: { current: number; total: number; entity: string }) => void
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase is not configured' }
  }

  const userId = getDeviceId()

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
      const accountData = { ...account, userId }
      delete accountData.id
      await supabaseApi.accounts.create(
        accountData as Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
      )
      updateProgress('accounts')
    }

    for (const source of incomeSources) {
      const sourceData = { ...source, userId }
      delete sourceData.id
      await supabaseApi.incomeSources.create(
        sourceData as Omit<IncomeSource, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
      )
      updateProgress('incomeSources')
    }

    for (const category of categories) {
      const categoryData = { ...category, userId }
      delete categoryData.id
      await supabaseApi.categories.create(
        categoryData as Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
      )
      updateProgress('categories')
    }

    for (const transaction of transactions) {
      const transactionData = { ...transaction, userId }
      delete transactionData.id
      await supabaseApi.transactions.create(
        transactionData as Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
      )
      updateProgress('transactions')
    }

    for (const loan of loans) {
      const loanData = { ...loan, userId }
      delete loanData.id
      await supabaseApi.loans.create(
        loanData as Omit<Loan, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
      )
      updateProgress('loans')
    }

    if (settings.length > 0) {
      const settingsData = { ...settings[0], userId }
      delete settingsData.id
      await supabaseApi.settings.create(
        settingsData as Omit<AppSettings, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
      )
      updateProgress('settings')
    }

    for (const currency of customCurrencies) {
      const currencyData = { ...currency, userId }
      delete currencyData.id
      await supabaseApi.customCurrencies.create(
        currencyData as Omit<CustomCurrency, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
      )
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
