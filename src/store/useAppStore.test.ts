import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppStore } from './useAppStore'

import { db } from '@/database/db'
import {
  accountRepo,
  categoryRepo,
  customCurrencyRepo,
  incomeSourceRepo,
  loanRepo,
  settingsRepo,
  transactionRepo,
} from '@/database/repositories'

const initialState = useAppStore.getState()
const ONBOARDING_KEY = 'finance-tracker-onboarding-completed'

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  localStorage.clear()
  useAppStore.setState(initialState, true)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('navigation', () => {
  it('sets the active view, month and history filters', () => {
    const store = useAppStore.getState()
    const month = new Date(2026, 0, 1)

    store.setActiveView('loans')
    expect(useAppStore.getState().activeView).toBe('loans')

    store.setSelectedMonth(month)
    expect(useAppStore.getState().selectedMonth).toBe(month)

    store.navigateToHistoryWithCategory(3)
    expect(useAppStore.getState()).toMatchObject({
      activeView: 'history',
      historyCategoryFilter: 3,
    })

    store.setActiveView('dashboard')
    store.navigateToHistoryWithAccount(5)
    expect(useAppStore.getState()).toMatchObject({ activeView: 'history', historyAccountFilter: 5 })
  })
})

describe('onboarding', () => {
  it('moves between steps and remembers completion', () => {
    const store = useAppStore.getState()

    store.setOnboardingStep(3)
    expect(useAppStore.getState().onboardingStep).toBe(3)

    store.completeOnboarding()
    expect(useAppStore.getState().onboardingStep).toBe(0)
    expect(localStorage.getItem(ONBOARDING_KEY)).toBe('true')

    localStorage.clear()
    store.setOnboardingStep(2)
    store.skipOnboarding()
    expect(useAppStore.getState().onboardingStep).toBe(0)
    expect(localStorage.getItem(ONBOARDING_KEY)).toBe('true')
  })
})

describe('settings', () => {
  it('persists the main currency and blur preference', async () => {
    await settingsRepo.create({ defaultCurrency: 'USD' })
    const store = useAppStore.getState()

    await store.setMainCurrency('EUR')
    await store.setBlurFinancialFigures(true)

    expect(useAppStore.getState()).toMatchObject({
      mainCurrency: 'EUR',
      blurFinancialFigures: true,
    })
    expect(await settingsRepo.get()).toMatchObject({
      defaultCurrency: 'EUR',
      blurFinancialFigures: true,
    })
  })
})

describe('loadAllData', () => {
  it('seeds starter data and starts onboarding for a brand-new user', async () => {
    await useAppStore.getState().loadAllData()

    const state = useAppStore.getState()
    expect(state.isLoading).toBe(false)
    expect(state.onboardingStep).toBe(1)
    expect(state.mainCurrency).toBe('BYN')
    expect(state.accounts.map((a) => a.name)).toEqual(['Bank Account'])
    expect(state.incomeSources.map((s) => s.name)).toEqual(['Salary'])
    expect(state.categories.map((c) => c.name)).toEqual(['Groceries'])
  })

  it('does not seed data once onboarding was completed', async () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')

    await useAppStore.getState().loadAllData()

    expect(useAppStore.getState()).toMatchObject({ accounts: [], onboardingStep: 0 })
  })

  it('loads existing data and settings', async () => {
    await settingsRepo.create({ defaultCurrency: 'USD', blurFinancialFigures: true })
    await accountRepo.create({
      name: 'Wallet',
      type: 'cash',
      currency: 'USD',
      balance: 5,
      color: '#000',
    })
    await loanRepo.create({
      type: 'given',
      personName: 'Alice',
      amount: 10,
      currency: 'USD',
      paidAmount: 0,
      status: 'active',
    })
    await customCurrencyRepo.create({ code: 'USDT', name: 'Tether', symbol: '₮' })

    await useAppStore.getState().loadAllData()

    const state = useAppStore.getState()
    expect(state).toMatchObject({
      mainCurrency: 'USD',
      blurFinancialFigures: true,
      onboardingStep: 0,
      isLoading: false,
    })
    expect(state.accounts).toHaveLength(1)
    expect(state.loans).toHaveLength(1)
    expect(state.customCurrencies).toHaveLength(1)
    expect(state.incomeSources).toEqual([])
  })

  it('ignores a second call while the first is still loading', async () => {
    const getAll = vi.spyOn(accountRepo, 'getAll')
    localStorage.setItem(ONBOARDING_KEY, 'true')

    await Promise.all([useAppStore.getState().loadAllData(), useAppStore.getState().loadAllData()])

    expect(getAll).toHaveBeenCalledTimes(1)
  })

  it('stops loading and logs when the database fails', async () => {
    const error = new Error('boom')
    vi.spyOn(accountRepo, 'getAll').mockRejectedValue(error)
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})

    await useAppStore.getState().loadAllData()

    expect(useAppStore.getState().isLoading).toBe(false)
    expect(log).toHaveBeenCalledWith('Failed to load data:', error)
  })
})

describe('refresh actions', () => {
  it('reload each collection from the database', async () => {
    await accountRepo.create({ name: 'A', type: 'cash', currency: 'USD', balance: 0, color: '#0' })
    await incomeSourceRepo.create({ name: 'S', currency: 'USD', color: '#0' })
    await categoryRepo.create({ name: 'C', color: '#0' })
    await transactionRepo.create({ type: 'expense', amount: 1, currency: 'USD', date: new Date() })
    await loanRepo.create({
      type: 'given',
      personName: 'P',
      amount: 1,
      currency: 'USD',
      paidAmount: 0,
      status: 'active',
    })
    await customCurrencyRepo.create({ code: 'X', name: 'X', symbol: 'X' })

    const store = useAppStore.getState()
    await Promise.all([
      store.refreshAccounts(),
      store.refreshIncomeSources(),
      store.refreshCategories(),
      store.refreshTransactions(),
      store.refreshLoans(),
      store.refreshCustomCurrencies(),
    ])

    const state = useAppStore.getState()
    for (const key of [
      'accounts',
      'incomeSources',
      'categories',
      'transactions',
      'loans',
      'customCurrencies',
    ] as const) {
      expect(state[key], key).toHaveLength(1)
    }
  })
})
