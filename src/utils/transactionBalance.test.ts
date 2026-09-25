import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  applyTransactionBalance,
  reverseTransactionBalance,
  deleteLoanWithTransactions,
} from './transactionBalance'

import { accountRepo, loanRepo, transactionRepo } from '@/database/repositories'
import type { Transaction, Loan } from '@/database/types'

vi.mock('@/database/repositories', () => ({
  accountRepo: {
    updateBalance: vi.fn(),
  },
  loanRepo: {
    recordPayment: vi.fn(),
    reversePayment: vi.fn(),
    delete: vi.fn(),
  },
  transactionRepo: {
    getByLoan: vi.fn(),
    delete: vi.fn(),
  },
}))

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: 1,
    type: 'income',
    amount: 100,
    currency: 'USD',
    date: new Date('2026-01-01'),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

function makeLoan(overrides: Partial<Loan>): Loan {
  return {
    id: 1,
    type: 'given',
    personName: 'Alex',
    amount: 100,
    currency: 'USD',
    paidAmount: 0,
    status: 'active',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

describe('applyTransactionBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('adds the amount to the account for income', async () => {
    const tx = makeTransaction({ type: 'income', accountId: 5, amount: 100 })
    await applyTransactionBalance(tx, [])
    expect(accountRepo.updateBalance).toHaveBeenCalledWith(5, 100)
  })

  it('uses accountAmount instead of amount for multi-currency income', async () => {
    const tx = makeTransaction({
      type: 'income',
      accountId: 5,
      amount: 100, // source currency
      accountAmount: 92, // account currency, different from source
    })
    await applyTransactionBalance(tx, [])
    expect(accountRepo.updateBalance).toHaveBeenCalledWith(5, 92)
  })

  it('subtracts the amount from the account for expense', async () => {
    const tx = makeTransaction({ type: 'expense', accountId: 5, amount: 40 })
    await applyTransactionBalance(tx, [])
    expect(accountRepo.updateBalance).toHaveBeenCalledWith(5, -40)
  })

  it('moves money from source to target account for a same-currency transfer', async () => {
    const tx = makeTransaction({
      type: 'transfer',
      accountId: 1,
      toAccountId: 2,
      amount: 50,
    })
    await applyTransactionBalance(tx, [])
    expect(accountRepo.updateBalance).toHaveBeenCalledWith(1, -50)
    expect(accountRepo.updateBalance).toHaveBeenCalledWith(2, 50)
  })

  it('uses toAmount for the target account on a multi-currency transfer', async () => {
    const tx = makeTransaction({
      type: 'transfer',
      accountId: 1,
      toAccountId: 2,
      amount: 50,
      toAmount: 45,
    })
    await applyTransactionBalance(tx, [])
    expect(accountRepo.updateBalance).toHaveBeenCalledWith(1, -50)
    expect(accountRepo.updateBalance).toHaveBeenCalledWith(2, 45)
  })

  it('decreases the account balance for a given loan (money goes out)', async () => {
    const tx = makeTransaction({ type: 'loan_given', accountId: 5, amount: 100 })
    await applyTransactionBalance(tx, [])
    expect(accountRepo.updateBalance).toHaveBeenCalledWith(5, -100)
  })

  it('increases the account balance for a received loan (money comes in)', async () => {
    const tx = makeTransaction({ type: 'loan_received', accountId: 5, amount: 100 })
    await applyTransactionBalance(tx, [])
    expect(accountRepo.updateBalance).toHaveBeenCalledWith(5, 100)
  })

  it('records payment and increases balance for a payment on a given loan', async () => {
    const loan = makeLoan({ id: 9, type: 'given' })
    const tx = makeTransaction({ type: 'loan_payment', accountId: 5, amount: 30, loanId: 9 })
    await applyTransactionBalance(tx, [loan])
    expect(loanRepo.recordPayment).toHaveBeenCalledWith(9, 30)
    expect(accountRepo.updateBalance).toHaveBeenCalledWith(5, 30)
  })

  it('records payment and decreases balance for a payment on a received loan', async () => {
    const loan = makeLoan({ id: 9, type: 'received' })
    const tx = makeTransaction({ type: 'loan_payment', accountId: 5, amount: 30, loanId: 9 })
    await applyTransactionBalance(tx, [loan])
    expect(loanRepo.recordPayment).toHaveBeenCalledWith(9, 30)
    expect(accountRepo.updateBalance).toHaveBeenCalledWith(5, -30)
  })

  it('uses loanCurrencyAmount for loanRepo bookkeeping when set, ignoring mainCurrencyAmount', async () => {
    const loan = makeLoan({ id: 9, type: 'given' })
    const tx = makeTransaction({
      type: 'loan_payment',
      accountId: 5,
      amount: 30,
      loanCurrencyAmount: 27,
      mainCurrencyAmount: 24, // separate reporting field, must not affect paidAmount tracking
      loanId: 9,
    })
    await applyTransactionBalance(tx, [loan])
    expect(loanRepo.recordPayment).toHaveBeenCalledWith(9, 27)
  })
})

describe('reverseTransactionBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('subtracts the amount from the account for income', async () => {
    const tx = makeTransaction({ type: 'income', accountId: 5, amount: 100 })
    await reverseTransactionBalance(tx, [])
    expect(accountRepo.updateBalance).toHaveBeenCalledWith(5, -100)
  })

  it('uses accountAmount instead of amount to reverse multi-currency income', async () => {
    const tx = makeTransaction({
      type: 'income',
      accountId: 5,
      amount: 100,
      accountAmount: 92,
    })
    await reverseTransactionBalance(tx, [])
    expect(accountRepo.updateBalance).toHaveBeenCalledWith(5, -92)
  })

  it('reverses a given loan payment by subtracting from the account', async () => {
    const loan = makeLoan({ id: 9, type: 'given' })
    const tx = makeTransaction({ type: 'loan_payment', accountId: 5, amount: 30, loanId: 9 })
    await reverseTransactionBalance(tx, [loan])
    expect(loanRepo.reversePayment).toHaveBeenCalledWith(9, 30)
    expect(accountRepo.updateBalance).toHaveBeenCalledWith(5, -30)
  })

  it('nets out to zero when applying then reversing a multi-currency income', async () => {
    const tx = makeTransaction({
      type: 'income',
      accountId: 5,
      amount: 100,
      accountAmount: 92,
    })
    await applyTransactionBalance(tx, [])
    await reverseTransactionBalance(tx, [])
    const calls = vi.mocked(accountRepo.updateBalance).mock.calls
    const net = calls.reduce((sum, [, delta]) => sum + delta, 0)
    expect(net).toBe(0)
  })
})

describe('deleteLoanWithTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reverses each transaction, deletes them, and deletes the loan', async () => {
    const loan = makeLoan({ id: 9, type: 'given' })
    const givenTx = makeTransaction({
      id: 101,
      type: 'loan_given',
      accountId: 5,
      amount: 100,
      loanId: 9,
    })
    const paymentTx = makeTransaction({
      id: 102,
      type: 'loan_payment',
      accountId: 5,
      amount: 20,
      loanId: 9,
    })
    vi.mocked(transactionRepo.getByLoan).mockResolvedValue([givenTx, paymentTx])

    await deleteLoanWithTransactions(loan)

    // loan_given reversal: money went out, so reverse adds it back
    expect(accountRepo.updateBalance).toHaveBeenCalledWith(5, 100)
    // loan_payment reversal on a given loan: payment brought money back, reverse subtracts
    expect(accountRepo.updateBalance).toHaveBeenCalledWith(5, -20)
    expect(loanRepo.reversePayment).toHaveBeenCalledWith(9, 20)
    expect(transactionRepo.delete).toHaveBeenCalledWith(101)
    expect(transactionRepo.delete).toHaveBeenCalledWith(102)
    expect(loanRepo.delete).toHaveBeenCalledWith(9)
  })

  it('does nothing when the loan has no id', async () => {
    const loan = makeLoan({ id: undefined })
    await deleteLoanWithTransactions(loan)
    expect(transactionRepo.getByLoan).not.toHaveBeenCalled()
  })
})

describe('apply and reverse are mirror images for every transaction type', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const loans = [makeLoan({ id: 1, type: 'given' }), makeLoan({ id: 2, type: 'received' })]

  it.each([
    ['income', { type: 'income', accountId: 5 }, [[5, 100]]],
    ['expense', { type: 'expense', accountId: 5 }, [[5, -100]]],
    ['multi-currency expense', { type: 'expense', accountId: 5, accountAmount: 90 }, [[5, -90]]],
    [
      'transfer without toAmount',
      { type: 'transfer', accountId: 5, toAccountId: 6 },
      [
        [5, -100],
        [6, 100],
      ],
    ],
    [
      'transfer with toAmount',
      { type: 'transfer', accountId: 5, toAccountId: 6, toAmount: 300 },
      [
        [5, -100],
        [6, 300],
      ],
    ],
    ['loan given', { type: 'loan_given', accountId: 5 }, [[5, -100]]],
    ['loan received', { type: 'loan_received', accountId: 5 }, [[5, 100]]],
    ['payment on a given loan', { type: 'loan_payment', accountId: 5, loanId: 1 }, [[5, 100]]],
    [
      'payment on a received loan',
      { type: 'loan_payment', accountId: 5, loanId: 2, accountAmount: 80 },
      [[5, -80]],
    ],
    ['payment on an unknown loan', { type: 'loan_payment', accountId: 5, loanId: 99 }, []],
    ['payment without an account', { type: 'loan_payment', loanId: 1 }, []],
    ['payment without a loan', { type: 'loan_payment', accountId: 5 }, []],
  ] as [string, Partial<Transaction>, [number, number][]][])(
    '%s',
    async (_name, overrides, expected) => {
      const tx = makeTransaction(overrides)

      await applyTransactionBalance(tx, loans)
      expect(vi.mocked(accountRepo.updateBalance).mock.calls).toEqual(expected)

      vi.mocked(accountRepo.updateBalance).mockClear()
      await reverseTransactionBalance(tx, loans)
      expect(vi.mocked(accountRepo.updateBalance).mock.calls).toEqual(
        expected.map(([id, delta]) => [id, -delta])
      )
    }
  )

  it.each(['income', 'expense', 'transfer', 'loan_given', 'loan_received'] as const)(
    'leaves balances alone for %s without accounts',
    async (type) => {
      const tx = makeTransaction({ type })

      await applyTransactionBalance(tx, loans)
      await reverseTransactionBalance(tx, loans)

      expect(accountRepo.updateBalance).not.toHaveBeenCalled()
    }
  )

  it('tracks loan payments in the loan currency when provided', async () => {
    const tx = makeTransaction({ type: 'loan_payment', loanId: 2, loanCurrencyAmount: 25 })

    await applyTransactionBalance(tx, loans)
    await reverseTransactionBalance(tx, loans)

    expect(loanRepo.recordPayment).toHaveBeenCalledWith(2, 25)
    expect(loanRepo.reversePayment).toHaveBeenCalledWith(2, 25)
  })
})

describe('deleteLoanWithTransactions without transaction ids', () => {
  it('reverses but cannot delete transactions that have no id', async () => {
    vi.clearAllMocks()
    vi.mocked(transactionRepo.getByLoan).mockResolvedValue([
      makeTransaction({ id: undefined, type: 'loan_given', accountId: 5, loanId: 9 }),
    ])

    await deleteLoanWithTransactions(makeLoan({ id: 9 }))

    expect(accountRepo.updateBalance).toHaveBeenCalledWith(5, 100)
    expect(transactionRepo.delete).not.toHaveBeenCalled()
    expect(loanRepo.delete).toHaveBeenCalledWith(9)
  })
})
