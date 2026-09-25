import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AccountForm } from '@/features/accounts/components/AccountForm'
import { CategoryForm } from '@/features/categories/components/CategoryForm'
import { IncomeSourceForm } from '@/features/income/components/IncomeSourceForm'

const trackEventMock = vi.fn()
vi.mock('@/utils/analytics', () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}))

const repo = () => ({ create: vi.fn().mockResolvedValue(1), update: vi.fn().mockResolvedValue(1) })
const repos = vi.hoisted(() => ({}) as Record<string, ReturnType<typeof repo>>)
vi.mock('@/database/repositories', () => ({
  get accountRepo() {
    return repos.accountRepo
  },
  get categoryRepo() {
    return repos.categoryRepo
  },
  get incomeSourceRepo() {
    return repos.incomeSourceRepo
  },
}))

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: vi.fn(), t: (key: string) => key }),
}))

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      refreshAccounts: vi.fn(),
      refreshCategories: vi.fn(),
      refreshIncomeSources: vi.fn(),
      mainCurrency: 'USD',
      customCurrencies: [],
    }),
}))

const now = new Date()

async function submitWithName(placeholder: string) {
  fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value: 'Name' } })
  await act(async () => {
    fireEvent.submit(screen.getByPlaceholderText(placeholder).closest('form')!)
  })
}

describe('entity form analytics', () => {
  beforeEach(() => {
    trackEventMock.mockReset()
    repos.accountRepo = repo()
    repos.categoryRepo = repo()
    repos.incomeSourceRepo = repo()
  })

  it('tracks account_created only for new accounts', async () => {
    const { unmount } = render(<AccountForm open onClose={vi.fn()} />)
    await submitWithName('egMainChecking')
    await vi.waitFor(() => expect(trackEventMock).toHaveBeenCalledWith('account_created'))
    unmount()

    trackEventMock.mockReset()
    render(
      <AccountForm
        open
        onClose={vi.fn()}
        account={{
          id: 5,
          name: 'Old',
          type: 'cash',
          currency: 'USD',
          balance: 0,
          color: '#000',
          createdAt: now,
          updatedAt: now,
        }}
      />
    )
    await submitWithName('egMainChecking')
    await vi.waitFor(() => expect(repos.accountRepo.update).toHaveBeenCalled())
    expect(trackEventMock).not.toHaveBeenCalled()
  })

  it('tracks category_created for new categories', async () => {
    render(<CategoryForm open onClose={vi.fn()} />)
    await submitWithName('egGroceries')
    await vi.waitFor(() => expect(trackEventMock).toHaveBeenCalledWith('category_created'))
  })

  it('tracks income_source_created for new income sources', async () => {
    render(<IncomeSourceForm open onClose={vi.fn()} />)
    await submitWithName('egSalaryFreelance')
    await vi.waitFor(() => expect(trackEventMock).toHaveBeenCalledWith('income_source_created'))
  })
})
