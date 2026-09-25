import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppShell } from './AppShell'
import { BottomNav } from './BottomNav'

import { OnboardingOverlay } from '@/components/onboarding/OnboardingOverlay'
import { MonthSelector } from '@/components/ui/MonthSelector'
import { customCurrencyRepo } from '@/database/repositories'
import { useAppStore } from '@/store/useAppStore'
import { resetDbAndStore } from '@/test/db'
import { getAllCurrencies } from '@/utils/currency'

const serviceWorker = vi.hoisted(() => ({ needRefresh: false }))

vi.mock('@/contexts/ServiceWorkerContext', () => ({
  useServiceWorker: () => ({
    needRefresh: serviceWorker.needRefresh,
    updateServiceWorker: vi.fn(),
  }),
}))

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: vi.fn(), t: (key: string) => key }),
}))

beforeEach(async () => {
  await resetDbAndStore()
  serviceWorker.needRefresh = false
  localStorage.clear()
})

describe('BottomNav', () => {
  it('navigates between views and highlights the active one', () => {
    render(<BottomNav />)

    fireEvent.click(screen.getByRole('button', { name: 'loans' }))

    expect(useAppStore.getState().activeView).toBe('loans')
    expect(screen.getByRole('button', { name: 'loans' })).toHaveClass('text-primary-accent')
    expect(screen.getByRole('button', { name: 'dashboard' })).not.toHaveClass('text-primary-accent')
  })

  it('shows an update badge on settings when a new version is waiting', () => {
    serviceWorker.needRefresh = true
    render(<BottomNav />)

    const settings = screen.getByRole('button', { name: 'settings' })
    expect(settings.querySelector('.rounded-full')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'loans' }).querySelector('.rounded-full')).toBeNull()
  })
})

describe('AppShell', () => {
  it('loads data, registers custom currencies and shows onboarding for new users', async () => {
    await customCurrencyRepo.create({ code: 'ZZZ', name: 'Zed', symbol: 'Z' })

    render(
      <AppShell>
        <p>page</p>
      </AppShell>
    )

    expect(screen.getByText('page')).toBeInTheDocument()
    expect(await screen.findByText('onboardingWelcomeTitle')).toBeInTheDocument()
    expect(getAllCurrencies().some((c) => c.code === 'ZZZ')).toBe(true)
  })
})

describe('MonthSelector', () => {
  it('steps back and forward, but not past the current month', () => {
    useAppStore.setState({ selectedMonth: new Date() })
    render(<MonthSelector />)

    const next = screen.getByRole('button', { name: 'Next month' })
    expect(next).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    const previous = useAppStore.getState().selectedMonth
    expect(previous.getDate()).toBe(1)
    expect(next).toBeEnabled()

    fireEvent.click(next)
    expect(useAppStore.getState().selectedMonth.getMonth()).toBe(new Date().getMonth())
  })

  it('shows the month name and year', () => {
    useAppStore.setState({ selectedMonth: new Date(2025, 2, 10) })
    render(<MonthSelector />)

    expect(screen.getByRole('heading')).toHaveTextContent('March 2025')
  })
})

describe('OnboardingOverlay', () => {
  it('walks through every step to completion', () => {
    useAppStore.setState({ onboardingStep: 1 })
    render(<OnboardingOverlay />)

    fireEvent.click(screen.getByText('onboardingGetStarted'))
    expect(screen.getByText('onboardingIncomeTitle')).toBeInTheDocument()

    fireEvent.click(screen.getByText('onboardingNext'))
    expect(screen.getByText('onboardingExpenseTitle')).toBeInTheDocument()

    fireEvent.click(screen.getByText('onboardingNext'))
    expect(useAppStore.getState().activeView).toBe('settings')
    expect(screen.getByText('onboardingCurrencyTitle')).toBeInTheDocument()

    fireEvent.click(screen.getByText('onboardingNext'))
    fireEvent.click(screen.getByText('onboardingStartApp'))

    expect(useAppStore.getState()).toMatchObject({ onboardingStep: 0, activeView: 'dashboard' })
    expect(localStorage.getItem('finance-tracker-onboarding-completed')).toBe('true')
  })

  it.each([1, 2, 3, 4])('can be skipped from step %i', (step) => {
    useAppStore.setState({ onboardingStep: step })
    render(<OnboardingOverlay />)

    fireEvent.click(screen.getAllByRole('button', { name: 'onboardingSkip' })[0])

    expect(useAppStore.getState().onboardingStep).toBe(0)
  })

  it.each([2, 3, 4])('closes from the tooltip on step %i', (step) => {
    useAppStore.setState({ onboardingStep: step })
    render(<OnboardingOverlay />)

    fireEvent.click(screen.getByRole('button', { name: 'close' }))

    expect(useAppStore.getState().onboardingStep).toBe(0)
  })

  it('renders nothing when inactive', () => {
    const { container } = render(<OnboardingOverlay />)

    expect(container).toBeEmptyDOMElement()
  })

  it('re-renders when the step changes', async () => {
    useAppStore.setState({ onboardingStep: 1 })
    render(<OnboardingOverlay />)

    act(() => useAppStore.getState().setOnboardingStep(5))

    await waitFor(() => expect(screen.getByText('onboardingCompletionTitle')).toBeInTheDocument())
  })
})
