import type { Loan, Transaction } from '@/database/types'

export interface TransactionFlows {
  inflows: number
  outflows: number
  net: number
}

/**
 * Sums money in/out for a list of transactions in the main currency.
 * Income and received loans count as inflows; expenses and given loans
 * count as outflows. A loan payment follows its loan: repayment of a given
 * loan is an inflow, a payment on a received loan is an outflow. Payments
 * whose loan can't be found and transfers are not counted. Transactions in
 * a different currency with no converted `mainCurrencyAmount` are skipped
 * rather than summed in their own currency's units.
 */
export function calculateFlows(
  transactions: Transaction[],
  loans: Loan[],
  mainCurrency: string
): TransactionFlows {
  let inflows = 0
  let outflows = 0

  for (const tx of transactions) {
    if (tx.currency !== mainCurrency && tx.mainCurrencyAmount == undefined) continue
    const amount = tx.mainCurrencyAmount ?? tx.amount

    switch (tx.type) {
      case 'income':
      case 'loan_received': {
        inflows += amount
        break
      }
      case 'expense':
      case 'loan_given': {
        outflows += amount
        break
      }
      case 'loan_payment': {
        const loan = loans.find((l) => l.id === tx.loanId)
        if (loan?.type === 'given') {
          inflows += amount
        } else if (loan?.type === 'received') {
          outflows += amount
        }
        break
      }
      // transfers are not counted
    }
  }

  return { inflows, outflows, net: inflows - outflows }
}
