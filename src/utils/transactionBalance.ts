import { accountRepo, loanRepo, transactionRepo } from '@/database/repositories'
import type { Account, Transaction, Loan } from '@/database/types'

export async function deleteLoanWithTransactions(loan: Loan): Promise<void> {
  if (!loan.id) return

  const transactions = await transactionRepo.getByLoan(loan.id)

  for (const transaction of transactions) {
    // loan_payment reversal already updates loan.paidAmount via loanRepo.reversePayment,
    // but this loan is about to be deleted outright, so that side effect is harmless.
    await reverseTransactionBalance(transaction, [loan])

    if (transaction.id) {
      await transactionRepo.delete(transaction.id)
    }
  }

  await loanRepo.delete(loan.id)
}

export interface BalanceDelta {
  accountId: number
  delta: number
}

/**
 * Compute how a transaction changes account balances, in each account's own currency.
 * Pure counterpart of applyTransactionBalance (reversal is the same deltas negated).
 */
export function getTransactionBalanceDeltas(
  transaction: Transaction,
  loans: Loan[]
): BalanceDelta[] {
  const { type, accountId, amount, accountAmount, toAccountId, toAmount, loanId } = transaction
  // Amount applied to accountId's balance, in the account's own currency.
  // Falls back to `amount` when the transaction currency already matches the account.
  const appliedAmount = accountAmount ?? amount
  const deltas: BalanceDelta[] = []

  switch (type) {
    case 'income':
    case 'loan_received': {
      // Money comes in → balance increases
      if (accountId) deltas.push({ accountId, delta: appliedAmount })
      break
    }

    case 'expense':
    case 'loan_given': {
      // Money goes out → balance decreases
      if (accountId) deltas.push({ accountId, delta: -appliedAmount })
      break
    }

    case 'transfer': {
      if (accountId) deltas.push({ accountId, delta: -amount })
      if (toAccountId) deltas.push({ accountId: toAccountId, delta: toAmount ?? amount })
      break
    }

    case 'loan_payment': {
      if (loanId && accountId) {
        const loan = loans.find((l) => l.id === loanId)
        if (loan?.type === 'given') {
          // Payment on given loan: money comes back → balance increases
          deltas.push({ accountId, delta: appliedAmount })
        } else if (loan?.type === 'received') {
          // Payment on received loan: money goes out → balance decreases
          deltas.push({ accountId, delta: -appliedAmount })
        }
      }
      break
    }
  }

  return deltas
}

/**
 * Reverse a transaction's balance effects on accounts.
 * Call this before deleting a transaction or updating it (to undo the old effects).
 */
export async function reverseTransactionBalance(
  transaction: Transaction,
  loans: Loan[]
): Promise<void> {
  const { type, amount, loanId, mainCurrencyAmount } = transaction
  if (type === 'loan_payment' && loanId) {
    await loanRepo.reversePayment(loanId, mainCurrencyAmount ?? amount)
  }

  for (const { accountId, delta } of getTransactionBalanceDeltas(transaction, loans)) {
    await accountRepo.updateBalance(accountId, -delta)
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
  const { type, amount, loanId, mainCurrencyAmount } = transaction
  if (type === 'loan_payment' && loanId) {
    await loanRepo.recordPayment(loanId, mainCurrencyAmount ?? amount)
  }

  for (const { accountId, delta } of getTransactionBalanceDeltas(transaction, loans)) {
    await accountRepo.updateBalance(accountId, delta)
  }
}

/**
 * Reconstruct account balances as of `date` by undoing every transaction dated after it.
 * Returns a map of accountId → balance at that moment.
 */
export function getAccountBalancesAt(
  accounts: Account[],
  transactions: Transaction[],
  loans: Loan[],
  date: Date
): Map<number, number> {
  const balances = new Map<number, number>()
  for (const account of accounts) {
    if (account.id !== undefined) balances.set(account.id, account.balance)
  }

  const cutoff = date.getTime()
  for (const transaction of transactions) {
    if (new Date(transaction.date).getTime() <= cutoff) continue
    for (const { accountId, delta } of getTransactionBalanceDeltas(transaction, loans)) {
      const balance = balances.get(accountId)
      if (balance !== undefined) balances.set(accountId, balance - delta)
    }
  }

  return balances
}
