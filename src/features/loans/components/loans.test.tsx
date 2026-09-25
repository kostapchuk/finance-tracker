import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LoanForm } from './LoanForm'
import { LoansPage } from './LoansPage'
import { PaymentDialog } from './PaymentDialog'

import { accountRepo, loanRepo, transactionRepo } from '@/database/repositories'
import type { Loan } from '@/database/types'
import { useAppStore } from '@/store/useAppStore'
import { created, resetDbAndStore } from '@/test/db'

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: vi.fn(), t: (key: string) => key }),
}))

let usdId: number
let eurId: number
let plnId: number

beforeEach(async () => {
  await resetDbAndStore()
  const account = { type: 'cash' as const, balance: 1000, color: '#000' }
  usdId = await created(accountRepo.create({ ...account, name: 'Dollars', currency: 'USD' }))
  eurId = await created(accountRepo.create({ ...account, name: 'Euros', currency: 'EUR' }))
  plnId = await created(accountRepo.create({ ...account, name: 'Zloty', currency: 'PLN' }))
  useAppStore.setState({ mainCurrency: 'USD' })
  await useAppStore.getState().refreshAccounts()
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function balanceOf(id: number) {
  const account = await accountRepo.getById(id)
  return account?.balance
}

async function createLoan(overrides: Partial<Loan> = {}): Promise<Loan> {
  const id = await created(
    loanRepo.create({
      type: 'given',
      personName: 'Alice',
      amount: 100,
      currency: 'USD',
      paidAmount: 0,
      status: 'active',
      accountId: usdId,
      ...overrides,
    })
  )
  const loan = await loanRepo.getById(id)
  if (!loan) throw new Error('loan missing')
  return loan
}

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function pickAccount(trigger: HTMLElement, name: RegExp) {
  fireEvent.click(trigger)
  fireEvent.click(screen.getByRole('option', { name }))
}

describe('LoansPage', () => {
  it('shows empty states and zero totals', () => {
    render(<LoansPage />)

    expect(screen.getByText('noActiveLoansGiven')).toBeInTheDocument()
    expect(screen.getByText('noActiveDebts')).toBeInTheDocument()
    expect(screen.getAllByText('0.00 $')).toHaveLength(2)
  })

  it('creates a loan, records the transaction and moves money out of the account', async () => {
    render(<LoansPage />)

    fireEvent.click(screen.getByRole('button', { name: 'add' }))
    type('whoDidYouLendTo', 'Bob')
    type('amount', '40')
    type('description', 'lunch')
    fireEvent.click(screen.getByRole('button', { name: 'create' }))

    expect(await screen.findByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('lunch')).toBeInTheDocument()
    await expect(balanceOf(usdId)).resolves.toBe(960)
    const [transaction] = await transactionRepo.getAll()
    expect(transaction).toMatchObject({
      type: 'loan_given',
      amount: 40,
      currency: 'USD',
      comment: 'loanTo Bob',
      mainCurrencyAmount: undefined,
    })
  })

  it('creates a borrowed loan into a foreign-currency account', async () => {
    render(<LoansPage />)

    fireEvent.click(screen.getByRole('button', { name: 'add' }))
    pickAccount(screen.getByRole('button', { name: 'moneyILent' }), /moneyIBorrowed/)
    type('whoDidYouBorrowFrom', 'Bank')
    pickAccount(screen.getByLabelText('relatedAccount'), /Euros/)
    const [loanAmount, accountAmount] = screen.getAllByPlaceholderText('0.00')
    fireEvent.change(loanAmount, { target: { value: '100' } })
    fireEvent.change(accountAmount, { target: { value: '90' } })
    fireEvent.click(screen.getByRole('button', { name: 'create' }))

    expect(await screen.findByText('Bank')).toBeInTheDocument()
    await expect(balanceOf(eurId)).resolves.toBe(1090)
    const [transaction] = await transactionRepo.getAll()
    expect(transaction).toMatchObject({
      type: 'loan_received',
      amount: 90,
      currency: 'EUR',
      comment: 'loanFrom Bank',
      mainCurrencyAmount: 100,
    })
  })

  it('groups totals by currency, collapses sections and lists completed loans', async () => {
    await createLoan({ amount: 100, paidAmount: 25 })
    await createLoan({ personName: 'Eve', currency: 'EUR', amount: 50 })
    await createLoan({ personName: 'Carl', type: 'received', amount: 30 })
    await createLoan({ personName: 'Done', status: 'fully_paid', paidAmount: 100 })
    await createLoan({ personName: 'Paid', type: 'received', status: 'fully_paid' })
    await useAppStore.getState().refreshLoans()
    render(<LoansPage />)

    // Once in the "owed to you" summary, once on the loan card
    expect(screen.getAllByText('75.00 $')).toHaveLength(2)
    expect(screen.getAllByText('50.00 €')).toHaveLength(3)
    expect(screen.getByText('repaid')).toBeInTheDocument()
    expect(screen.getByText('paidOff')).toBeInTheDocument()

    fireEvent.click(screen.getByText('moneyGiven'))
    fireEvent.click(screen.getByText('moneyReceived'))
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
    expect(screen.queryByText('Carl')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('moneyReceived'))
    expect(screen.getByText('Carl')).toBeInTheDocument()
  })

  it('opens the payment dialog for a loan and pays it off', async () => {
    await createLoan()
    await useAppStore.getState().refreshLoans()
    render(<LoansPage />)

    fireEvent.click(screen.getByText('Alice'))
    const dialog = within(screen.getByRole('dialog', { name: 'Alice' }))
    fireEvent.click(dialog.getByText(/payFullRemaining/))
    fireEvent.click(dialog.getByRole('button', { name: 'recordPayment' }))

    expect(await screen.findByText('completed')).toBeInTheDocument()
    await expect(balanceOf(usdId)).resolves.toBe(1100)
  })
})

describe('LoanForm', () => {
  it('saves directly and asks for a main-currency amount when no currency is the main one', async () => {
    const onClose = vi.fn()
    render(<LoanForm open onClose={onClose} />)

    type('whoDidYouLendTo', 'Zed')
    pickAccount(screen.getByLabelText('relatedAccount'), /Zloty/)
    fireEvent.click(screen.getByLabelText('currency'))
    fireEvent.click(screen.getByRole('option', { name: '€ EUR' }))
    const [loanAmount, accountAmount] = screen.getAllByPlaceholderText('0.00')
    fireEvent.change(loanAmount, { target: { value: '10' } })
    fireEvent.change(accountAmount, { target: { value: '43' } })

    expect(screen.getByRole('button', { name: 'create' })).toBeDisabled()
    type('USD (amountInMainCurrency)', '11')
    type('dueDate', '2026-12-31')
    fireEvent.click(screen.getByRole('button', { name: 'create' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(useAppStore.getState().loans).toEqual([
      expect.objectContaining({
        personName: 'Zed',
        currency: 'EUR',
        amount: 10,
        accountId: plnId,
        dueDate: new Date('2026-12-31'),
      }),
    ])
  })

  it('pre-fills an existing loan and its transaction amounts, then updates it', async () => {
    const loan = await createLoan({
      currency: 'EUR',
      accountId: plnId,
      description: 'trip',
      dueDate: new Date(2026, 5, 1),
    })
    const onSave = vi.fn(() => Promise.resolve())
    const onClose = vi.fn()
    render(
      <LoanForm
        loan={loan}
        editTransaction={{
          type: 'loan_given',
          amount: 430,
          currency: 'PLN',
          mainCurrencyAmount: 110,
          date: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }}
        open
        onClose={onClose}
        onSave={onSave}
      />
    )

    expect(screen.getByRole('dialog', { name: 'editLoan' })).toBeInTheDocument()
    expect(screen.getByLabelText('description')).toHaveValue('trip')
    expect(screen.getByLabelText('dueDate')).toHaveValue('2026-06-01')
    expect(screen.getByDisplayValue('430')).toBeInTheDocument()
    expect(screen.getByLabelText('USD (amountInMainCurrency)')).toHaveValue(110)

    fireEvent.click(screen.getByRole('button', { name: 'update' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 100, accountAmount: 430, mainCurrencyAmount: 110 }),
      true,
      loan.id
    )
  })

  it('updates an existing loan without an onSave handler', async () => {
    const loan = await createLoan()
    const onClose = vi.fn()
    render(<LoanForm loan={loan} open onClose={onClose} />)

    type('whoDidYouLendTo', 'Alicia')
    fireEvent.click(screen.getByRole('button', { name: 'update' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    await expect(loanRepo.getById(loan.id!)).resolves.toMatchObject({ personName: 'Alicia' })
  })

  it('rejects non-positive amounts and logs save failures', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onSave = vi.fn().mockRejectedValue(new Error('nope'))
    const onClose = vi.fn()
    render(<LoanForm open onClose={onClose} onSave={onSave} />)

    type('whoDidYouLendTo', 'Bob')
    type('amount', '-5')
    fireEvent.click(screen.getByRole('button', { name: 'create' }))
    expect(onSave).not.toHaveBeenCalled()

    type('amount', '5')
    fireEvent.click(screen.getByRole('button', { name: 'create' }))

    await waitFor(() => expect(log).toHaveBeenCalledWith('Failed to save loan:', expect.any(Error)))
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('PaymentDialog', () => {
  it('renders nothing without a loan', () => {
    const { container } = render(<PaymentDialog loan={undefined} open onClose={vi.fn()} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('records a cross-currency payment with a manual main-currency amount', async () => {
    const loan = await createLoan({ currency: 'EUR', accountId: plnId, type: 'received' })
    const onClose = vi.fn()
    render(<PaymentDialog loan={loan} open onClose={onClose} />)

    const [loanAmount, accountAmount] = screen.getAllByPlaceholderText('0.00')
    fireEvent.change(loanAmount, { target: { value: '0a1,5.5' } })
    expect(loanAmount).toHaveValue('1.55')
    fireEvent.change(loanAmount, { target: { value: '20' } })
    fireEvent.change(accountAmount, { target: { value: '86' } })
    const submit = screen.getByRole('button', { name: 'recordPayment' })
    expect(submit).toBeDisabled()

    fireEvent.change(screen.getAllByPlaceholderText('0.00')[2], { target: { value: '22' } })
    fireEvent.click(submit)

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    await expect(balanceOf(plnId)).resolves.toBe(914)
    await expect(loanRepo.getById(loan.id!)).resolves.toMatchObject({ paidAmount: 20 })
    const [payment] = await transactionRepo.getAll()
    expect(payment).toMatchObject({
      type: 'loan_payment',
      amount: 86,
      currency: 'PLN',
      loanCurrencyAmount: 20,
      mainCurrencyAmount: 22,
      comment: 'paymentMadeTo Alice',
    })
  })

  it('blocks payments larger than what is left', () => {
    render(
      <PaymentDialog
        loan={{
          id: 1,
          type: 'given',
          personName: 'A',
          amount: 10,
          currency: 'USD',
          paidAmount: 5,
          status: 'partially_paid',
          accountId: usdId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }}
        open
        onClose={vi.fn()}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '6' } })

    expect(screen.getByRole('button', { name: 'recordPayment' })).toBeDisabled()
  })

  it('edits an existing payment, reversing the old one first', async () => {
    const loan = await createLoan()
    const txId = await created(
      transactionRepo.create({
        type: 'loan_payment',
        amount: 30,
        currency: 'USD',
        date: new Date(),
        loanId: loan.id,
        accountId: usdId,
        comment: 'first',
      })
    )
    await loanRepo.recordPayment(loan.id!, 30)
    await accountRepo.updateBalance(usdId, 30)
    const paidLoan = await loanRepo.getById(loan.id!)
    const editTransaction = await transactionRepo.getById(txId)
    const onClose = vi.fn()
    render(
      <PaymentDialog loan={paidLoan} editTransaction={editTransaction} open onClose={onClose} />
    )

    expect(screen.getByLabelText('comment')).toHaveValue('first')
    expect(screen.queryByText(/payFullRemaining/)).not.toBeInTheDocument()
    fireEvent.change(screen.getByDisplayValue('30'), { target: { value: '50' } })
    fireEvent.click(screen.getByRole('button', { name: 'update' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    await expect(balanceOf(usdId)).resolves.toBe(1050)
    await expect(loanRepo.getById(loan.id!)).resolves.toMatchObject({ paidAmount: 50 })
    await expect(transactionRepo.getById(txId)).resolves.toMatchObject({ amount: 50 })
  })

  it('deletes the loan with its transactions after confirmation', async () => {
    const loan = await createLoan()
    await transactionRepo.create({
      type: 'loan_given',
      amount: 100,
      currency: 'USD',
      date: new Date(),
      loanId: loan.id,
      accountId: usdId,
    })
    const confirm = vi
      .spyOn(globalThis, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
    const onClose = vi.fn()
    render(<PaymentDialog loan={loan} open onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'delete' }))
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'delete' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(confirm).toHaveBeenCalledTimes(2)
    await expect(loanRepo.getById(loan.id!)).resolves.toBeUndefined()
    await expect(transactionRepo.getAll()).resolves.toEqual([])
    await expect(balanceOf(usdId)).resolves.toBe(1100)
  })

  it('logs failures when recording or deleting', async () => {
    const loan = await createLoan()
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(transactionRepo, 'create').mockRejectedValueOnce(new Error('a'))
    vi.spyOn(loanRepo, 'delete').mockRejectedValueOnce(new Error('b'))
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
    const onClose = vi.fn()
    render(<PaymentDialog loan={loan} open onClose={onClose} />)

    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'recordPayment' }))
    await waitFor(() =>
      expect(log).toHaveBeenCalledWith('Failed to record payment:', expect.any(Error))
    )

    fireEvent.click(screen.getByRole('button', { name: 'delete' }))
    await waitFor(() =>
      expect(log).toHaveBeenCalledWith('Failed to delete loan:', expect.any(Error))
    )

    fireEvent.click(screen.getByRole('button', { name: 'cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
