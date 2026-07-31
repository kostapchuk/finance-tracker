import { describe, expect, it } from 'vitest'

import { addMonths } from './date'

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
