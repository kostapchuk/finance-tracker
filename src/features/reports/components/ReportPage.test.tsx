import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ReportPage } from './ReportPage'

import type { Account, Loan, Transaction } from '@/database/types'

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: vi.fn(), t: (key: string) => key }),
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
    name: 'Euro Savings',
    type: 'bank',
    currency: 'EUR',
    balance: 50,
    color: '#222',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const loans: Loan[] = [
  {
    id: 1,
    type: 'given',
    personName: 'Alice',
    amount: 200,
    currency: 'USD',
    paidAmount: 0,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    type: 'given',
    personName: 'Bob',
    amount: 300,
    currency: 'EUR',
    paidAmount: 0,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

let mockState: Record<string, unknown>

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (selector: (state: Record<string, unknown>) => unknown) => selector(mockState),
}))

describe('ReportPage currency handling', () => {
  it('shows account balances in each currency separately instead of dropping non-main-currency accounts', () => {
    mockState = {
      accounts,
      transactions: [] as Transaction[],
      categories: [],
      loans: [],
      selectedMonth: new Date('2026-01-15'),
      setSelectedMonth: vi.fn(),
      mainCurrency: 'USD',
      blurFinancialFigures: false,
    }

    render(<ReportPage />)

    // The USD account balance must still be shown...
    expect(screen.getByText(/100[,.]00/)).toBeInTheDocument()
    // ...and the EUR account's balance must NOT be silently dropped from the total.
    expect(screen.getByText(/50[,.]00/)).toBeInTheDocument()
  })

  it('shows loan totals grouped by currency instead of summing different currencies together', () => {
    mockState = {
      accounts: [],
      transactions: [] as Transaction[],
      categories: [],
      loans,
      selectedMonth: new Date('2026-01-15'),
      setSelectedMonth: vi.fn(),
      mainCurrency: 'USD',
      blurFinancialFigures: false,
    }

    render(<ReportPage />)

    // Each loan's currency total must appear on its own — never 500 (200 USD + 300 EUR summed).
    expect(screen.getByText(/200[,.]00/)).toBeInTheDocument()
    expect(screen.getByText(/300[,.]00/)).toBeInTheDocument()
    expect(screen.queryByText(/500[,.]00/)).not.toBeInTheDocument()
  })
})
