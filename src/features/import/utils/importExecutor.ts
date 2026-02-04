import { db } from '@/database/db'
import type { Transaction } from '@/database/types'
import type { BudgetOkRow, AccountBalanceDelta, ImportResult, SourceAccountInfo } from '../types'

interface ExecuteImportParams {
  rows: BudgetOkRow[]
  accountMapping: Map<string, number>
  categoryMapping: Map<string, number>
  incomeSourceMapping: Map<string, number>
  accounts: Array<{ id?: number; currency: string }>
}

/**
 * Execute the import: create transactions and update account balances
 * Uses a Dexie transaction for atomicity
 */
export async function executeImport(params: ExecuteImportParams): Promise<ImportResult> {
  const { rows, accountMapping, categoryMapping, incomeSourceMapping, accounts } = params

  // Build account currency lookup
  const accountCurrencyMap = new Map<number, string>()
  for (const acc of accounts) {
    if (acc.id) {
      accountCurrencyMap.set(acc.id, acc.currency)
    }
  }

  try {
    // Transform rows to transactions and calculate balance deltas
    const { transactions, balanceDeltas } = transformRowsToTransactions(
      rows,
      accountMapping,
      categoryMapping,
      incomeSourceMapping,
      accountCurrencyMap
    )

    // Execute in a single transaction for atomicity
    await db.transaction('rw', [db.transactions, db.accounts], async () => {
      // Bulk add all transactions
      await db.transactions.bulkAdd(transactions)

      // Update account balances
      for (const delta of balanceDeltas) {
        await db.accounts
          .where('id')
          .equals(delta.accountId)
          .modify((account) => {
            account.balance += delta.delta
            account.updatedAt = new Date()
          })
      }
    })

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
  transactions: Omit<Transaction, 'id'>[]
  balanceDeltas: AccountBalanceDelta[]
}

/**
 * Transform БюджетОк rows to app transactions and calculate balance deltas
 */
function transformRowsToTransactions(
  rows: BudgetOkRow[],
  accountMapping: Map<string, number>,
  categoryMapping: Map<string, number>,
  incomeSourceMapping: Map<string, number>,
  accountCurrencyMap: Map<number, string>
): TransformResult {
  const transactions: Omit<Transaction, 'id'>[] = []
  const balanceDeltaMap = new Map<number, number>() // accountId -> total delta

  const now = new Date()

  for (const row of rows) {
    const accountId = accountMapping.get(row.account)!
    const accountCurrency = accountCurrencyMap.get(accountId)!

    switch (row.operationType) {
      case 'Income': {
        const incomeSourceId = incomeSourceMapping.get(row.category)!

        // Determine which amount to use for balance update
        const balanceAmount = determineBalanceAmount(row, accountCurrency)

        transactions.push({
          type: 'income',
          amount: balanceAmount,
          currency: accountCurrency,
          date: row.date,
          comment: row.comment || undefined,
          accountId,
          incomeSourceId,
          createdAt: now,
          updatedAt: now,
        })

        // Income adds to account balance
        addDelta(balanceDeltaMap, accountId, balanceAmount)
        break
      }

      case 'Expense': {
        const categoryId = categoryMapping.get(row.category)!

        // Determine which amount to use for balance update
        const balanceAmount = determineBalanceAmount(row, accountCurrency)

        transactions.push({
          type: 'expense',
          amount: balanceAmount,
          currency: accountCurrency,
          date: row.date,
          comment: row.comment || undefined,
          accountId,
          categoryId,
          createdAt: now,
          updatedAt: now,
        })

        // Expense subtracts from account balance
        addDelta(balanceDeltaMap, accountId, -balanceAmount)
        break
      }

      case 'transfer': {
        // For transfers, category is the destination account name
        const toAccountId = accountMapping.get(row.category)!
        const toAccountCurrency = accountCurrencyMap.get(toAccountId)!

        // Determine amounts for source and destination
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
          createdAt: now,
          updatedAt: now,
        })

        // Transfer subtracts from source, adds to destination
        addDelta(balanceDeltaMap, accountId, -fromAmount)
        addDelta(balanceDeltaMap, toAccountId, toAmount)
        break
      }
    }
  }

  // Convert map to array
  const balanceDeltas: AccountBalanceDelta[] = []
  for (const [accountId, delta] of balanceDeltaMap) {
    if (delta !== 0) {
      balanceDeltas.push({ accountId, delta })
    }
  }

  return { transactions, balanceDeltas }
}

/**
 * Determine the amount to use for balance update based on account currency
 *
 * Multi-currency logic:
 * - If row.currency matches account currency, use row.amount
 * - If row.currencyDop matches account currency, use row.amountDop
 * - Otherwise, fall back to row.amount (user may need to handle manually)
 */
function determineBalanceAmount(row: BudgetOkRow, accountCurrency: string): number {
  // Normalize currencies for comparison
  const rowCurrency = normalizeCurrency(row.currency)
  const rowCurrencyDop = row.currencyDop ? normalizeCurrency(row.currencyDop) : null
  const accCurrency = normalizeCurrency(accountCurrency)

  if (rowCurrency === accCurrency) {
    return row.amount
  }

  if (rowCurrencyDop && rowCurrencyDop === accCurrency && row.amountDop !== null) {
    return row.amountDop
  }

  // Fall back to primary amount
  return row.amount
}

/**
 * Determine the "to" amount for transfers
 */
function determineToAmount(row: BudgetOkRow, toAccountCurrency: string): number {
  const rowCurrency = normalizeCurrency(row.currency)
  const rowCurrencyDop = row.currencyDop ? normalizeCurrency(row.currencyDop) : null
  const toCurrency = normalizeCurrency(toAccountCurrency)

  // For multi-currency transfers, amount_dop is typically the destination amount
  if (rowCurrencyDop && rowCurrencyDop === toCurrency && row.amountDop !== null) {
    return row.amountDop
  }

  if (rowCurrency === toCurrency) {
    return row.amount
  }

  // If no match, use amountDop if available (it's often the destination), otherwise amount
  return row.amountDop ?? row.amount
}

/**
 * Normalize currency codes for comparison
 */
function normalizeCurrency(currency: string): string {
  return currency.toUpperCase().trim()
}

/**
 * Add a delta to the balance map
 */
function addDelta(map: Map<number, number>, accountId: number, delta: number): void {
  const current = map.get(accountId) || 0
  map.set(accountId, current + delta)
}

/**
 * Validate that all mappings are complete
 * Returns error message if validation fails, null if all good
 */
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
