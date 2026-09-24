import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { QuickTransactionModal, type TransactionMode } from './QuickTransactionModal'

import type { Account } from '@/database/types'

const createMock = vi.fn()
const getByIdMock = vi.fn()

vi.mock('@/database/repositories', () => ({
  transactionRepo: {
    create: (...args: unknown[]) => createMock(...args),
    update: vi.fn(),
    getById: (...args: unknown[]) => getByIdMock(...args),
  },
}))

vi.mock('@/utils/transactionBalance', () => ({
  applyTransactionBalance: vi.fn().mockResolvedValue(undefined),
  reverseTransactionBalance: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ language: 'ru', setLanguage: vi.fn(), t: (key: string) => key }),
}))

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      refreshTransactions: vi.fn(),
      refreshAccounts: vi.fn(),
      loans: [],
      incomeSources: [],
      categories: [],
      transactions: [],
      selectedMonth: new Date('2026-01-01'),
      mainCurrency: 'USD',
      blurFinancialFigures: false,
    }),
}))

const accounts: Account[] = [
  {
    id: 1,
    name: 'Wallet',
    type: 'cash',
    currency: 'USD',
    balance: 100,
    color: '#111',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    name: 'Bank',
    type: 'bank',
    currency: 'USD',
    balance: 200,
    color: '#222',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 3,
    name: 'Savings',
    type: 'bank',
    currency: 'USD',
    balance: 300,
    color: '#333',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

// Only one picker overlay is ever open at a time; it's the sole ".z-10" node.
function openOverlay(container: HTMLElement) {
  return within(container.querySelector('.z-10')!)
}

describe('QuickTransactionModal transfer account pickers', () => {
  beforeEach(() => {
    createMock.mockReset().mockResolvedValue(99)
    getByIdMock.mockReset().mockResolvedValue(undefined)
  })

  it('lets the user pick a different "from" account from the header', () => {
    const mode: TransactionMode = {
      type: 'transfer',
      fromAccount: accounts[0],
      toAccount: accounts[1],
    }
    const { container } = render(
      <QuickTransactionModal mode={mode} accounts={accounts} onClose={vi.fn()} />
    )

    expect(screen.getByText('Wallet')).toBeInTheDocument()
    expect(screen.getByText('Bank')).toBeInTheDocument()

    // Open the "from" account picker via the header button.
    fireEvent.click(screen.getByText('Wallet'))
    const panel = openOverlay(container)

    // The current "to" account must not be selectable as the "from" account.
    expect(panel.queryByText('Bank')).not.toBeInTheDocument()
    expect(panel.getByText('Savings')).toBeInTheDocument()

    fireEvent.click(panel.getByText('Savings'))

    // Header now reflects the newly selected "from" account.
    expect(screen.getByText('Savings')).toBeInTheDocument()
    expect(screen.queryByText('Wallet')).not.toBeInTheDocument()
  })

  it('lets the user pick a different "to" account from the header', () => {
    const mode: TransactionMode = {
      type: 'transfer',
      fromAccount: accounts[0],
      toAccount: accounts[1],
    }
    const { container } = render(
      <QuickTransactionModal mode={mode} accounts={accounts} onClose={vi.fn()} />
    )

    fireEvent.click(screen.getByText('Bank'))
    const panel = openOverlay(container)

    // The current "from" account must not be selectable as the "to" account.
    expect(panel.queryByText('Wallet')).not.toBeInTheDocument()
    expect(panel.getByText('Savings')).toBeInTheDocument()

    fireEvent.click(panel.getByText('Savings'))

    expect(screen.getByText('Savings')).toBeInTheDocument()
    expect(screen.queryByText('Bank')).not.toBeInTheDocument()
  })

  it('submits the transfer using the accounts picked from the header, not the original ones', async () => {
    const mode: TransactionMode = {
      type: 'transfer',
      fromAccount: accounts[0],
      toAccount: accounts[1],
    }
    const { container } = render(
      <QuickTransactionModal mode={mode} accounts={accounts} onClose={vi.fn()} />
    )

    // Change "from" Wallet -> Savings.
    fireEvent.click(screen.getByText('Wallet'))
    fireEvent.click(openOverlay(container).getByText('Savings'))

    // Change "to" Bank -> Wallet (now free again).
    fireEvent.click(screen.getByText('Bank'))
    fireEvent.click(openOverlay(container).getByText('Wallet'))

    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '50' } })
    fireEvent.click(screen.getByRole('button', { name: 'save' }))

    await vi.waitFor(() => expect(createMock).toHaveBeenCalled())

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'transfer', accountId: 3, toAccountId: 1 })
    )
  })
})
