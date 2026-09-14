import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMonthDateFilter } from './monthDateFilter'

describe('getMonthDateFilter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 14)) // 2026-09-14
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses the rolling "month" filter when the selected month is the current month', () => {
    const selectedMonth = new Date(2026, 8, 1)

    expect(getMonthDateFilter(selectedMonth)).toEqual({
      dateFilter: 'month',
      customDateFrom: '',
      customDateTo: '',
    })
  })

  it('uses a custom range pinned to the selected month when it is not the current month', () => {
    const selectedMonth = new Date(2026, 5, 10) // June 2026

    expect(getMonthDateFilter(selectedMonth)).toEqual({
      dateFilter: 'custom',
      customDateFrom: '2026-06-01',
      customDateTo: '2026-06-30',
    })
  })

  it('treats the same month in a different year as not current', () => {
    const selectedMonth = new Date(2025, 8, 5) // September 2025

    expect(getMonthDateFilter(selectedMonth)).toEqual({
      dateFilter: 'custom',
      customDateFrom: '2025-09-01',
      customDateTo: '2025-09-30',
    })
  })
})
