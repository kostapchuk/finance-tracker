import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  applyTransactionBalance,
  reverseTransactionBalance,
  deleteLoanWithTransactions,
  type TransactionBalanceFields,
} from './transactionBalance'

import { accountRepo, loanRepo, transactionRepo } from '@/database/repositories'
import type { Loan } from '@/database/types'

vi.mock('@/database/repositories', () => ({
  accountRepo: { updateBalance: vi.fn() },
  loanRepo: { recordPayment: vi.fn(), reversePayment: vi.fn(), delete: vi.fn() },
  transactionRepo: { getByLoan: vi.fn(), delete: vi.fn() },
}))

// The loan and payment flows in QuickTransactionModal now go through these
// shared helpers (instead of duplicating this arithmetic per feature), so
// this suite is the source of truth for the balance direction on each type.
const givenLoan: Loan = {
  id: 1,
  type: 'given',
  personName: 'Alex',
  amount: 100,
  currency: 'USD',
  paidAmount: 0,
  status: 'active',
  accountId: 5,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

const receivedLoan: Loan = { ...givenLoan, id: 2, type: 'received' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('applyTransactionBalance', () => {
  it('decreases the account balance for a loan_given transaction', async () => {
    const tx: TransactionBalanceFields = { type: 'loan_given', accountId: 5, amount: 100 }
    await applyTransactionBalance(tx, [])
    expect(accountRepo.updateBalance).toHaveBeenCalledWith(5, -100)
  })

  it('increases the account balance for a loan_received transaction', async () => {
    const tx: TransactionBalanceFields = { type: 'loan_received', accountId: 5, amount: 100 }
    await applyTransactionBalance(tx, [])
    expect(accountRepo.updateBalance).toHaveBeenCalledWith(5, 100)
  })

  it('records the payment and increases the balance when paying back a given loan', async () => {
    const tx: TransactionBalanceFields = {
      type: 'loan_payment',
      accountId: 5,
      amount: 40,
      loanId: 1,
    }
    await applyTransactionBalance(tx, [givenLoan])
    expect(loanRepo.recordPayment).toHaveBeenCalledWith(1, 40)
    expect(accountRepo.updateBalance).toHaveBeenCalledWith(5, 40)
  })

  it('records the payment and decreases the balance when paying back a received loan', async () => {
    const tx: TransactionBalanceFields = {
      type: 'loan_payment',
      accountId: 5,
      amount: 40,
      loanId: 2,
    }
    await applyTransactionBalance(tx, [receivedLoan])
    expect(loanRepo.recordPayment).toHaveBeenCalledWith(2, 40)
    expect(accountRepo.updateBalance).toHaveBeenCalledWith(5, -40)
  })
})

describe('reverseTransactionBalance', () => {
  it('undoes a loan_given transaction by adding the amount back', async () => {
    const tx: TransactionBalanceFields = { type: 'loan_given', accountId: 5, amount: 100 }
    await reverseTransactionBalance(tx, [])
    expect(accountRepo.updateBalance).toHaveBeenCalledWith(5, 100)
  })

  it('undoes a loan_received transaction by subtracting the amount', async () => {
    const tx: TransactionBalanceFields = { type: 'loan_received', accountId: 5, amount: 100 }
    await reverseTransactionBalance(tx, [])
    expect(accountRepo.updateBalance).toHaveBeenCalledWith(5, -100)
  })

  it('undoes a payment on a given loan', async () => {
    const tx: TransactionBalanceFields = {
      type: 'loan_payment',
      accountId: 5,
      amount: 40,
      loanId: 1,
    }
    await reverseTransactionBalance(tx, [givenLoan])
    expect(loanRepo.reversePayment).toHaveBeenCalledWith(1, 40)
    expect(accountRepo.updateBalance).toHaveBeenCalledWith(5, -40)
  })

  it('undoes a payment on a received loan', async () => {
    const tx: TransactionBalanceFields = {
      type: 'loan_payment',
      accountId: 5,
      amount: 40,
      loanId: 2,
    }
    await reverseTransactionBalance(tx, [receivedLoan])
    expect(loanRepo.reversePayment).toHaveBeenCalledWith(2, 40)
    expect(accountRepo.updateBalance).toHaveBeenCalledWith(5, 40)
  })
})

describe('deleteLoanWithTransactions', () => {
  it('reverses every transaction on the loan, deletes them, then deletes the loan', async () => {
    vi.mocked(transactionRepo.getByLoan).mockResolvedValue([
      {
        id: 10,
        type: 'loan_given',
        accountId: 5,
        amount: 100,
        currency: 'USD',
        date: new Date('2026-01-01'),
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      },
      {
        id: 11,
        type: 'loan_payment',
        accountId: 5,
        amount: 40,
        currency: 'USD',
        date: new Date('2026-01-02'),
        createdAt: new Date('2026-01-02'),
        updatedAt: new Date('2026-01-02'),
      },
    ])

    await deleteLoanWithTransactions(givenLoan)

    expect(accountRepo.updateBalance).toHaveBeenCalledWith(5, 100) // undo loan_given
    expect(accountRepo.updateBalance).toHaveBeenCalledWith(5, -40) // undo payment on a given loan
    expect(transactionRepo.delete).toHaveBeenCalledWith(10)
    expect(transactionRepo.delete).toHaveBeenCalledWith(11)
    expect(loanRepo.delete).toHaveBeenCalledWith(1)
  })
})
