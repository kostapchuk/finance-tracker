import { create } from 'zustand'
import type { Account, IncomeSource, Category, Transaction, Investment, Loan, CustomCurrency } from '@/database/types'
import { accountRepo, incomeSourceRepo, categoryRepo, transactionRepo, investmentRepo, loanRepo, customCurrencyRepo, settingsRepo } from '@/database/repositories'

interface AppState {
  // Data
  accounts: Account[]
  incomeSources: IncomeSource[]
  categories: Category[]
  transactions: Transaction[]
  investments: Investment[]
  loans: Loan[]
  customCurrencies: CustomCurrency[]

  // Settings
  mainCurrency: string

  // Loading states
  isLoading: boolean

  // UI State - Mobile-first: dashboard, history, loans, report, settings
  activeView: 'dashboard' | 'history' | 'loans' | 'report' | 'settings'

  // Selected month for filtering (defaults to current month)
  selectedMonth: Date

  // Navigation filters (set before navigating to a view)
  historyCategoryFilter: number | null
  historyAccountFilter: number | null

  // Actions
  setActiveView: (view: AppState['activeView']) => void
  navigateToHistoryWithCategory: (categoryId: number) => void
  navigateToHistoryWithAccount: (accountId: number) => void
  setSelectedMonth: (date: Date) => void
  setMainCurrency: (currency: string) => Promise<void>
  loadAllData: () => Promise<void>
  refreshAccounts: () => Promise<void>
  refreshIncomeSources: () => Promise<void>
  refreshCategories: () => Promise<void>
  refreshTransactions: () => Promise<void>
  refreshInvestments: () => Promise<void>
  refreshLoans: () => Promise<void>
  refreshCustomCurrencies: () => Promise<void>
}

export const useAppStore = create<AppState>((set) => ({
  accounts: [],
  incomeSources: [],
  categories: [],
  transactions: [],
  investments: [],
  loans: [],
  customCurrencies: [],
  mainCurrency: 'BYN',
  isLoading: true,
  activeView: 'dashboard',
  selectedMonth: new Date(),
  historyCategoryFilter: null,
  historyAccountFilter: null,

  setActiveView: (view) => set({ activeView: view }),
  navigateToHistoryWithCategory: (categoryId) => set({ historyCategoryFilter: categoryId, activeView: 'history' }),
  navigateToHistoryWithAccount: (accountId) => set({ historyAccountFilter: accountId, activeView: 'history' }),
  setSelectedMonth: (date) => set({ selectedMonth: date }),

  setMainCurrency: async (currency: string) => {
    await settingsRepo.update({ defaultCurrency: currency })
    set({ mainCurrency: currency })
  },

  loadAllData: async () => {
    set({ isLoading: true })
    try {
      const [accounts, incomeSources, categories, transactions, investments, loans, customCurrencies, settings] = await Promise.all([
        accountRepo.getAll(),
        incomeSourceRepo.getAll(),
        categoryRepo.getAll(),
        transactionRepo.getAll(),
        investmentRepo.getAll(),
        loanRepo.getAll(),
        customCurrencyRepo.getAll(),
        settingsRepo.get(),
      ])
      set({
        accounts,
        incomeSources,
        categories,
        transactions,
        investments,
        loans,
        customCurrencies,
        mainCurrency: settings?.defaultCurrency || 'BYN',
        isLoading: false,
      })
    } catch (error) {
      console.error('Failed to load data:', error)
      set({ isLoading: false })
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

  refreshInvestments: async () => {
    const investments = await investmentRepo.getAll()
    set({ investments })
  },

  refreshLoans: async () => {
    const loans = await loanRepo.getAll()
    set({ loans })
  },

  refreshCustomCurrencies: async () => {
    const customCurrencies = await customCurrencyRepo.getAll()
    set({ customCurrencies })
  },
}))
