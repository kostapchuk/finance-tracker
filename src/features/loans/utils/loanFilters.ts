import type { Loan, Transaction } from '@/database/types'

/**
 * The date a loan was fully paid off. Uses the most recent `loan_payment`
 * transaction for the loan; falls back to the loan's `updatedAt` for
 * historical/imported loans with no matching transaction on record.
 */
export function getLastPaymentDate(loan: Loan, transactions: Transaction[]): Date {
  const payments = transactions.filter((tx) => tx.loanId === loan.id && tx.type === 'loan_payment')
  if (payments.length === 0) return new Date(loan.updatedAt)

  const latestTimestamp = Math.max(...payments.map((tx) => new Date(tx.date).getTime()))
  return new Date(latestTimestamp)
}

/**
 * Filters completed loans to those last paid off within [monthStart, monthEnd],
 * sorted with the most recently paid loan first.
 */
export function filterCompletedLoansByMonth(
  loans: Loan[],
  transactions: Transaction[],
  monthStart: Date,
  monthEnd: Date
): Loan[] {
  return loans
    .map((loan) => ({ loan, lastPaymentDate: getLastPaymentDate(loan, transactions) }))
    .filter(({ lastPaymentDate }) => lastPaymentDate >= monthStart && lastPaymentDate <= monthEnd)
    .sort((a, b) => b.lastPaymentDate.getTime() - a.lastPaymentDate.getTime())
    .map(({ loan }) => loan)
}
