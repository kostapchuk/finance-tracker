import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { LoanForm } from './LoanForm'

import * as dataHooks from '@/hooks/useDataHooks'

// Mock the data hooks
vi.mock('@/hooks/useDataHooks', () => ({
  useAccounts: vi.fn(),
  useSettings: vi.fn(),
}))

// Mock the repositories
vi.mock('@/database/repositories', () => ({
  loanRepo: {
    create: vi.fn().mockResolvedValue('test-loan-id'),
    update: vi.fn().mockResolvedValue(undefined),
  },
}))

// Mock useLanguage hook
vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}))

// Mock getAllCurrencies
vi.mock('@/utils/currency', () => ({
  getAllCurrencies: () => [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
  ],
}))

// Mock formatDateForInput
vi.mock('@/utils/date', () => ({
  formatDateForInput: (date: Date) => date.toISOString().split('T')[0],
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('LoanForm', () => {
  const mockAccounts = [
    { id: 'account-1', name: 'Cash', currency: 'USD', balance: 1000 },
    { id: 'account-2', name: 'Bank', currency: 'EUR', balance: 2000 },
  ]

  const mockSettings = {
    id: 'settings-1',
    defaultCurrency: 'USD',
  }

  beforeEach(() => {
    vi.mocked(dataHooks.useAccounts).mockReturnValue({
      data: mockAccounts,
    } as unknown as ReturnType<typeof dataHooks.useAccounts>)
    vi.mocked(dataHooks.useSettings).mockReturnValue({
      data: mockSettings,
    } as unknown as ReturnType<typeof dataHooks.useSettings>)
  })

  it('renders the form with accounts loaded', () => {
    const onClose = vi.fn()
    const onSave = vi.fn()

    render(<LoanForm loan={null} open={true} onClose={onClose} onSave={onSave} />, {
      wrapper: createWrapper(),
    })

    // Check that the form is rendered
    expect(screen.getByText('addLoan')).toBeInTheDocument()
  })

  it('submit button is enabled when accounts are available', () => {
    const onClose = vi.fn()
    const onSave = vi.fn()

    render(<LoanForm loan={null} open={true} onClose={onClose} onSave={onSave} />, {
      wrapper: createWrapper(),
    })

    // The create button should be enabled when accounts are available
    const submitButton = screen.getByRole('button', { name: 'create' })
    expect(submitButton).not.toBeDisabled()
  })

  it('handles accounts loading after mount - button becomes enabled', async () => {
    const onClose = vi.fn()
    const onSave = vi.fn()

    // Start with no accounts (simulates data loading after mount)
    vi.mocked(dataHooks.useAccounts).mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof dataHooks.useAccounts>)

    const { rerender } = render(
      <LoanForm loan={null} open={true} onClose={onClose} onSave={onSave} />,
      {
        wrapper: createWrapper(),
      }
    )

    // Submit button should be disabled when no accounts
    const submitButton = screen.getByRole('button', { name: 'create' })
    expect(submitButton).toBeDisabled()

    // Now accounts load (simulates React Query completing the fetch)
    vi.mocked(dataHooks.useAccounts).mockReturnValue({
      data: mockAccounts,
    } as unknown as ReturnType<typeof dataHooks.useAccounts>)

    rerender(<LoanForm loan={null} open={true} onClose={onClose} onSave={onSave} />)

    // Submit button should now be enabled
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'create' })).not.toBeDisabled()
    })
  })

  it('uses effective account ID when accounts load after mount', async () => {
    const onClose = vi.fn()
    const onSave = vi.fn().mockResolvedValue(undefined)

    // Start with no accounts
    vi.mocked(dataHooks.useAccounts).mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof dataHooks.useAccounts>)

    render(<LoanForm loan={null} open={true} onClose={onClose} onSave={onSave} />, {
      wrapper: createWrapper(),
    })

    // Submit button should be disabled when no accounts
    expect(screen.getByRole('button', { name: 'create' })).toBeDisabled()
  })

  it('uses effective account ID when accounts load after mount', async () => {
    const onClose = vi.fn()
    const onSave = vi.fn().mockResolvedValue(undefined)

    // Start with no accounts
    vi.mocked(dataHooks.useAccounts).mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof dataHooks.useAccounts>)

    const { rerender } = render(
      <LoanForm loan={null} open={true} onClose={onClose} onSave={onSave} />,
      {
        wrapper: createWrapper(),
      }
    )

    // Now accounts load
    vi.mocked(dataHooks.useAccounts).mockReturnValue({
      data: mockAccounts,
    } as unknown as ReturnType<typeof dataHooks.useAccounts>)

    rerender(<LoanForm loan={null} open={true} onClose={onClose} onSave={onSave} />)

    // Fill in the required fields
    fireEvent.change(screen.getByLabelText(/whoDidYouLendTo|whoDidYouBorrowFrom/i), {
      target: { value: 'John Doe' },
    })
    fireEvent.change(screen.getByLabelText('amount'), { target: { value: '100' } })

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: 'create' }))

    // Verify onSave was called with the first account's ID (effectiveAccountId)
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'account-1',
        }),
        false,
        undefined
      )
    })
  })
})
