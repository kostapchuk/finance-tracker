import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  applyTransactionBalance,
  reverseTransactionBalance,
  deleteLoanWithTransactions,
  getAccountBalancesAt,
  getTransactionBalanceDeltas,
} from './transactionBalance'

import { accountRepo, loanRepo, transactionRepo } from '@/database/repositories'
import type { Account, Transaction, Loan } from '@/database/types'

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

  it('uses mainCurrencyAmount for loanRepo bookkeeping when set', async () => {
    const loan = makeLoan({ id: 9, type: 'given' })
    const tx = makeTransaction({
      type: 'loan_payment',
      accountId: 5,
      amount: 30,
      mainCurrencyAmount: 27,
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

function makeAccount(overrides: Partial<Account>): Account {
  return {
    id: 1,
    name: 'Wallet',
    type: 'cash',
    currency: 'USD',
    balance: 0,
    color: '#000000',
    sortOrder: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

describe('getTransactionBalanceDeltas', () => {
  it('returns both sides of a multi-currency transfer', () => {
    const tx = makeTransaction({
      type: 'transfer',
      accountId: 1,
      toAccountId: 2,
      amount: 100,
      toAmount: 90,
    })
    expect(getTransactionBalanceDeltas(tx, [])).toEqual([
      { accountId: 1, delta: -100 },
      { accountId: 2, delta: 90 },
    ])
  })

  it('returns no deltas for a loan payment whose loan is unknown', () => {
    const tx = makeTransaction({ type: 'loan_payment', accountId: 1, loanId: 99 })
    expect(getTransactionBalanceDeltas(tx, [])).toEqual([])
  })

  it('decreases the account for a payment on a received loan', () => {
    const tx = makeTransaction({ type: 'loan_payment', accountId: 1, loanId: 7, amount: 30 })
    const loans = [makeLoan({ id: 7, type: 'received' })]
    expect(getTransactionBalanceDeltas(tx, loans)).toEqual([{ accountId: 1, delta: -30 }])
  })
})

describe('getAccountBalancesAt', () => {
  const endOfJan = new Date(2026, 0, 31, 23, 59, 59, 999)

  it('keeps current balances when there are no later transactions', () => {
    const accounts = [makeAccount({ id: 1, balance: 500 })]
    const txs = [
      makeTransaction({ type: 'expense', accountId: 1, amount: 50, date: new Date(2026, 0, 10) }),
    ]
    expect(getAccountBalancesAt(accounts, txs, [], endOfJan).get(1)).toBe(500)
  })

  it('undoes transactions dated after the cutoff', () => {
    const accounts = [
      makeAccount({ id: 1, balance: 500 }),
      makeAccount({ id: 2, balance: 200, currency: 'EUR' }),
    ]
    const feb = new Date(2026, 1, 5)
    const txs = [
      makeTransaction({ type: 'income', accountId: 1, amount: 300, date: feb }),
      makeTransaction({ type: 'expense', accountId: 1, amount: 40, date: feb }),
      makeTransaction({
        type: 'transfer',
        accountId: 1,
        toAccountId: 2,
        amount: 100,
        toAmount: 90,
        date: feb,
      }),
      // Before the cutoff: must not be undone
      makeTransaction({
        type: 'income',
        accountId: 1,
        amount: 1000,
        date: new Date(2026, 0, 31, 12),
      }),
    ]
    const balances = getAccountBalancesAt(accounts, txs, [], endOfJan)
    expect(balances.get(1)).toBe(500 - 300 + 40 + 100)
    expect(balances.get(2)).toBe(200 - 90)
  })

  it('ignores transactions referencing unknown accounts', () => {
    const accounts = [makeAccount({ id: 1, balance: 10 })]
    const txs = [
      makeTransaction({ type: 'income', accountId: 42, amount: 5, date: new Date(2026, 2, 1) }),
    ]
    const balances = getAccountBalancesAt(accounts, txs, [], endOfJan)
    expect(balances.get(1)).toBe(10)
    expect(balances.has(42)).toBe(false)
  })
})
