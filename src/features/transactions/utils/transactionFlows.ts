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
 * whose loan can't be found and transfers are not counted.
 */
export function calculateFlows(transactions: Transaction[], loans: Loan[]): TransactionFlows {
  let inflows = 0
  let outflows = 0

  transactions.forEach((tx) => {
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
  })

  return { inflows, outflows, net: inflows - outflows }
}
