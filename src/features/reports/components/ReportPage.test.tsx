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
  {
    id: 3,
    type: 'received',
    personName: 'Carol',
    amount: 150,
    currency: 'GBP',
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
      appVisits: [],
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
      appVisits: [],
      categories: [],
      loans: [loans[0], loans[1]], // both "given" loans, no "received" loan
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
    // No received loans, so that side falls back to a zero placeholder.
    const youOweCard = screen.getByText('youOwe').closest('.p-4')
    expect(youOweCard).toHaveTextContent(/0[,.]00/)
  })

  it('shows a zero placeholder for the given side when only a received loan exists', () => {
    mockState = {
      accounts: [],
      transactions: [] as Transaction[],
      appVisits: [],
      categories: [],
      loans: [loans[2]], // only the received GBP loan
      selectedMonth: new Date('2026-01-15'),
      setSelectedMonth: vi.fn(),
      mainCurrency: 'USD',
      blurFinancialFigures: false,
    }

    render(<ReportPage />)

    // "owed to you" has no given loans, so it falls back to a zero placeholder
    // in the main currency, while "you owe" still shows the GBP total.
    const owedToYouCard = screen.getByText('owedToYou').closest('.p-4')
    expect(owedToYouCard).toHaveTextContent(/0[,.]00/)
    expect(screen.getByText(/150[,.]00/)).toBeInTheDocument()
  })
})

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    type: 'expense',
    amount: 10,
    currency: 'USD',
    date: new Date('2026-01-10'),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function renderWith(state: Record<string, unknown>) {
  mockState = {
    accounts: [],
    transactions: [] as Transaction[],
    appVisits: [],
    categories: [],
    loans: [],
    selectedMonth: new Date('2026-01-15'),
    setSelectedMonth: vi.fn(),
    mainCurrency: 'USD',
    blurFinancialFigures: false,
    ...state,
  }
  return render(<ReportPage />)
}

describe('ReportPage monthly stats', () => {
  it('shows empty states when there is no data', () => {
    renderWith({})

    expect(screen.getByText('noExpenseDataThisMonth')).toBeInTheDocument()
    expect(screen.getByText('noTransactionDataYet')).toBeInTheDocument()
    expect(screen.queryByText('currentLoansStatus')).not.toBeInTheDocument()
    const balanceCard = screen.getByText('totalBalance').closest('div') as HTMLElement
    expect(balanceCard).toHaveTextContent('0.00 $')
  })

  it('sums income and expenses in the main currency and ranks spending by category', () => {
    const categories = [
      { id: 1, name: 'Food', color: '#f00', createdAt: new Date(), updatedAt: new Date() },
      { id: 2, name: 'Rent', color: '#0f0', createdAt: new Date(), updatedAt: new Date() },
    ]
    renderWith({
      accounts: [{ ...accounts[0], balance: -20 }],
      categories,
      loans: [{ ...loans[0], status: 'fully_paid' }],
      transactions: [
        tx({ type: 'income', amount: 500, incomeSourceId: 1 }),
        tx({
          type: 'income',
          amount: 90,
          currency: 'EUR',
          mainCurrencyAmount: 100,
          incomeSourceId: 1,
        }),
        tx({ type: 'income', amount: 1000 }), // no source: not counted
        tx({ amount: 40, categoryId: 1 }),
        tx({ amount: 200, categoryId: 2 }),
        tx({ amount: 5 }), // uncategorised: shown as Unknown, not in totals
        tx({ type: 'transfer', amount: 999, toAccountId: 2 }),
        tx({ amount: 70, categoryId: 1, date: new Date('2025-12-10') }), // previous month
        tx({ amount: 1, categoryId: 1, date: new Date('2024-01-01') }), // outside the trend window
      ],
    })

    expect(screen.getByText('+ 600.00 $')).toBeInTheDocument()
    expect(screen.getByText('- 240.00 $')).toBeInTheDocument()
    expect(screen.getByText('+ 360.00 $')).toBeInTheDocument()
    expect(screen.getByText('-20.00 $')).toBeInTheDocument()
    expect(screen.queryByText('currentLoansStatus')).not.toBeInTheDocument()

    const names = screen.getAllByText(/^(Food|Rent|Unknown)$/).map((el) => el.textContent)
    expect(names).toEqual(['Rent', 'Food', 'Unknown'])
    expect(screen.queryByText('noTransactionDataYet')).not.toBeInTheDocument()
  })

  it('lists at most five categories', () => {
    const categories = Array.from({ length: 7 }, (_, i) => ({
      id: i + 1,
      name: `Cat${i + 1}`,
      color: '#000',
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
    renderWith({
      categories,
      transactions: categories.map((c) => tx({ amount: c.id!, categoryId: c.id })),
    })

    expect(screen.getAllByText(/^Cat\d$/)).toHaveLength(5)
    expect(screen.queryByText('Cat1')).not.toBeInTheDocument()
  })

  it('shows a negative net flow when spending exceeds income', () => {
    renderWith({
      transactions: [
        tx({ type: 'income', amount: 10, incomeSourceId: 1 }),
        tx({ amount: 30, categoryId: 1 }),
      ],
    })

    expect(screen.getByText('- 20.00 $')).toBeInTheDocument()
  })
})
