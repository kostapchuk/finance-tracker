import { create } from 'zustand'

import {
  accountRepo,
  incomeSourceRepo,
  categoryRepo,
  transactionRepo,
  loanRepo,
  customCurrencyRepo,
  settingsRepo,
} from '@/database/repositories'
import type {
  Account,
  IncomeSource,
  Category,
  Transaction,
  Loan,
  CustomCurrency,
} from '@/database/types'

// Guard to prevent duplicate data initialization (React StrictMode calls effects twice)
let isInitializing = false

interface AppState {
  // Data
  accounts: Account[]
  incomeSources: IncomeSource[]
  categories: Category[]
  transactions: Transaction[]
  loans: Loan[]
  customCurrencies: CustomCurrency[]

  // Settings
  mainCurrency: string
  blurFinancialFigures: boolean

  // Loading states
  isLoading: boolean

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
  refreshAccounts: () => Promise<void>
  refreshIncomeSources: () => Promise<void>
  refreshCategories: () => Promise<void>
  refreshTransactions: () => Promise<void>
  refreshLoans: () => Promise<void>
  refreshCustomCurrencies: () => Promise<void>
  setOnboardingStep: (step: number) => void
  completeOnboarding: () => void
  skipOnboarding: () => void
}

export const useAppStore = create<AppState>((set) => ({
  accounts: [],
  incomeSources: [],
  categories: [],
  transactions: [],
  loans: [],
  customCurrencies: [],
  mainCurrency: 'BYN',
  blurFinancialFigures: false,
  isLoading: true,
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
    // Prevent duplicate initialization (React StrictMode calls effects twice)
    if (isInitializing) return
    isInitializing = true

    set({ isLoading: true })
    try {
      const [accounts, incomeSources, categories, transactions, loans, customCurrencies, settings] =
        await Promise.all([
          accountRepo.getAll(),
          incomeSourceRepo.getAll(),
          categoryRepo.getAll(),
          transactionRepo.getAll(),
          loanRepo.getAll(),
          customCurrencyRepo.getAll(),
          settingsRepo.get(),
        ])

      const mainCurrency = settings?.defaultCurrency || 'BYN'
      const blurFinancialFigures = settings?.blurFinancialFigures || false

      // Check if this is a new user (no data in IndexedDB)
      const hasExistingData =
        accounts.length > 0 || transactions.length > 0 || incomeSources.length > 0
      const onboardingCompleted =
        localStorage.getItem('finance-tracker-onboarding-completed') === 'true'

      if (!hasExistingData && !onboardingCompleted) {
        // New user - create seed data and start onboarding
        await Promise.all([
          incomeSourceRepo.create({
            name: 'Salary',
            currency: mainCurrency,
            color: '#22c55e',
            icon: 'Banknote',
          }),
          accountRepo.create({
            name: 'Bank Account',
            type: 'bank',
            balance: 0,
            currency: mainCurrency,
            color: '#3b82f6',
            icon: 'Building2',
          }),
          categoryRepo.create({
            name: 'Groceries',
            categoryType: 'expense',
            color: '#f97316',
            icon: 'ShoppingCart',
          }),
        ])

        // Reload data after creating seed data
        const [newAccounts, newIncomeSources, newCategories] = await Promise.all([
          accountRepo.getAll(),
          incomeSourceRepo.getAll(),
          categoryRepo.getAll(),
        ])

        set({
          accounts: newAccounts,
          incomeSources: newIncomeSources,
          categories: newCategories,
          transactions,
          loans,
          customCurrencies,
          mainCurrency,
          blurFinancialFigures,
          isLoading: false,
          onboardingStep: 1, // Start onboarding
        })
      } else {
        // Existing user or onboarding already completed
        set({
          accounts,
          incomeSources,
          categories,
          transactions,
          loans,
          customCurrencies,
          mainCurrency,
          blurFinancialFigures,
          isLoading: false,
          onboardingStep: 0,
        })
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      set({ isLoading: false })
      isInitializing = false
    }
  },

  refreshAccounts: async () => {
    const accounts = await accountRepo.getAll()
    set({ accounts })
  },

  refreshIncomeSources: async () => {
    const incomeSources = await incomeSourceRepo.getAll()
    set({ incomeSources })
  },

  refreshCategories: async () => {
    const categories = await categoryRepo.getAll()
    set({ categories })
  },

  refreshTransactions: async () => {
    const transactions = await transactionRepo.getAll()
    set({ transactions })
  },

  refreshLoans: async () => {
    const loans = await loanRepo.getAll()
    set({ loans })
  },

  refreshCustomCurrencies: async () => {
    const customCurrencies = await customCurrencyRepo.getAll()
    set({ customCurrencies })
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
}))
