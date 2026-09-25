import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ReportPage } from './ReportPage'

import type { Account, Loan, Transaction } from '@/database/types'
import { formatCurrency } from '@/utils/currency'

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: vi.fn(), t: (key: string) => key }),
}))

let storeState: Record<string, unknown> = {}

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (selector: (state: Record<string, unknown>) => unknown) => selector(storeState),
}))

const accounts: Account[] = [
  {
    id: 1,
    name: 'Wallet',
    type: 'cash',
    currency: 'USD',
    balance: 500,
    color: '#111',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const loans: Loan[] = [
  {
    id: 1,
    type: 'given',
    personName: 'Alex',
    amount: 100,
    currency: 'USD',
    paidAmount: 40,
    status: 'partially_paid',
    accountId: 1,
    createdAt: new Date('2026-01-05'),
    updatedAt: new Date('2026-01-10'),
  },
]

const transactions: Transaction[] = [
  {
    id: 1,
    type: 'loan_given',
    amount: 100,
    currency: 'USD',
    date: new Date('2026-01-05'),
    accountId: 1,
    loanId: 1,
    createdAt: new Date('2026-01-05'),
    updatedAt: new Date('2026-01-05'),
  },
  {
    id: 2,
    type: 'loan_payment',
    amount: 40,
    currency: 'USD',
    date: new Date('2026-01-10'),
    accountId: 1,
    loanId: 1,
    createdAt: new Date('2026-01-10'),
    updatedAt: new Date('2026-01-10'),
  },
]

function setStore(overrides: Record<string, unknown> = {}) {
  storeState = {
    accounts,
    transactions,
    categories: [],
    loans,
    selectedMonth: new Date('2026-01-15'),
    mainCurrency: 'USD',
    ...overrides,
  }
}

describe('ReportPage loan activity section', () => {
  it('shows given, returned and remaining amounts for the selected month', () => {
    setStore()
    render(<ReportPage />)

    const heading = screen.getByText('loanActivity')
    const section = within(heading.parentElement as HTMLElement)

    expect(section.getByText('given')).toBeInTheDocument()
    expect(section.getByText(formatCurrency(100, 'USD'))).toBeInTheDocument()
    expect(section.getByText('returned')).toBeInTheDocument()
    expect(section.getByText(formatCurrency(40, 'USD'))).toBeInTheDocument()
    expect(section.getByText('remaining')).toBeInTheDocument()
    expect(section.getByText(formatCurrency(60, 'USD'))).toBeInTheDocument()
  })

  it('does not show the loan activity section when there is no loan activity this month', () => {
    setStore({ selectedMonth: new Date('2026-03-01'), loans: [], transactions: [] })
    render(<ReportPage />)

    expect(screen.queryByText('loanActivity')).not.toBeInTheDocument()
  })
})
