import type { Transaction } from '@/database/types'

export interface TransactionFlows {
  inflows: number
  outflows: number
  net: number
}

/**
 * Sums money in/out for a list of transactions in the main currency.
 * Income and received loans count as inflows; expenses and given loans
 * count as outflows. Transfers and loan payments are not counted.
 */
export function calculateFlows(transactions: Transaction[]): TransactionFlows {
  let inflows = 0
  let outflows = 0

  transactions.forEach((tx) => {
    const amount = tx.mainCurrencyAmount ?? tx.amount

    if (tx.type === 'income' || tx.type === 'loan_received') {
      inflows += amount
    } else if (tx.type === 'expense' || tx.type === 'loan_given') {
      outflows += amount
    }
  })

  return { inflows, outflows, net: inflows - outflows }
}
