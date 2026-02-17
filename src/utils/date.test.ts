import { describe, it, expect } from 'vitest'

import {
  formatDate,
  formatDateTime,
  formatDateForInput,
  getStartOfMonth,
  getEndOfMonth,
  getStartOfYear,
  getEndOfYear,
  getStartOfWeek,
} from './date'

describe('date utilities', () => {
  describe('formatDate', () => {
    it('formats date with year, month, and day', () => {
      const date = new Date(2024, 5, 15)
      const result = formatDate(date)
      expect(result).toContain('2024')
      expect(result).toContain('15')
    })

    it('formats single digit day correctly', () => {
      const date = new Date(2024, 0, 5)
      const result = formatDate(date)
      expect(result).toContain('5')
    })

    it('handles year boundary dates', () => {
      const date = new Date(2024, 11, 31)
      const result = formatDate(date)
      expect(result).toContain('2024')
      expect(result).toContain('31')
    })
  })

  describe('formatDateTime', () => {
    it('formats date with time', () => {
      const date = new Date(2024, 5, 15, 14, 30)
      const result = formatDateTime(date)
      expect(result).toContain('2024')
      expect(result).toContain('15')
    })

    it('includes hour and minute', () => {
      const date = new Date(2024, 5, 15, 9, 5)
      const result = formatDateTime(date)
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })
  })

  describe('formatDateForInput', () => {
    it('formats date as YYYY-MM-DD', () => {
      const date = new Date(2024, 5, 15)
      const result = formatDateForInput(date)
      expect(result).toBe('2024-06-15')
    })

    it('pads single digit month with zero', () => {
      const date = new Date(2024, 0, 15)
      const result = formatDateForInput(date)
      expect(result).toBe('2024-01-15')
    })

    it('pads single digit day with zero', () => {
      const date = new Date(2024, 5, 5)
      const result = formatDateForInput(date)
      expect(result).toBe('2024-06-05')
    })

    it('handles year boundary correctly', () => {
      const date = new Date(2024, 11, 31)
      const result = formatDateForInput(date)
      expect(result).toBe('2024-12-31')
    })

    it('handles first day of year', () => {
      const date = new Date(2024, 0, 1)
      const result = formatDateForInput(date)
      expect(result).toBe('2024-01-01')
    })
  })

  describe('getStartOfMonth', () => {
    it('returns first day of month at midnight', () => {
      const date = new Date(2024, 5, 15, 14, 30, 45)
      const result = getStartOfMonth(date)
      expect(result.getFullYear()).toBe(2024)
      expect(result.getMonth()).toBe(5)
      expect(result.getDate()).toBe(1)
      expect(result.getHours()).toBe(0)
      expect(result.getMinutes()).toBe(0)
      expect(result.getSeconds()).toBe(0)
    })

    it('uses current date when no argument provided', () => {
      const result = getStartOfMonth()
      expect(result.getDate()).toBe(1)
      expect(result.getHours()).toBe(0)
    })

    it('handles December correctly', () => {
      const date = new Date(2024, 11, 15)
      const result = getStartOfMonth(date)
      expect(result.getMonth()).toBe(11)
      expect(result.getDate()).toBe(1)
    })

    it('handles January correctly', () => {
      const date = new Date(2024, 0, 15)
      const result = getStartOfMonth(date)
      expect(result.getMonth()).toBe(0)
      expect(result.getDate()).toBe(1)
    })
  })

  describe('getEndOfMonth', () => {
    it('returns last day of month at end of day', () => {
      const date = new Date(2024, 5, 15)
      const result = getEndOfMonth(date)
      expect(result.getFullYear()).toBe(2024)
      expect(result.getMonth()).toBe(5)
      expect(result.getDate()).toBe(30)
      expect(result.getHours()).toBe(23)
      expect(result.getMinutes()).toBe(59)
      expect(result.getSeconds()).toBe(59)
      expect(result.getMilliseconds()).toBe(999)
    })

    it('handles February in non-leap year', () => {
      const date = new Date(2023, 1, 15)
      const result = getEndOfMonth(date)
      expect(result.getDate()).toBe(28)
    })

    it('handles February in leap year', () => {
      const date = new Date(2024, 1, 15)
      const result = getEndOfMonth(date)
      expect(result.getDate()).toBe(29)
    })

    it('handles December correctly', () => {
      const date = new Date(2024, 11, 15)
      const result = getEndOfMonth(date)
      expect(result.getDate()).toBe(31)
    })

    it('handles months with 30 days', () => {
      const date = new Date(2024, 3, 15)
      const result = getEndOfMonth(date)
      expect(result.getDate()).toBe(30)
    })

    it('handles months with 31 days', () => {
      const date = new Date(2024, 0, 15)
      const result = getEndOfMonth(date)
      expect(result.getDate()).toBe(31)
    })

    it('uses current date when no argument provided', () => {
      const result = getEndOfMonth()
      expect(result.getHours()).toBe(23)
      expect(result.getMinutes()).toBe(59)
      expect(result.getSeconds()).toBe(59)
    })
  })

  describe('getStartOfYear', () => {
    it('returns January 1st of the year', () => {
      const date = new Date(2024, 5, 15)
      const result = getStartOfYear(date)
      expect(result.getFullYear()).toBe(2024)
      expect(result.getMonth()).toBe(0)
      expect(result.getDate()).toBe(1)
      expect(result.getHours()).toBe(0)
      expect(result.getMinutes()).toBe(0)
      expect(result.getSeconds()).toBe(0)
    })

    it('uses current date when no argument provided', () => {
      const result = getStartOfYear()
      expect(result.getMonth()).toBe(0)
      expect(result.getDate()).toBe(1)
    })
  })

  describe('getEndOfYear', () => {
    it('returns December 31st at end of day', () => {
      const date = new Date(2024, 5, 15)
      const result = getEndOfYear(date)
      expect(result.getFullYear()).toBe(2024)
      expect(result.getMonth()).toBe(11)
      expect(result.getDate()).toBe(31)
      expect(result.getHours()).toBe(23)
      expect(result.getMinutes()).toBe(59)
      expect(result.getSeconds()).toBe(59)
      expect(result.getMilliseconds()).toBe(999)
    })

    it('uses current date when no argument provided', () => {
      const result = getEndOfYear()
      expect(result.getMonth()).toBe(11)
      expect(result.getDate()).toBe(31)
    })
  })

  describe('getStartOfWeek', () => {
    it('returns Monday for a Wednesday', () => {
      const date = new Date(2024, 5, 12)
      const result = getStartOfWeek(date)
      expect(result.getDate()).toBe(10)
      expect(result.getDay()).toBe(1)
    })

    it('returns Monday for a Sunday', () => {
      const date = new Date(2024, 5, 16)
      const result = getStartOfWeek(date)
      expect(result.getDate()).toBe(10)
      expect(result.getDay()).toBe(1)
    })

    it('returns same day for Monday', () => {
      const date = new Date(2024, 5, 10)
      const result = getStartOfWeek(date)
      expect(result.getDate()).toBe(10)
      expect(result.getDay()).toBe(1)
    })

    it('sets time to midnight', () => {
      const date = new Date(2024, 5, 12, 14, 30, 45)
      const result = getStartOfWeek(date)
      expect(result.getHours()).toBe(0)
      expect(result.getMinutes()).toBe(0)
      expect(result.getSeconds()).toBe(0)
    })

    it('uses current date when no argument provided', () => {
      const result = getStartOfWeek()
      expect(result.getDay()).toBe(1)
    })
  })
})
