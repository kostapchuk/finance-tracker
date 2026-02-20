/* eslint-disable react-hooks/rules-of-hooks */
import { test as base } from '@playwright/test'
import { IndexedDBHelper } from '../helpers/indexeddb.helper'
import { SyncHelper, type SyncMode } from '../helpers/sync.helper'
import { DashboardPage } from '../page-objects/dashboard.page'
import { HistoryPage } from '../page-objects/history.page'
import { LoansPage } from '../page-objects/loans.page'
import { SettingsPage } from '../page-objects/settings.page'
import { ReportPage } from '../page-objects/report.page'

type TestFixtures = {
  dbHelper: IndexedDBHelper
  syncHelper: SyncHelper
  dashboardPage: DashboardPage
  historyPage: HistoryPage
  loansPage: LoansPage
  settingsPage: SettingsPage
  reportPage: ReportPage
  setupCleanState: (syncMode?: SyncMode) => Promise<void>
  setupSyncMode: (mode: SyncMode) => Promise<void>
  cleanupAllData: () => Promise<void>
  seedAccount: (account: import('../fixtures/test-data').TestAccount) => Promise<number>
  seedCategory: (category: import('../fixtures/test-data').TestCategory) => Promise<number>
  seedIncomeSource: (
    incomeSource: import('../fixtures/test-data').TestIncomeSource
  ) => Promise<number>
  seedLoan: (loan: import('../fixtures/test-data').TestLoan) => Promise<number>
  seedTransaction: (transaction: import('../fixtures/test-data').TestTransaction) => Promise<number>
}

export const test = base.extend<TestFixtures>({
  dbHelper: async ({ page }, use) => {
    const helper = new IndexedDBHelper(page)
    await use(helper)
  },

  syncHelper: async ({ page, dbHelper }, use) => {
    const helper = new SyncHelper({ page, dbHelper })
    await use(helper)
  },

  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page)
    await use(dashboardPage)
  },

  historyPage: async ({ page }, use) => {
    const historyPage = new HistoryPage(page)
    await use(historyPage)
  },

  loansPage: async ({ page }, use) => {
    const loansPage = new LoansPage(page)
    await use(loansPage)
  },

  settingsPage: async ({ page }, use) => {
    const settingsPage = new SettingsPage(page)
    await use(settingsPage)
  },

  reportPage: async ({ page }, use) => {
    const reportPage = new ReportPage(page)
    await use(reportPage)
  },

  cleanupAllData: async ({ dbHelper, syncHelper }, use) => {
    const cleanup = async () => {
      await dbHelper.clearDatabase()
      await syncHelper.clearRemoteData()
    }
    await use(cleanup)
  },

  setupSyncMode: async ({ syncHelper }, use) => {
    const setup = async (mode: SyncMode) => {
      await syncHelper.configureMode(mode)
    }
    await use(setup)
  },

  setupCleanState: async ({ page, syncHelper, dbHelper }, use) => {
    const setup = async (syncMode: SyncMode = 'sync-disabled') => {
      await page.addInitScript((mode) => {
        localStorage.setItem('finance-tracker-language', 'en')
        localStorage.setItem('finance-tracker-onboarding-completed', 'true')
        localStorage.setItem('finance-tracker-migration-complete', 'true')

        if (mode !== 'sync-disabled') {
          localStorage.setItem('finance-tracker-cloud-unlocked', 'true')
          ;(
            window as unknown as { __TEST_SUPABASE_CONFIGURED__: boolean }
          ).__TEST_SUPABASE_CONFIGURED__ = true
        }
      }, syncMode)

      await page.goto('/')
      await page.waitForLoadState('networkidle')
      await page.waitForSelector('nav', { state: 'visible', timeout: 10000 })

      const skipButton = page.getByText('Skip')
      if (await skipButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await skipButton.click()
        await page.waitForTimeout(300)
      }

      const migrateButton = page.getByText('Skip', { exact: true })
      if (await migrateButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await migrateButton.click()
        await page.waitForTimeout(300)
      }

      await syncHelper.configureMode(syncMode)

      await dbHelper.waitForAppReady()
    }
    await use(setup)
  },

  seedAccount: async ({ dbHelper, syncHelper }, use) => {
    const seed = async (account: import('../fixtures/test-data').TestAccount) => {
      const id = await dbHelper.seedAccount(account)
      const mode = syncHelper.getMode()
      if (mode !== 'sync-disabled') {
        syncHelper.seedMockRemoteData('accounts', { ...account, id })
      }
      return id
    }
    await use(seed)
  },

  seedCategory: async ({ dbHelper, syncHelper }, use) => {
    const seed = async (category: import('../fixtures/test-data').TestCategory) => {
      const id = await dbHelper.seedCategory(category)
      const mode = syncHelper.getMode()
      if (mode !== 'sync-disabled') {
        syncHelper.seedMockRemoteData('categories', { ...category, id })
      }
      return id
    }
    await use(seed)
  },

  seedIncomeSource: async ({ dbHelper, syncHelper }, use) => {
    const seed = async (incomeSource: import('../fixtures/test-data').TestIncomeSource) => {
      const id = await dbHelper.seedIncomeSource(incomeSource)
      const mode = syncHelper.getMode()
      if (mode !== 'sync-disabled') {
        syncHelper.seedMockRemoteData('income_sources', { ...incomeSource, id })
      }
      return id
    }
    await use(seed)
  },

  seedLoan: async ({ dbHelper, syncHelper }, use) => {
    const seed = async (loan: import('../fixtures/test-data').TestLoan) => {
      const id = await dbHelper.seedLoan(loan)
      const mode = syncHelper.getMode()
      if (mode !== 'sync-disabled') {
        syncHelper.seedMockRemoteData('loans', { ...loan, id })
      }
      return id
    }
    await use(seed)
  },

  seedTransaction: async ({ dbHelper, syncHelper }, use) => {
    const seed = async (transaction: import('../fixtures/test-data').TestTransaction) => {
      const id = await dbHelper.seedTransaction(transaction)
      const mode = syncHelper.getMode()
      if (mode !== 'sync-disabled') {
        syncHelper.seedMockRemoteData('transactions', { ...transaction, id })
      }
      return id
    }
    await use(seed)
  },
})

export { expect } from '@playwright/test'
export type { SyncMode }
