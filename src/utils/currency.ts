export interface CurrencyInfo {
  code: string
  name: string
  symbol: string
}

export const COMMON_CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'BYN', name: 'Belarusian Ruble', symbol: 'Br' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴' },
  { code: 'BTC', name: 'Bitcoin', symbol: '₿' },
  { code: 'ETH', name: 'Ethereum', symbol: 'Ξ' },
  { code: 'USDT', name: 'Tether', symbol: '₮' },
]

// Store for custom currencies - will be populated from the store
let customCurrenciesCache: CurrencyInfo[] = []

export function setCustomCurrencies(currencies: CurrencyInfo[]) {
  customCurrenciesCache = currencies
}

export function getAllCurrencies(): CurrencyInfo[] {
  // Custom currencies take precedence (appear first and can override common)
  const customCodes = new Set(customCurrenciesCache.map((c) => c.code))
  const filteredCommon = COMMON_CURRENCIES.filter((c) => !customCodes.has(c.code))
  return [...customCurrenciesCache, ...filteredCommon]
}

export function formatCurrency(amount: number, currency: string): string {
  const allCurrencies = getAllCurrencies()
  const currencyInfo = allCurrencies.find((c) => c.code === currency)
  const symbol = currencyInfo?.symbol || currency

  if (currency === 'BTC' || currency === 'ETH') {
    return `${amount.toFixed(8)} ${symbol}`
  }

  const formattedAmount = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${formattedAmount} ${symbol}`
}

export function getCurrencySymbol(currency: string): string {
  const allCurrencies = getAllCurrencies()
  const currencyInfo = allCurrencies.find((c) => c.code === currency)
  return currencyInfo?.symbol || currency
}

/**
 * Get the appropriate sign for an amount
 * Returns '+' for positive, '-' for negative, '' for zero
 */
export function getAmountSign(amount: number): string {
  if (amount === 0) return ''
  return amount > 0 ? '+' : '-'
}

/**
 * Get the appropriate color class for an amount
 * Returns 'text-success' for positive, 'text-destructive' for negative, 'text-foreground' for zero
 */
export function getAmountColorClass(amount: number): string {
  if (amount === 0) return 'text-foreground'
  return amount > 0 ? 'text-success' : 'text-destructive'
}

/**
 * Format currency with sign (no sign for zero)
 * Format: "- 100.00 €" or "+ 100.00 €"
 */
export function formatCurrencyWithSign(amount: number, currency: string): string {
  const formatted = formatCurrency(Math.abs(amount), currency)
  const sign = getAmountSign(amount)
  return sign ? `${sign} ${formatted}` : formatted
}

/**
 * Resolve the amount to store as a transaction's `mainCurrencyAmount`, for a
 * transaction that has both an "entry" amount (e.g. a loan's own currency)
 * and an "account" amount. Reused wherever a transaction crosses three
 * potentially different currencies (entry, account, main) so totals can be
 * summed in the main currency instead of silently mixing currencies.
 *
 * - If the account is already in the main currency, `amount` (the applied
 *   account-currency value) already IS the main-currency value, so no
 *   separate field is needed (`undefined`).
 * - Else if the entry currency is the main currency, `entryAmount` already
 *   IS the main-currency value.
 * - Otherwise neither field is in the main currency, so the caller must
 *   supply a manually-entered conversion (`manualAmount`).
 */
export function resolveMainCurrencyAmount({
  entryCurrency,
  accountCurrency,
  mainCurrency,
  entryAmount,
  manualAmount,
}: {
  entryCurrency: string
  accountCurrency: string | undefined
  mainCurrency: string
  entryAmount: number
  manualAmount: number | undefined
}): number | undefined {
  if (accountCurrency === mainCurrency) return undefined
  if (entryCurrency === mainCurrency) return entryAmount
  return manualAmount
}
