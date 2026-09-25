import { describe, expect, it } from 'vitest'

import {
  addMonths,
  formatDate,
  formatDateForInput,
  formatDateTime,
  getEndOfMonth,
  getEndOfYear,
  getStartOfMonth,
  getStartOfWeek,
  getStartOfYear,
} from './date'

describe('addMonths', () => {
  it('steps forward and back within a year', () => {
    const march = new Date(2026, 2, 15)

    expect(addMonths(march, 1)).toEqual(new Date(2026, 3, 1))
    expect(addMonths(march, -1)).toEqual(new Date(2026, 1, 1))
  })

  it('always anchors to the first of the month', () => {
    expect(addMonths(new Date(2026, 4, 23), 0)).toEqual(new Date(2026, 4, 1))
  })

  it('does not overflow when the source day is missing from the target month', () => {
    // Jul 31 -> Jun has only 30 days. Date#setMonth would roll over to Jul 1.
    const jul31 = new Date(2026, 6, 31)

    expect(addMonths(jul31, -1)).toEqual(new Date(2026, 5, 1))
    expect(addMonths(jul31, -5)).toEqual(new Date(2026, 1, 1))
  })

  it('produces six distinct months when building a trailing 6-month window', () => {
    const jul31 = new Date(2026, 6, 31)
    const months = [5, 4, 3, 2, 1, 0].map((i) => {
      const d = addMonths(jul31, -i)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })

    expect(months).toEqual(['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'])
    expect(new Set(months).size).toBe(6)
  })

  it('crosses year boundaries in both directions', () => {
    expect(addMonths(new Date(2026, 0, 31), -1)).toEqual(new Date(2025, 11, 1))
    expect(addMonths(new Date(2026, 11, 31), 1)).toEqual(new Date(2027, 0, 1))
  })

  it('handles the February leap-year edge', () => {
    expect(addMonths(new Date(2024, 0, 31), 1)).toEqual(new Date(2024, 1, 1))
    expect(addMonths(new Date(2026, 0, 31), 1)).toEqual(new Date(2026, 1, 1))
  })
})

describe('formatDateForInput', () => {
  it('zero-pads month and day', () => {
    expect(formatDateForInput(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(formatDateForInput(new Date(2026, 11, 25))).toBe('2026-12-25')
  })
})

describe('formatDate / formatDateTime', () => {
  it('include the year and day of the date', () => {
    const date = new Date(2026, 2, 7, 14, 30)

    expect(formatDate(date)).toContain('2026')
    expect(formatDate(date)).toContain('7')
    expect(formatDateTime(date)).toContain('2026')
    expect(formatDateTime(date)).toContain('30')
  })
})

describe('month and year boundaries', () => {
  const date = new Date(2024, 1, 15, 10)

  it('returns the first and last moment of the month', () => {
    expect(getStartOfMonth(date)).toEqual(new Date(2024, 1, 1))
    expect(getEndOfMonth(date)).toEqual(new Date(2024, 1, 29, 23, 59, 59, 999))
  })

  it('returns the first and last moment of the year', () => {
    expect(getStartOfYear(date)).toEqual(new Date(2024, 0, 1))
    expect(getEndOfYear(date)).toEqual(new Date(2024, 11, 31, 23, 59, 59, 999))
  })

  it('defaults to the current date', () => {
    const now = new Date()

    expect(getStartOfMonth().getMonth()).toBe(now.getMonth())
    expect(getEndOfMonth().getMonth()).toBe(now.getMonth())
    expect(getStartOfYear().getFullYear()).toBe(now.getFullYear())
    expect(getEndOfYear().getFullYear()).toBe(now.getFullYear())
    expect(getStartOfWeek().getDay()).toBe(1)
  })
})

describe('getStartOfWeek', () => {
  it('returns the Monday of the week', () => {
    // Wednesday 2026-09-23
    expect(getStartOfWeek(new Date(2026, 8, 23, 18))).toEqual(new Date(2026, 8, 21))
  })

  it('treats Sunday as the end of the week', () => {
    // Sunday 2026-09-27
    expect(getStartOfWeek(new Date(2026, 8, 27))).toEqual(new Date(2026, 8, 21))
  })
})
