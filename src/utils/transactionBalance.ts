import { accountRepo, loanRepo, transactionRepo } from '@/database/repositories'
import type { Transaction, Loan } from '@/database/types'

export async function deleteLoanWithTransactions(loan: Loan): Promise<void> {
  if (!loan.id) return

  const transactions = await transactionRepo.getByLoan(loan.id)

  for (const transaction of transactions) {
    if (transaction.accountId) {
      switch (transaction.type) {
        case 'loan_given':
          await accountRepo.updateBalance(transaction.accountId, transaction.amount)
          break
        case 'loan_received':
          await accountRepo.updateBalance(transaction.accountId, -transaction.amount)
          break
        case 'loan_payment':
          if (loan.type === 'given') {
            await accountRepo.updateBalance(transaction.accountId, -transaction.amount)
          } else {
            await accountRepo.updateBalance(transaction.accountId, transaction.amount)
          }
          break
      }
    }

    if (transaction.id) {
      await transactionRepo.delete(transaction.id)
    }
  }

  await loanRepo.delete(loan.id)
}

/**
 * Reverse a transaction's balance effects on accounts.
 * Call this before deleting a transaction or updating it (to undo the old effects).
 */
export async function reverseTransactionBalance(
  transaction: Transaction,
  loans: Loan[]
): Promise<void> {
  const { type, accountId, amount, toAccountId, toAmount, loanId, mainCurrencyAmount } = transaction

  switch (type) {
    case 'income':
      if (accountId) {
        await accountRepo.updateBalance(accountId, -amount)
      }
      break

    case 'expense':
      if (accountId) {
        await accountRepo.updateBalance(accountId, amount)
      }
      break

    case 'transfer':
      // Reverse transfer: add back to source, subtract from target
      if (accountId) {
        await accountRepo.updateBalance(accountId, amount)
      }
      if (toAccountId) {
        const targetAmount = toAmount ?? amount
        await accountRepo.updateBalance(toAccountId, -targetAmount)
      }
      break

    case 'loan_given':
      // Original: balance decreased (money went out) → reverse: add back
      if (accountId) {
        await accountRepo.updateBalance(accountId, amount)
      }
      break

    case 'loan_received':
      // Original: balance increased (money came in) → reverse: subtract
      if (accountId) {
        await accountRepo.updateBalance(accountId, -amount)
      }
      break

    case 'loan_payment':
      if (loanId) {
        const paymentAmount = mainCurrencyAmount ?? amount
        await loanRepo.reversePayment(loanId, paymentAmount)

        // Reverse account balance change
        if (accountId) {
          const loan = loans.find((l) => l.id === loanId)
          if (loan?.type === 'given') {
            // Payment on given loan: money came back → reverse: subtract
            await accountRepo.updateBalance(accountId, -amount)
          } else if (loan?.type === 'received') {
            // Payment on received loan: money went out → reverse: add back
            await accountRepo.updateBalance(accountId, amount)
          }
        }
      }
      break
  }
}

/**
 * Apply a transaction's balance effects on accounts.
 * Call this after creating or updating a transaction (to apply the new effects).
 */
export async function applyTransactionBalance(
  transaction: Transaction,
  loans: Loan[]
): Promise<void> {
  const { type, accountId, amount, toAccountId, toAmount, loanId, mainCurrencyAmount } = transaction

  switch (type) {
    case 'income':
      if (accountId) {
        await accountRepo.updateBalance(accountId, amount)
      }
      break

    case 'expense':
      if (accountId) {
        await accountRepo.updateBalance(accountId, -amount)
      }
      break

    case 'transfer':
      if (accountId) {
        await accountRepo.updateBalance(accountId, -amount)
      }
      if (toAccountId) {
        const targetAmount = toAmount ?? amount
        await accountRepo.updateBalance(toAccountId, targetAmount)
      }
      break

    case 'loan_given':
      // Money goes out → balance decreases
      if (accountId) {
        await accountRepo.updateBalance(accountId, -amount)
      }
      break

    case 'loan_received':
      // Money comes in → balance increases
      if (accountId) {
        await accountRepo.updateBalance(accountId, amount)
      }
      break

    case 'loan_payment':
      if (loanId) {
        const paymentAmount = mainCurrencyAmount ?? amount
        await loanRepo.recordPayment(loanId, paymentAmount)

        // Update account balance
        if (accountId) {
          const loan = loans.find((l) => l.id === loanId)
          if (loan?.type === 'given') {
            // Payment on given loan: money comes back → balance increases
            await accountRepo.updateBalance(accountId, amount)
          } else if (loan?.type === 'received') {
            // Payment on received loan: money goes out → balance decreases
            await accountRepo.updateBalance(accountId, -amount)
          }
        }
      }
      break
  }
}
