import type {
  BudgetOkRow,
  BudgetOkOperationType,
  ParseError,
  ParsedImportData,
  SourceAccountInfo,
} from '../types'

/**
 * Parse a БюджетОк CSV file
 *
 * Expected format:
 * Operation type, Date,Account,Category,Subcategory,Amount, Currency,Amount_dop,Currency_dop,Comment
 * Expense,20260131,Отложенные,Food out,,27.13,Br,10.0,$,
 *
 * Notes:
 * - Category + Subcategory are combined (e.g., "Такси" + "машина" = "Такси, машина")
 * - Comments can be multi-line when quoted
 * - Header may have inconsistent spacing after commas
 */
export function parseBudgetOkCSV(csvContent: string): ParsedImportData {
  const rows: BudgetOkRow[] = []
  const errors: ParseError[] = []

  // Parse CSV handling multi-line quoted fields
  const lines = parseCSVLines(csvContent)

  // Skip header line (first line)
  for (let i = 1; i < lines.length; i++) {
    const lineNumber = i + 1 // 1-indexed for user display
    const rawLine = lines[i]

    // Skip empty lines
    if (!rawLine.trim()) continue

    try {
      const row = parseCSVLine(rawLine, lineNumber)
      if (row) {
        rows.push(row)
      }
    } catch (error) {
      errors.push({
        lineNumber,
        message: error instanceof Error ? error.message : 'Unknown error',
        rawLine: rawLine.length > 100 ? rawLine.slice(0, 100) + '...' : rawLine,
      })
    }
  }

  // Extract unique values
  const accountCurrencies = new Map<string, Map<string, number>>() // account -> currency -> count
  const uniqueCategories = new Set<string>() // Expense categories
  const uniqueIncomeSources = new Set<string>() // Income categories
  const uniqueTransferDestinations = new Set<string>()

  let incomeCount = 0
  let expenseCount = 0
  let transferCount = 0

  // Helper to track account currency
  const addAccountCurrency = (accountName: string, currency: string) => {
    if (!accountCurrencies.has(accountName)) {
      accountCurrencies.set(accountName, new Map())
    }
    const currencyMap = accountCurrencies.get(accountName)!
    currencyMap.set(currency, (currencyMap.get(currency) || 0) + 1)
  }

  for (const row of rows) {
    addAccountCurrency(row.account, row.currency)

    switch (row.operationType) {
      case 'Income':
        incomeCount++
        uniqueIncomeSources.add(row.category)
        break
      case 'Expense':
        expenseCount++
        uniqueCategories.add(row.category)
        break
      case 'transfer': {
        transferCount++
        uniqueTransferDestinations.add(row.category) // Category is destination account for transfers
        // For transfers, use currencyDop for destination account if available
        const destCurrency = row.currencyDop || row.currency
        addAccountCurrency(row.category, destCurrency)
        break
      }
    }
  }

  // Convert account currencies to SourceAccountInfo array
  const uniqueAccounts: SourceAccountInfo[] = [...accountCurrencies.entries()]
    .map(([name, currencyMap]) => {
      // Find most common currency for this account
      let maxCount = 0
      let mostCommonCurrency = ''
      for (const [currency, count] of currencyMap) {
        if (count > maxCount) {
          maxCount = count
          mostCommonCurrency = currency
        }
      }
      return { name, currency: mostCommonCurrency }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  return {
    rows,
    errors,
    uniqueAccounts,
    uniqueCategories: [...uniqueCategories].sort(),
    uniqueIncomeSources: [...uniqueIncomeSources].sort(),
    uniqueTransferDestinations: [...uniqueTransferDestinations].sort(),
    counts: {
      income: incomeCount,
      expense: expenseCount,
      transfer: transferCount,
      total: rows.length,
    },
  }
}

/**
 * Parse CSV content into lines, handling multi-line quoted fields
 */
function parseCSVLines(content: string): string[] {
  const lines: string[] = []
  let currentLine = ''
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const char = content[i]

    if (char === '"') {
      // Check for escaped quote ("")
      if (inQuotes && content[i + 1] === '"') {
        currentLine += '""'
        i++ // Skip next quote
      } else {
        inQuotes = !inQuotes
        currentLine += char
      }
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // End of line (outside quotes)
      if (currentLine.trim()) {
        lines.push(currentLine)
      }
      currentLine = ''
      // Skip \r\n pair
      if (char === '\r' && content[i + 1] === '\n') {
        i++
      }
    } else {
      currentLine += char
    }
  }

  // Don't forget the last line
  if (currentLine.trim()) {
    lines.push(currentLine)
  }

  return lines
}

/**
 * Parse a single CSV line into a BudgetOkRow
 *
 * БюджетОк exports CSV without quoting fields that contain commas (e.g., "Такси, машина").
 * To handle this, we parse from both ends:
 * - Start: operation type, date, account (3 fields - reliable)
 * - End: comment, currency_dop, amount_dop, currency, amount (5 fields from end)
 * - Middle: everything else is category (may contain commas)
 */
function parseCSVLine(line: string, lineNumber: number): BudgetOkRow | null {
  const fields = parseCSVFields(line)

  if (fields.length < 9) {
    throw new Error(`Invalid line: expected at least 9 fields, got ${fields.length}`)
  }

  // Parse from start (3 reliable fields)
  const operationTypeRaw = fields[0].trim()
  const dateRaw = fields[1].trim()
  const account = fields[2].trim()

  // Parse from end (5 fields: amount, currency, amount_dop, currency_dop, comment)
  // Comment may be empty, so we work backwards
  const comment = (fields.at(-1) ?? '').trim()
  const currencyDop = (fields.at(-2) ?? '').trim()
  const amountDopRaw = (fields.at(-3) ?? '').trim()
  const currency = (fields.at(-4) ?? '').trim()
  const amountRaw = (fields.at(-5) ?? '').trim()

  // Everything in the middle (indices 3 to length-6) is category (may include commas)
  // Also includes the subcategory field which we merge into category
  const middleFields = fields.slice(3, -5)
  const category = middleFields
    .map((f) => f.trim())
    .filter((f) => f !== '') // Remove empty subcategory fields
    .join(', ')

  // Validate operation type
  const operationType = parseOperationType(operationTypeRaw)
  if (!operationType) {
    throw new Error(`Invalid operation type: "${operationTypeRaw}"`)
  }

  // Parse date (format: YYYYMMDD)
  const date = parseDate(dateRaw)
  if (!date) {
    throw new Error(`Invalid date format: "${dateRaw}"`)
  }

  // Parse amount
  const amount = parseAmount(amountRaw)
  if (amount === null || amount < 0) {
    throw new Error(`Invalid amount: "${amountRaw}"`)
  }

  // Parse optional secondary amount
  const amountDop = amountDopRaw ? parseAmount(amountDopRaw) : null

  return {
    operationType,
    date,
    account,
    category,
    amount,
    currency,
    amountDop,
    currencyDop: currencyDop || null,
    comment: comment || '',
    lineNumber,
  }
}

/**
 * Parse CSV fields handling quoted values with commas and newlines
 */
function parseCSVFields(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      // Check for escaped quote ("")
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++ // Skip next quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += char
    }
  }

  fields.push(current) // Push the last field

  return fields
}

/**
 * Parse operation type string to typed value
 */
function parseOperationType(value: string): BudgetOkOperationType | null {
  const normalized = value.toLowerCase().trim()

  if (normalized === 'income') return 'Income'
  if (normalized === 'expense') return 'Expense'
  if (normalized === 'transfer') return 'transfer'

  return null
}

/**
 * Parse date in YYYYMMDD format
 */
function parseDate(value: string): Date | null {
  const trimmed = value.trim()
  if (trimmed.length !== 8) return null

  const year = parseInt(trimmed.slice(0, 4), 10)
  const month = parseInt(trimmed.slice(4, 6), 10) - 1 // 0-indexed
  const day = parseInt(trimmed.slice(6, 8), 10)

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null
  if (month < 0 || month > 11 || day < 1 || day > 31) return null

  const date = new Date(year, month, day, 12, 0, 0) // Noon to avoid timezone issues

  // Validate the date is real (e.g., Feb 30 would roll over)
  if (date.getMonth() !== month || date.getDate() !== day) return null

  return date
}

/**
 * Parse amount string to number
 */
function parseAmount(value: string): number | null {
  if (!value || value.trim() === '') return null

  const cleaned = value.trim().replace(',', '.')
  const amount = parseFloat(cleaned)

  if (isNaN(amount)) return null

  return amount
}

/**
 * Validate that a file is a valid CSV and within size limits
 */
export function validateImportFile(file: File): string | null {
  const MAX_SIZE = 5 * 1024 * 1024 // 5MB

  if (file.size > MAX_SIZE) {
    return 'File too large (max 5MB)'
  }

  if (!file.name.toLowerCase().endsWith('.csv')) {
    return 'File must be a CSV file'
  }

  return null
}
