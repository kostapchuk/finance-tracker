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
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴' },
  { code: 'BTC', name: 'Bitcoin', symbol: '₿' },
  { code: 'ETH', name: 'Ethereum', symbol: 'Ξ' },
]

// Store for custom currencies - will be populated from the store
let customCurrenciesCache: CurrencyInfo[] = []

export function setCustomCurrencies(currencies: CurrencyInfo[]) {
  customCurrenciesCache = currencies
}

export function getAllCurrencies(): CurrencyInfo[] {
  // Custom currencies take precedence (appear first and can override common)
  const customCodes = new Set(customCurrenciesCache.map(c => c.code))
  const filteredCommon = COMMON_CURRENCIES.filter(c => !customCodes.has(c.code))
  return [...customCurrenciesCache, ...filteredCommon]
}

export function formatCurrency(amount: number, currency: string): string {
  const allCurrencies = getAllCurrencies()
  const currencyInfo = allCurrencies.find(c => c.code === currency)
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
  const currencyInfo = allCurrencies.find(c => c.code === currency)
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
