import { describe, it, expect, vi, beforeEach } from 'vitest'

import { applyTransactionBalance, reverseTransactionBalance } from './transactionBalance'

import type { Transaction, Loan } from '@/database/types'

vi.mock('@/database/repositories', () => ({
  accountRepo: {
    updateBalance: vi.fn(),
  },
  loanRepo: {
    recordPayment: vi.fn(),
    reversePayment: vi.fn(),
  },
  transactionRepo: {
    getByLoan: vi.fn().mockResolvedValue([]),
    delete: vi.fn(),
  },
}))

describe('transactionBalance utilities', () => {
  const mockUpdateBalance = vi.fn()
  const mockRecordPayment = vi.fn()
  const mockReversePayment = vi.fn()

  beforeEach(async () => {
    vi.clearAllMocks()

    const { accountRepo, loanRepo } = await import('@/database/repositories')
    vi.mocked(accountRepo.updateBalance).mockImplementation(mockUpdateBalance)
    vi.mocked(loanRepo.recordPayment).mockImplementation(mockRecordPayment)
    vi.mocked(loanRepo.reversePayment).mockImplementation(mockReversePayment)
  })

  describe('applyTransactionBalance', () => {
    describe('income transaction', () => {
      it('adds amount to account balance', async () => {
        const transaction: Transaction = {
          id: 1,
          type: 'income',
          amount: 100,
          currency: 'USD',
          date: new Date(),
          accountId: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await applyTransactionBalance(transaction, [])

        expect(mockUpdateBalance).toHaveBeenCalledWith(5, 100)
      })

      it('does nothing when accountId is missing', async () => {
        const transaction: Transaction = {
          id: 1,
          type: 'income',
          amount: 100,
          currency: 'USD',
          date: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await applyTransactionBalance(transaction, [])

        expect(mockUpdateBalance).not.toHaveBeenCalled()
      })
    })

    describe('expense transaction', () => {
      it('subtracts amount from account balance', async () => {
        const transaction: Transaction = {
          id: 1,
          type: 'expense',
          amount: 50,
          currency: 'USD',
          date: new Date(),
          accountId: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await applyTransactionBalance(transaction, [])

        expect(mockUpdateBalance).toHaveBeenCalledWith(5, -50)
      })
    })

    describe('transfer transaction', () => {
      it('subtracts from source and adds to target account', async () => {
        const transaction: Transaction = {
          id: 1,
          type: 'transfer',
          amount: 100,
          currency: 'USD',
          date: new Date(),
          accountId: 1,
          toAccountId: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await applyTransactionBalance(transaction, [])

        expect(mockUpdateBalance).toHaveBeenCalledWith(1, -100)
        expect(mockUpdateBalance).toHaveBeenCalledWith(2, 100)
      })

      it('uses toAmount for target account when provided', async () => {
        const transaction: Transaction = {
          id: 1,
          type: 'transfer',
          amount: 100,
          currency: 'USD',
          date: new Date(),
          accountId: 1,
          toAccountId: 2,
          toAmount: 85,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await applyTransactionBalance(transaction, [])

        expect(mockUpdateBalance).toHaveBeenCalledWith(1, -100)
        expect(mockUpdateBalance).toHaveBeenCalledWith(2, 85)
      })

      it('uses amount as fallback when toAmount is not provided', async () => {
        const transaction: Transaction = {
          id: 1,
          type: 'transfer',
          amount: 100,
          currency: 'USD',
          date: new Date(),
          accountId: 1,
          toAccountId: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await applyTransactionBalance(transaction, [])

        expect(mockUpdateBalance).toHaveBeenCalledWith(2, 100)
      })
    })

    describe('loan_given transaction', () => {
      it('decreases account balance (money goes out)', async () => {
        const transaction: Transaction = {
          id: 1,
          type: 'loan_given',
          amount: 200,
          currency: 'USD',
          date: new Date(),
          accountId: 1,
          loanId: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await applyTransactionBalance(transaction, [])

        expect(mockUpdateBalance).toHaveBeenCalledWith(1, -200)
      })
    })

    describe('loan_received transaction', () => {
      it('increases account balance (money comes in)', async () => {
        const transaction: Transaction = {
          id: 1,
          type: 'loan_received',
          amount: 300,
          currency: 'USD',
          date: new Date(),
          accountId: 1,
          loanId: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await applyTransactionBalance(transaction, [])

        expect(mockUpdateBalance).toHaveBeenCalledWith(1, 300)
      })
    })

    describe('loan_payment transaction', () => {
      it('records payment and increases balance for given loan', async () => {
        const transaction: Transaction = {
          id: 1,
          type: 'loan_payment',
          amount: 50,
          currency: 'USD',
          date: new Date(),
          accountId: 1,
          loanId: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const loans: Loan[] = [
          {
            id: 10,
            type: 'given',
            personName: 'John',
            amount: 200,
            currency: 'USD',
            paidAmount: 0,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]

        await applyTransactionBalance(transaction, loans)

        expect(mockRecordPayment).toHaveBeenCalledWith(10, 50)
        expect(mockUpdateBalance).toHaveBeenCalledWith(1, 50)
      })

      it('records payment and decreases balance for received loan', async () => {
        const transaction: Transaction = {
          id: 1,
          type: 'loan_payment',
          amount: 50,
          currency: 'USD',
          date: new Date(),
          accountId: 1,
          loanId: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const loans: Loan[] = [
          {
            id: 10,
            type: 'received',
            personName: 'Jane',
            amount: 200,
            currency: 'USD',
            paidAmount: 0,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]

        await applyTransactionBalance(transaction, loans)

        expect(mockRecordPayment).toHaveBeenCalledWith(10, 50)
        expect(mockUpdateBalance).toHaveBeenCalledWith(1, -50)
      })

      it('uses mainCurrencyAmount for loan payment recording', async () => {
        const transaction: Transaction = {
          id: 1,
          type: 'loan_payment',
          amount: 100,
          currency: 'EUR',
          mainCurrencyAmount: 85,
          date: new Date(),
          accountId: 1,
          loanId: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const loans: Loan[] = [
          {
            id: 10,
            type: 'given',
            personName: 'John',
            amount: 200,
            currency: 'USD',
            paidAmount: 0,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]

        await applyTransactionBalance(transaction, loans)

        expect(mockRecordPayment).toHaveBeenCalledWith(10, 85)
      })

      it('does nothing when loanId is missing', async () => {
        const transaction: Transaction = {
          id: 1,
          type: 'loan_payment',
          amount: 50,
          currency: 'USD',
          date: new Date(),
          accountId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await applyTransactionBalance(transaction, [])

        expect(mockRecordPayment).not.toHaveBeenCalled()
        expect(mockUpdateBalance).not.toHaveBeenCalled()
      })
    })
  })

  describe('reverseTransactionBalance', () => {
    describe('income transaction', () => {
      it('subtracts amount from account balance', async () => {
        const transaction: Transaction = {
          id: 1,
          type: 'income',
          amount: 100,
          currency: 'USD',
          date: new Date(),
          accountId: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await reverseTransactionBalance(transaction, [])

        expect(mockUpdateBalance).toHaveBeenCalledWith(5, -100)
      })
    })

    describe('expense transaction', () => {
      it('adds amount back to account balance', async () => {
        const transaction: Transaction = {
          id: 1,
          type: 'expense',
          amount: 50,
          currency: 'USD',
          date: new Date(),
          accountId: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await reverseTransactionBalance(transaction, [])

        expect(mockUpdateBalance).toHaveBeenCalledWith(5, 50)
      })
    })

    describe('transfer transaction', () => {
      it('adds back to source and subtracts from target', async () => {
        const transaction: Transaction = {
          id: 1,
          type: 'transfer',
          amount: 100,
          currency: 'USD',
          date: new Date(),
          accountId: 1,
          toAccountId: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await reverseTransactionBalance(transaction, [])

        expect(mockUpdateBalance).toHaveBeenCalledWith(1, 100)
        expect(mockUpdateBalance).toHaveBeenCalledWith(2, -100)
      })

      it('uses toAmount for target account reversal', async () => {
        const transaction: Transaction = {
          id: 1,
          type: 'transfer',
          amount: 100,
          currency: 'USD',
          date: new Date(),
          accountId: 1,
          toAccountId: 2,
          toAmount: 85,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await reverseTransactionBalance(transaction, [])

        expect(mockUpdateBalance).toHaveBeenCalledWith(1, 100)
        expect(mockUpdateBalance).toHaveBeenCalledWith(2, -85)
      })
    })

    describe('loan_given transaction', () => {
      it('adds amount back to account balance', async () => {
        const transaction: Transaction = {
          id: 1,
          type: 'loan_given',
          amount: 200,
          currency: 'USD',
          date: new Date(),
          accountId: 1,
          loanId: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await reverseTransactionBalance(transaction, [])

        expect(mockUpdateBalance).toHaveBeenCalledWith(1, 200)
      })
    })

    describe('loan_received transaction', () => {
      it('subtracts amount from account balance', async () => {
        const transaction: Transaction = {
          id: 1,
          type: 'loan_received',
          amount: 300,
          currency: 'USD',
          date: new Date(),
          accountId: 1,
          loanId: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await reverseTransactionBalance(transaction, [])

        expect(mockUpdateBalance).toHaveBeenCalledWith(1, -300)
      })
    })

    describe('loan_payment transaction', () => {
      it('reverses payment and subtracts balance for given loan', async () => {
        const transaction: Transaction = {
          id: 1,
          type: 'loan_payment',
          amount: 50,
          currency: 'USD',
          date: new Date(),
          accountId: 1,
          loanId: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const loans: Loan[] = [
          {
            id: 10,
            type: 'given',
            personName: 'John',
            amount: 200,
            currency: 'USD',
            paidAmount: 50,
            status: 'partially_paid',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]

        await reverseTransactionBalance(transaction, loans)

        expect(mockReversePayment).toHaveBeenCalledWith(10, 50)
        expect(mockUpdateBalance).toHaveBeenCalledWith(1, -50)
      })

      it('reverses payment and adds balance for received loan', async () => {
        const transaction: Transaction = {
          id: 1,
          type: 'loan_payment',
          amount: 50,
          currency: 'USD',
          date: new Date(),
          accountId: 1,
          loanId: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const loans: Loan[] = [
          {
            id: 10,
            type: 'received',
            personName: 'Jane',
            amount: 200,
            currency: 'USD',
            paidAmount: 50,
            status: 'partially_paid',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]

        await reverseTransactionBalance(transaction, loans)

        expect(mockReversePayment).toHaveBeenCalledWith(10, 50)
        expect(mockUpdateBalance).toHaveBeenCalledWith(1, 50)
      })

      it('uses mainCurrencyAmount for loan payment reversal', async () => {
        const transaction: Transaction = {
          id: 1,
          type: 'loan_payment',
          amount: 100,
          currency: 'EUR',
          mainCurrencyAmount: 85,
          date: new Date(),
          accountId: 1,
          loanId: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const loans: Loan[] = [
          {
            id: 10,
            type: 'given',
            personName: 'John',
            amount: 200,
            currency: 'USD',
            paidAmount: 85,
            status: 'partially_paid',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]

        await reverseTransactionBalance(transaction, loans)

        expect(mockReversePayment).toHaveBeenCalledWith(10, 85)
      })

      it('does nothing when loanId is missing', async () => {
        const transaction: Transaction = {
          id: 1,
          type: 'loan_payment',
          amount: 50,
          currency: 'USD',
          date: new Date(),
          accountId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await reverseTransactionBalance(transaction, [])

        expect(mockReversePayment).not.toHaveBeenCalled()
        expect(mockUpdateBalance).not.toHaveBeenCalled()
      })
    })
  })
})
