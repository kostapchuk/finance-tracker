import type { BudgetOkRow, AccountBalanceDelta, ImportResult, SourceAccountInfo } from '../types'

import { accountRepo, transactionRepo } from '@/database/repositories'
import type { Transaction } from '@/database/types'

const BATCH_SIZE = 100

interface ExecuteImportParams {
  rows: BudgetOkRow[]
  accountMapping: Map<string, number>
  categoryMapping: Map<string, number>
  incomeSourceMapping: Map<string, number>
  accounts: { id?: number; currency: string }[]
}

export async function executeImport(params: ExecuteImportParams): Promise<ImportResult> {
  const { rows, accountMapping, categoryMapping, incomeSourceMapping, accounts } = params

  const accountCurrencyMap = new Map<number, string>()
  for (const acc of accounts) {
    if (acc.id) {
      accountCurrencyMap.set(acc.id, acc.currency)
    }
  }

  try {
    const { transactions, balanceDeltas } = transformRowsToTransactions(
      rows,
      accountMapping,
      categoryMapping,
      incomeSourceMapping,
      accountCurrencyMap
    )

    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE)
      await transactionRepo.bulkCreate(batch)
    }

    if (balanceDeltas.length > 0) {
      await accountRepo.bulkUpdateBalance(
        balanceDeltas.map((d) => ({ id: d.accountId, delta: d.delta }))
      )
    }

    return {
      success: true,
      importedCount: transactions.length,
    }
  } catch (error) {
    console.error('Import failed:', error)
    return {
      success: false,
      importedCount: 0,
      error: error instanceof Error ? error.message : 'Import failed',
    }
  }
}

interface TransformResult {
  transactions: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'userId'>[]
  balanceDeltas: AccountBalanceDelta[]
}

function transformRowsToTransactions(
  rows: BudgetOkRow[],
  accountMapping: Map<string, number>,
  categoryMapping: Map<string, number>,
  incomeSourceMapping: Map<string, number>,
  accountCurrencyMap: Map<number, string>
): TransformResult {
  const transactions: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'userId'>[] = []
  const balanceDeltaMap = new Map<number, number>()

  for (const row of rows) {
    const accountId = accountMapping.get(row.account)!
    const accountCurrency = accountCurrencyMap.get(accountId)!

    switch (row.operationType) {
      case 'Income': {
        const incomeSourceId = incomeSourceMapping.get(row.category)!
        const balanceAmount = determineBalanceAmount(row, accountCurrency)

        transactions.push({
          type: 'income',
          amount: balanceAmount,
          currency: accountCurrency,
          date: row.date,
          comment: row.comment || undefined,
          accountId,
          incomeSourceId,
        })

        addDelta(balanceDeltaMap, accountId, balanceAmount)
        break
      }

      case 'Expense': {
        const categoryId = categoryMapping.get(row.category)!
        const balanceAmount = determineBalanceAmount(row, accountCurrency)

        transactions.push({
          type: 'expense',
          amount: balanceAmount,
          currency: accountCurrency,
          date: row.date,
          comment: row.comment || undefined,
          accountId,
          categoryId,
        })

        addDelta(balanceDeltaMap, accountId, -balanceAmount)
        break
      }

      case 'transfer': {
        const toAccountId = accountMapping.get(row.category)!
        const toAccountCurrency = accountCurrencyMap.get(toAccountId)!
        const fromAmount = determineBalanceAmount(row, accountCurrency)
        const toAmount = determineToAmount(row, toAccountCurrency)

        transactions.push({
          type: 'transfer',
          amount: fromAmount,
          currency: accountCurrency,
          date: row.date,
          comment: row.comment || undefined,
          accountId,
          toAccountId,
          toAmount: toAmount !== fromAmount ? toAmount : undefined,
        })

        addDelta(balanceDeltaMap, accountId, -fromAmount)
        addDelta(balanceDeltaMap, toAccountId, toAmount)
        break
      }
    }
  }

  const balanceDeltas: AccountBalanceDelta[] = []
  for (const [accountId, delta] of balanceDeltaMap) {
    if (delta !== 0) {
      balanceDeltas.push({ accountId, delta })
    }
  }

  return { transactions, balanceDeltas }
}

function determineBalanceAmount(row: BudgetOkRow, accountCurrency: string): number {
  const rowCurrency = normalizeCurrency(row.currency)
  const rowCurrencyDop = row.currencyDop ? normalizeCurrency(row.currencyDop) : null
  const accCurrency = normalizeCurrency(accountCurrency)

  if (rowCurrency === accCurrency) {
    return row.amount
  }

  if (rowCurrencyDop && rowCurrencyDop === accCurrency && row.amountDop !== null) {
    return row.amountDop
  }

  return row.amount
}

function determineToAmount(row: BudgetOkRow, toAccountCurrency: string): number {
  const rowCurrency = normalizeCurrency(row.currency)
  const rowCurrencyDop = row.currencyDop ? normalizeCurrency(row.currencyDop) : null
  const toCurrency = normalizeCurrency(toAccountCurrency)

  if (rowCurrencyDop && rowCurrencyDop === toCurrency && row.amountDop !== null) {
    return row.amountDop
  }

  if (rowCurrency === toCurrency) {
    return row.amount
  }

  return row.amountDop ?? row.amount
}

function normalizeCurrency(currency: string): string {
  return currency.toUpperCase().trim()
}

function addDelta(map: Map<number, number>, accountId: number, delta: number): void {
  const current = map.get(accountId) || 0
  map.set(accountId, current + delta)
}

export function validateMappings(
  parsedData: {
    uniqueAccounts: SourceAccountInfo[]
    uniqueCategories: string[]
    uniqueIncomeSources: string[]
  },
  accountMapping: Map<string, number>,
  categoryMapping: Map<string, number>,
  incomeSourceMapping: Map<string, number>
): string | null {
  const unmappedAccounts = parsedData.uniqueAccounts
    .filter((a) => !accountMapping.has(a.name))
    .map((a) => a.name)
  const unmappedCategories = parsedData.uniqueCategories.filter((c) => !categoryMapping.has(c))
  const unmappedIncomeSources = parsedData.uniqueIncomeSources.filter(
    (s) => !incomeSourceMapping.has(s)
  )

  const errors: string[] = []

  if (unmappedAccounts.length > 0) {
    errors.push(`Unmapped accounts: ${unmappedAccounts.join(', ')}`)
  }
  if (unmappedCategories.length > 0) {
    errors.push(`Unmapped categories: ${unmappedCategories.join(', ')}`)
  }
  if (unmappedIncomeSources.length > 0) {
    errors.push(`Unmapped income sources: ${unmappedIncomeSources.join(', ')}`)
  }

  return errors.length > 0 ? errors.join('\n') : null
}
