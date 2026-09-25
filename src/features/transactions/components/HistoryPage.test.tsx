import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HistoryPage } from './HistoryPage'

import {
  accountRepo,
  categoryRepo,
  incomeSourceRepo,
  loanRepo,
  transactionRepo,
} from '@/database/repositories'
import type { Transaction } from '@/database/types'
import { useAppStore } from '@/store/useAppStore'
import { created, resetDbAndStore } from '@/test/db'

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: vi.fn(), t: (key: string) => key }),
}))

let intersect: (entries: { isIntersecting: boolean }[]) => void = () => {}

let usdId: number
let eurId: number
let foodId: number
let salaryId: number
let loanId: number

const today = new Date()
today.setHours(12, 0, 0, 0)

async function addTx(tx: Partial<Transaction> & Pick<Transaction, 'type' | 'amount'>) {
  return created(transactionRepo.create({ currency: 'USD', date: today, accountId: usdId, ...tx }))
}

async function balanceOf(id: number) {
  const account = await accountRepo.getById(id)
  return account?.balance
}

beforeEach(async () => {
  await resetDbAndStore()
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: typeof intersect) {
        intersect = cb
      }
      observe() {}
      disconnect() {}
    }
  )
  useAppStore.setState({ mainCurrency: 'USD', selectedMonth: new Date() })
  usdId = await created(
    accountRepo.create({ name: 'Wallet', type: 'cash', currency: 'USD', balance: 500, color: '#0' })
  )
  eurId = await created(
    accountRepo.create({ name: 'Euro', type: 'bank', currency: 'EUR', balance: 500, color: '#0' })
  )
  foodId = await created(categoryRepo.create({ name: 'Food', color: '#0' }))
  salaryId = await created(
    incomeSourceRepo.create({ name: 'Salary', currency: 'USD', color: '#0' })
  )
  loanId = await created(
    loanRepo.create({
      type: 'given',
      personName: 'Alice',
      amount: 100,
      currency: 'USD',
      paidAmount: 20,
      status: 'partially_paid',
      accountId: usdId,
    })
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function loadStore() {
  const store = useAppStore.getState()
  await Promise.all([
    store.refreshAccounts(),
    store.refreshCategories(),
    store.refreshIncomeSources(),
    store.refreshTransactions(),
    store.refreshLoans(),
  ])
}

async function seedMixed() {
  await addTx({ type: 'income', amount: 1000, incomeSourceId: salaryId, comment: 'bonus' })
  await addTx({ type: 'expense', amount: 30, categoryId: foodId, comment: 'pizza' })
  await addTx({ type: 'transfer', amount: 50, toAccountId: eurId, toAmount: 45 })
  await addTx({ type: 'loan_given', amount: 100, loanId })
  await addTx({ type: 'loan_payment', amount: 20, loanId, loanCurrencyAmount: 20 })
  await loadStore()
}

function row(title: string) {
  return screen.getByText(title).closest('button') as HTMLElement
}

function pickDate(from: string, to: string) {
  fireEvent.click(screen.getByRole('button', { name: from }))
  fireEvent.click(screen.getByRole('option', { name: to }))
}

function pill(name: string) {
  fireEvent.click(screen.getByRole('button', { name }))
}

function openFilters() {
  fireEvent.click(document.querySelector('.lucide-funnel')?.closest('button') as HTMLElement)
}

describe('HistoryPage list', () => {
  it('shows an empty state', async () => {
    await loadStore()
    render(<HistoryPage />)

    expect(screen.getByText('noTransactionsFound')).toBeInTheDocument()
  })

  it('groups today’s transactions and sums the period', async () => {
    await seedMixed()
    render(<HistoryPage />)

    expect(screen.getByText(/^today, /)).toBeInTheDocument()
    expect(screen.getByText('Salary')).toBeInTheDocument()
    expect(screen.getByText('Food')).toBeInTheDocument()
    expect(screen.getByText('Wallet (USD) → Euro (EUR)')).toBeInTheDocument()
    expect(screen.getByText('moneyGiven')).toBeInTheDocument()
    expect(screen.getByText('paid')).toBeInTheDocument()
    // inflows: 1000 income + 20 repayment; outflows: 30 expense + 100 loan
    expect(screen.getAllByText('+1,020.00 $')).toHaveLength(2)
    expect(screen.getAllByText('-130.00 $')).toHaveLength(2)
    expect(screen.getByText('+890.00 $')).toBeInTheDocument()
  })

  it('filters by type pills', async () => {
    await seedMixed()
    render(<HistoryPage />)

    pill('income')
    expect(screen.getByText('Salary')).toBeInTheDocument()
    expect(screen.queryByText('Food')).not.toBeInTheDocument()

    pill('expense')
    expect(screen.getByText('Food')).toBeInTheDocument()
    expect(screen.queryByText('Salary')).not.toBeInTheDocument()

    pill('transfers')
    expect(screen.getByText('Wallet (USD) → Euro (EUR)')).toBeInTheDocument()
    expect(screen.queryByText('Food')).not.toBeInTheDocument()

    pill('loansFilter')
    expect(screen.getByText('moneyGiven')).toBeInTheDocument()
    expect(screen.queryByText('Food')).not.toBeInTheDocument()

    pill('all')
    expect(screen.getByText('Food')).toBeInTheDocument()
  })

  it('searches by comment, account, category and income source', async () => {
    await seedMixed()
    render(<HistoryPage />)

    fireEvent.click(document.querySelector('.lucide-search')?.closest('button') as HTMLElement)
    const search = screen.getByPlaceholderText('searchTransactions')

    fireEvent.change(search, { target: { value: 'PIZZA' } })
    expect(screen.getByText('Food')).toBeInTheDocument()
    expect(screen.queryByText('Salary')).not.toBeInTheDocument()

    fireEvent.change(search, { target: { value: 'salary' } })
    expect(screen.getByText('Salary')).toBeInTheDocument()

    fireEvent.change(search, { target: { value: 'nothing-matches' } })
    expect(screen.getByText('noTransactionsFound')).toBeInTheDocument()

    fireEvent.click(document.querySelector('.lucide-x')?.closest('button') as HTMLElement)
    expect(screen.getByText('Food')).toBeInTheDocument()
  })

  async function seedForFilters() {
    await addTx({
      type: 'expense',
      amount: 1,
      categoryId: foodId,
      date: new Date(2020, 5, 15, 12),
      comment: 'old',
    })
    await addTx({ type: 'expense', amount: 2, categoryId: 999, comment: 'other' })
    await addTx({
      type: 'income',
      amount: 3,
      incomeSourceId: salaryId,
      accountId: eurId,
      currency: 'EUR',
    })
    await loadStore()
    render(<HistoryPage />)
    openFilters()
  }

  it('shows older transactions for all time', async () => {
    await seedForFilters()

    pickDate('thisMonth', 'allTime')

    expect(screen.getByText(/• old/)).toBeInTheDocument()
  })

  it.each(['today', 'thisWeek', 'last3Months', 'last6Months', 'thisYear'])(
    'hides older transactions for %s',
    async (option) => {
      await seedForFilters()

      pickDate('thisMonth', option)

      expect(screen.getByRole('button', { name: option })).toBeInTheDocument()
      expect(screen.queryByText(/• old/)).not.toBeInTheDocument()
      expect(screen.getByText(/• other/)).toBeInTheDocument()
    }
  )

  it('filters by a custom date range', async () => {
    await seedForFilters()

    pickDate('thisMonth', 'customRange')
    fireEvent.change(screen.getByLabelText('from'), { target: { value: '2020-06-01' } })
    fireEvent.change(screen.getByLabelText('to'), { target: { value: '2020-06-30' } })

    expect(screen.getByText(/• old/)).toBeInTheDocument()
    expect(screen.queryByText(/• other/)).not.toBeInTheDocument()
  })

  it('filters by account', async () => {
    await seedForFilters()

    fireEvent.click(screen.getByRole('button', { name: 'allAccounts' }))
    fireEvent.click(screen.getByRole('option', { name: 'Euro (EUR)' }))

    expect(screen.getByText('Salary', { selector: 'p' })).toBeInTheDocument()
    expect(screen.queryByText(/• other/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Euro (EUR)' })).toBeInTheDocument()
  })

  it('filters by expense category and income source', async () => {
    await seedForFilters()
    pickDate('thisMonth', 'allTime')

    pill('expense')
    fireEvent.click(screen.getAllByRole('button', { name: 'all' }).at(-1) as HTMLElement)
    fireEvent.click(screen.getByRole('option', { name: 'Food' }))
    expect(screen.getByText(/• old/)).toBeInTheDocument()
    expect(screen.queryByText(/• other/)).not.toBeInTheDocument()

    pill('income')
    fireEvent.click(screen.getAllByRole('button', { name: 'all' }).at(-1) as HTMLElement)
    fireEvent.click(screen.getByRole('option', { name: 'Salary' }))
    expect(screen.getByText('Salary', { selector: 'p' })).toBeInTheDocument()
  })

  it('applies category and account filters handed over from other pages', async () => {
    await seedMixed()
    useAppStore.setState({ historyCategoryFilter: foodId })
    const { unmount } = render(<HistoryPage />)

    // Titles render as <p>; the category also appears as a hidden filter option.
    expect(screen.getByText('Food', { selector: 'p' })).toBeInTheDocument()
    expect(screen.queryByText('Salary', { selector: 'p' })).not.toBeInTheDocument()
    expect(useAppStore.getState().historyCategoryFilter).toBeUndefined()
    unmount()

    useAppStore.setState({ historyAccountFilter: eurId })
    render(<HistoryPage />)
    expect(screen.getByText('Wallet (USD) → Euro (EUR)')).toBeInTheDocument()
    expect(screen.queryByText('Food', { selector: 'p' })).not.toBeInTheDocument()
  })

  it('shows both sides of multi-currency transfers, main currency first', async () => {
    const plnId = await created(
      accountRepo.create({ name: 'Zloty', type: 'cash', currency: 'PLN', balance: 0, color: '#0' })
    )
    await addTx({
      type: 'transfer',
      amount: 10,
      accountId: eurId,
      currency: 'EUR',
      toAccountId: usdId,
      toAmount: 11,
    })
    await addTx({ type: 'transfer', amount: 12, toAccountId: plnId, toAmount: 48 })
    await addTx({
      type: 'transfer',
      amount: 13,
      accountId: eurId,
      currency: 'EUR',
      toAccountId: plnId,
      toAmount: 55,
    })
    await addTx({
      type: 'expense',
      amount: 40,
      currency: 'PLN',
      accountId: plnId,
      categoryId: foodId,
      mainCurrencyAmount: 10,
    })
    await loadStore()
    render(<HistoryPage />)

    expect(within(row('Euro (EUR) → Wallet (USD)')).getByText('11.00 $')).toHaveClass(
      'font-semibold'
    )
    expect(within(row('Wallet (USD) → Zloty (PLN)')).getByText('12.00 $')).toHaveClass(
      'font-semibold'
    )
    expect(within(row('Euro (EUR) → Zloty (PLN)')).getByText('13.00 €')).toHaveClass(
      'font-semibold'
    )
    expect(within(row('Food')).getByText('10.00 $')).toBeInTheDocument()
    expect(within(row('Food')).getByText(/40\.00/)).toBeInTheDocument()
  })

  it('loads more transactions as the list scrolls', async () => {
    for (let i = 0; i < 55; i++) {
      await addTx({ type: 'expense', amount: i + 1, categoryId: foodId })
    }
    await loadStore()
    render(<HistoryPage />)

    expect(screen.getAllByText('Food')).toHaveLength(50)

    act(() => intersect([{ isIntersecting: true }]))

    await waitFor(() => expect(screen.getAllByText('Food')).toHaveLength(55))
    expect(screen.getByText('showingAllTransactions')).toBeInTheDocument()
  })
})

describe('HistoryPage editing', () => {
  it('edits an expense and deletes it after confirmation', async () => {
    await seedMixed()
    const confirm = vi.spyOn(globalThis, 'confirm').mockReturnValueOnce(false).mockReturnValue(true)
    render(<HistoryPage />)

    fireEvent.click(screen.getByText('Food'))
    const deleteButton = await screen.findByRole('button', { name: 'delete' })
    fireEvent.click(deleteButton)
    expect(confirm).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'delete' }))

    await waitFor(() => expect(screen.queryByText('Food')).not.toBeInTheDocument())
    await expect(balanceOf(usdId)).resolves.toBe(530)
  })

  it('opens the right editor for income and transfers', async () => {
    await seedMixed()
    const { unmount } = render(<HistoryPage />)

    fireEvent.click(screen.getByText('Salary'))
    expect(await screen.findByRole('button', { name: 'delete' })).toBeInTheDocument()
    unmount()

    render(<HistoryPage />)
    fireEvent.click(screen.getByText('Wallet (USD) → Euro (EUR)'))
    expect(await screen.findByRole('button', { name: 'delete' })).toBeInTheDocument()
  })

  it('edits a loan through its originating transaction', async () => {
    await seedMixed()
    await accountRepo.updateBalance(usdId, -100)
    render(<HistoryPage />)

    fireEvent.click(screen.getByText('moneyGiven'))
    const dialog = within(await screen.findByRole('dialog', { name: 'editLoan' }))
    fireEvent.change(dialog.getByLabelText('amount'), { target: { value: '150' } })
    fireEvent.click(dialog.getByRole('button', { name: 'update' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await expect(loanRepo.getById(loanId)).resolves.toMatchObject({ amount: 150 })
    await expect(balanceOf(usdId)).resolves.toBe(350)
    const loanTransactions = await transactionRepo.getByLoan(loanId)
    expect(loanTransactions.find((tx) => tx.type === 'loan_given')).toMatchObject({ amount: 150 })
  })

  it('edits a loan payment', async () => {
    await seedMixed()
    render(<HistoryPage />)

    fireEvent.click(screen.getByText('paid'))

    expect(await screen.findByRole('dialog', { name: 'Alice' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'update' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('ignores transactions whose linked entity no longer exists', async () => {
    await addTx({ type: 'expense', amount: 1, categoryId: 999 })
    await addTx({
      type: 'loan_payment',
      amount: 1,
      loanId: 999,
      date: new Date(today.getTime() - 1),
    })
    await loadStore()
    render(<HistoryPage />)

    for (const title of ['Unknown', 'paid']) {
      fireEvent.click(screen.getByText(title))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    }
  })
})
