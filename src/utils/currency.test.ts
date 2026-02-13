import { describe, it, expect, beforeEach } from 'vitest'

import {
  formatCurrency,
  getCurrencySymbol,
  getAmountSign,
  getAmountColorClass,
  formatCurrencyWithSign,
  setCustomCurrencies,
  getAllCurrencies,
  COMMON_CURRENCIES,
} from './currency'

describe('currency utilities', () => {
  beforeEach(() => {
    setCustomCurrencies([])
  })

  describe('formatCurrency', () => {
    it('formats USD with $ symbol', () => {
      const result = formatCurrency(1234.56, 'USD')
      expect(result).toContain('$')
      expect(result).toMatch(/1[\s,.]234[\s,.]56/)
    })

    it('formats EUR with € symbol', () => {
      const result = formatCurrency(100, 'EUR')
      expect(result).toContain('€')
      expect(result).toMatch(/100[,.]00/)
    })

    it('formats BTC with 8 decimal places', () => {
      expect(formatCurrency(0.12345678, 'BTC')).toBe('0.12345678 ₿')
    })

    it('formats ETH with 8 decimal places', () => {
      expect(formatCurrency(1.5, 'ETH')).toBe('1.50000000 Ξ')
    })

    it('handles negative amounts', () => {
      const result = formatCurrency(-50, 'USD')
      expect(result).toContain('-')
      expect(result).toContain('$')
    })

    it('handles zero', () => {
      const result = formatCurrency(0, 'EUR')
      expect(result).toContain('€')
      expect(result).toMatch(/0[,.]00/)
    })

    it('uses currency code as fallback for unknown currencies', () => {
      const result = formatCurrency(100, 'XYZ')
      expect(result).toContain('XYZ')
    })
  })

  describe('getCurrencySymbol', () => {
    it('returns $ for USD', () => {
      expect(getCurrencySymbol('USD')).toBe('$')
    })

    it('returns € for EUR', () => {
      expect(getCurrencySymbol('EUR')).toBe('€')
    })

    it('returns ₽ for RUB', () => {
      expect(getCurrencySymbol('RUB')).toBe('₽')
    })

    it('returns currency code for unknown currencies', () => {
      expect(getCurrencySymbol('UNKNOWN')).toBe('UNKNOWN')
    })
  })

  describe('getAmountSign', () => {
    it('returns + for positive amounts', () => {
      expect(getAmountSign(100)).toBe('+')
    })

    it('returns - for negative amounts', () => {
      expect(getAmountSign(-50)).toBe('-')
    })

    it('returns empty string for zero', () => {
      expect(getAmountSign(0)).toBe('')
    })
  })

  describe('getAmountColorClass', () => {
    it('returns text-success for positive amounts', () => {
      expect(getAmountColorClass(100)).toBe('text-success')
    })

    it('returns text-destructive for negative amounts', () => {
      expect(getAmountColorClass(-50)).toBe('text-destructive')
    })

    it('returns text-foreground for zero', () => {
      expect(getAmountColorClass(0)).toBe('text-foreground')
    })
  })

  describe('formatCurrencyWithSign', () => {
    it('formats positive amount with + sign', () => {
      const result = formatCurrencyWithSign(100, 'USD')
      expect(result).toContain('+')
      expect(result).toContain('$')
    })

    it('formats negative amount with - sign', () => {
      const result = formatCurrencyWithSign(-50, 'EUR')
      expect(result).toContain('-')
      expect(result).toContain('€')
    })

    it('formats zero without sign', () => {
      const result = formatCurrencyWithSign(0, 'USD')
      expect(result).not.toMatch(/^[+-]/)
      expect(result).toContain('$')
    })
  })

  describe('setCustomCurrencies and getAllCurrencies', () => {
    it('includes custom currencies', () => {
      setCustomCurrencies([{ code: 'CUSTOM', name: 'Custom', symbol: '©' }])
      const currencies = getAllCurrencies()
      expect(currencies.find((c) => c.code === 'CUSTOM')).toEqual({
        code: 'CUSTOM',
        name: 'Custom',
        symbol: '©',
      })
    })

    it('custom currencies override common currencies with same code', () => {
      setCustomCurrencies([{ code: 'USD', name: 'Custom USD', symbol: 'CUS' }])
      const currencies = getAllCurrencies()
      const usdEntries = currencies.filter((c) => c.code === 'USD')
      expect(usdEntries).toHaveLength(1)
      expect(usdEntries[0].name).toBe('Custom USD')
    })

    it('returns only common currencies when no custom set', () => {
      expect(getAllCurrencies()).toEqual(expect.arrayContaining(COMMON_CURRENCIES))
    })
  })
})
