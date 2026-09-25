import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { LoanFormData } from './LoanForm'
import { LoansPage } from './LoansPage'
import { PaymentDialog } from './PaymentDialog'

import type { Account, Loan } from '@/database/types'

const trackEventMock = vi.fn()
vi.mock('@/utils/analytics', () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}))

const loanGetByIdMock = vi.fn()
vi.mock('@/database/repositories', () => ({
  loanRepo: {
    create: vi.fn().mockResolvedValue(7),
    update: vi.fn(),
    getById: (...args: unknown[]) => loanGetByIdMock(...args),
  },
  transactionRepo: {
    create: vi.fn().mockResolvedValue(9),
    update: vi.fn(),
    getById: vi.fn(() => Promise.resolve()),
  },
}))

vi.mock('@/utils/transactionBalance', () => ({
  applyTransactionBalance: vi.fn(() => Promise.resolve()),
  reverseTransactionBalance: vi.fn(() => Promise.resolve()),
  deleteLoanWithTransactions: vi.fn(() => Promise.resolve()),
}))

let capturedOnSave:
  ((data: LoanFormData, isEdit: boolean, loanId?: number) => Promise<void>) | undefined
vi.mock('./LoanForm', () => ({
  LoanForm: (props: { onSave: typeof capturedOnSave }) => {
    capturedOnSave = props.onSave
    return <></>
  },
}))

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: vi.fn(), t: (key: string) => key }),
}))

const now = new Date()
const account: Account = {
  id: 1,
  name: 'Wallet',
  type: 'cash',
  currency: 'USD',
  balance: 500,
  color: '#000',
  createdAt: now,
  updatedAt: now,
}

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      loans: [],
      accounts: [account],
      mainCurrency: 'USD',
      blurFinancialFigures: false,
      refreshLoans: vi.fn(),
      refreshAccounts: vi.fn(),
      refreshTransactions: vi.fn(),
    }),
}))

const loan: Loan = {
  id: 3,
  type: 'given',
  personName: 'Alex',
  amount: 100,
  currency: 'USD',
  paidAmount: 0,
  status: 'active',
  accountId: 1,
  createdAt: now,
  updatedAt: now,
}

beforeEach(() => {
  trackEventMock.mockReset()
  loanGetByIdMock.mockReset()
})

describe('LoansPage analytics', () => {
  it('tracks loan_created with the loan type for new loans only', async () => {
    render(<LoansPage />)
    const data: LoanFormData = {
      type: 'received',
      personName: 'Alex',
      amount: 50,
      currency: 'USD',
      accountId: 1,
    }

    await capturedOnSave!(data, false)
    expect(trackEventMock).toHaveBeenCalledWith('loan_created', { type: 'received' })

    trackEventMock.mockReset()
    await capturedOnSave!(data, true, 3)
    expect(trackEventMock).not.toHaveBeenCalled()
  })
})

describe('PaymentDialog analytics', () => {
  async function pay(value: string) {
    render(<PaymentDialog loan={loan} open onClose={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value } })
    await act(async () => {
      fireEvent.submit(screen.getByPlaceholderText('0.00').closest('form')!)
    })
    await vi.waitFor(() =>
      expect(trackEventMock).toHaveBeenCalledWith('loan_payment_recorded', { type: 'given' })
    )
  }

  it('tracks a partial payment without marking the loan fully paid', async () => {
    loanGetByIdMock.mockResolvedValue({ ...loan, paidAmount: 40, status: 'partially_paid' })
    await pay('40')
    expect(trackEventMock).not.toHaveBeenCalledWith('loan_fully_paid', expect.anything())
  })

  it('tracks loan_fully_paid when the payment closes the loan', async () => {
    loanGetByIdMock.mockResolvedValue({ ...loan, paidAmount: 100, status: 'fully_paid' })
    await pay('100')
    expect(trackEventMock).toHaveBeenCalledWith('loan_fully_paid', { type: 'given' })
  })
})
