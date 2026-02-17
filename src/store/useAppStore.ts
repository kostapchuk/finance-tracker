import { create } from 'zustand'

import {
  isMigrationComplete,
  hasLocalData,
  migrateLocalToSupabase,
  clearLocalData,
  isCloudUnlocked,
  markMigrationComplete,
} from '@/database/migration'
import { settingsRepo } from '@/database/repositories'
import { syncService } from '@/database/syncService'
import { isSupabaseConfigured } from '@/lib/supabase'

let isInitializing = false

interface MigrationState {
  showMigrationDialog: boolean
  isMigrating: boolean
  migrationProgress: { current: number; total: number; entity: string } | null
  migrationError: string | null
}

interface AppState {
  // Settings
  mainCurrency: string
  blurFinancialFigures: boolean

  // Loading states
  isLoading: boolean

  // Migration state
  migration: MigrationState

  // UI State - Mobile-first: dashboard, history, loans, report, settings
  activeView: 'dashboard' | 'history' | 'loans' | 'report' | 'settings'

  // Selected month for filtering (defaults to current month)
  selectedMonth: Date

  // Navigation filters (set before navigating to a view)
  historyCategoryFilter: number | null
  historyAccountFilter: number | null

  // Onboarding state (0 = not active, 1-5 = steps)
  onboardingStep: number

  // Actions
  setActiveView: (view: AppState['activeView']) => void
  navigateToHistoryWithCategory: (categoryId: number) => void
  navigateToHistoryWithAccount: (accountId: number) => void
  setSelectedMonth: (date: Date) => void
  setMainCurrency: (currency: string) => Promise<void>
  setBlurFinancialFigures: (blur: boolean) => Promise<void>
  loadAllData: () => Promise<void>
  setOnboardingStep: (step: number) => void
  completeOnboarding: () => void
  skipOnboarding: () => void

  // Migration actions
  startMigration: () => Promise<void>
  skipMigration: () => Promise<void>
  dismissMigrationDialog: () => void
  showMigrationDialogManually: () => Promise<void>
}

export const useAppStore = create<AppState>((set) => ({
  mainCurrency: 'BYN',
  blurFinancialFigures: false,
  isLoading: true,
  migration: {
    showMigrationDialog: false,
    isMigrating: false,
    migrationProgress: null,
    migrationError: null,
  },
  activeView: 'dashboard',
  selectedMonth: new Date(),
  historyCategoryFilter: null,
  historyAccountFilter: null,
  onboardingStep: 0,

  setActiveView: (view) => set({ activeView: view }),
  navigateToHistoryWithCategory: (categoryId) =>
    set({ historyCategoryFilter: categoryId, activeView: 'history' }),
  navigateToHistoryWithAccount: (accountId) =>
    set({ historyAccountFilter: accountId, activeView: 'history' }),
  setSelectedMonth: (date) => set({ selectedMonth: date }),

  setMainCurrency: async (currency: string) => {
    await settingsRepo.update({ defaultCurrency: currency })
    set({ mainCurrency: currency })
  },

  setBlurFinancialFigures: async (blur: boolean) => {
    await settingsRepo.update({ blurFinancialFigures: blur })
    set({ blurFinancialFigures: blur })
  },

  loadAllData: async () => {
    if (isInitializing) return
    isInitializing = true

    set({ isLoading: true })

    try {
      const settings = await settingsRepo.get()
      const mainCurrency = settings?.defaultCurrency || 'BYN'
      const blurFinancialFigures = settings?.blurFinancialFigures || false

      const migrationComplete = isMigrationComplete()
      const hasExistingLocalData = await hasLocalData()

      if (
        !migrationComplete &&
        hasExistingLocalData &&
        isSupabaseConfigured() &&
        isCloudUnlocked()
      ) {
        set({
          isLoading: false,
          mainCurrency,
          blurFinancialFigures,
          migration: {
            showMigrationDialog: true,
            isMigrating: false,
            migrationProgress: null,
            migrationError: null,
          },
        })
        isInitializing = false
        return
      }

      const onboardingCompleted =
        localStorage.getItem('finance-tracker-onboarding-completed') === 'true'

      if (isSupabaseConfigured() && isCloudUnlocked()) {
        await syncService.pullFromRemote()
        await syncService.syncAll()
      }

      set({
        mainCurrency,
        blurFinancialFigures,
        isLoading: false,
        onboardingStep: onboardingCompleted ? 0 : 0,
        migration: {
          showMigrationDialog: false,
          isMigrating: false,
          migrationProgress: null,
          migrationError: null,
        },
      })
    } catch (error) {
      console.error('Failed to load data:', error)
      set({ isLoading: false })
    } finally {
      isInitializing = false
    }
  },

  setOnboardingStep: (step) => set({ onboardingStep: step }),

  completeOnboarding: () => {
    localStorage.setItem('finance-tracker-onboarding-completed', 'true')
    set({ onboardingStep: 0 })
  },

  skipOnboarding: () => {
    localStorage.setItem('finance-tracker-onboarding-completed', 'true')
    set({ onboardingStep: 0 })
  },

  startMigration: async () => {
    set({
      migration: {
        showMigrationDialog: true,
        isMigrating: true,
        migrationProgress: null,
        migrationError: null,
      },
    })

    const result = await migrateLocalToSupabase((progress) => {
      set((state) => ({
        migration: {
          ...state.migration,
          migrationProgress: progress,
        },
      }))
    })

    if (result.success) {
      set({
        migration: {
          showMigrationDialog: false,
          isMigrating: false,
          migrationProgress: null,
          migrationError: null,
        },
      })
    } else {
      set((state) => ({
        migration: {
          ...state.migration,
          isMigrating: false,
          migrationError: result.error || 'Migration failed',
        },
      }))
    }
  },

  skipMigration: async () => {
    await clearLocalData()
    markMigrationComplete()
    set({
      migration: {
        showMigrationDialog: false,
        isMigrating: false,
        migrationProgress: null,
        migrationError: null,
      },
    })
  },

  dismissMigrationDialog: () => {
    set((state) => ({
      migration: {
        ...state.migration,
        showMigrationDialog: false,
      },
    }))
  },

  showMigrationDialogManually: async () => {
    const hasExistingLocalData = await hasLocalData()
    if (hasExistingLocalData) {
      set({
        migration: {
          showMigrationDialog: true,
          isMigrating: false,
          migrationProgress: null,
          migrationError: null,
        },
      })
    } else {
      // No local data to migrate, mark as complete so sync section appears
      markMigrationComplete()
    }
  },
}))
