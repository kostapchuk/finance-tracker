import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from './App'

import { useAppStore } from '@/store/useAppStore'
import { resetDbAndStore } from '@/test/db'

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: vi.fn(), t: (key: string) => key }),
}))

vi.mock('@/contexts/ServiceWorkerContext', () => ({
  ServiceWorkerProvider: ({ children }: { children: ReactNode }) => children,
  useServiceWorker: () => ({ needRefresh: false, updateServiceWorker: vi.fn() }),
}))

vi.mock('@vercel/analytics/react', () => ({ Analytics: () => <span data-testid="analytics" /> }))

beforeEach(async () => {
  await resetDbAndStore()
  localStorage.setItem('finance-tracker-onboarding-completed', 'true')
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
    }
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('App', () => {
  it('starts on the dashboard and switches views from the bottom nav', async () => {
    render(<App />)

    expect(await screen.findByRole('button', { name: 'Previous month' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'history' }))
    expect(await screen.findByText('noTransactionsFound')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'loans' }))
    expect(await screen.findByText('loansAndDebts')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'settings' }))
    expect(await screen.findByText('dangerZone')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'report' }))
    expect(await screen.findByText('totalBalance')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'dashboard' }))
    expect(await screen.findByRole('button', { name: 'Previous month' })).toBeInTheDocument()
    // Each view is a lazy chunk transformed on first import, which is slow under coverage.
  }, 20_000)

  it('falls back to the dashboard for an unknown view', async () => {
    useAppStore.setState({ activeView: 'unknown' as 'dashboard' })
    render(<App />)

    expect(await screen.findByRole('button', { name: 'Previous month' })).toBeInTheDocument()
  })

  it('prefetches the other pages when the browser is idle', async () => {
    vi.useFakeTimers()
    const cancel = vi.fn()
    let idle: (() => void) | undefined
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
      idle = cb
      return 7
    })
    vi.stubGlobal('cancelIdleCallback', cancel)

    const { unmount } = render(<App />)
    idle?.()
    vi.runAllTimers()
    unmount()

    expect(cancel).toHaveBeenCalledWith(7)
  })
})
