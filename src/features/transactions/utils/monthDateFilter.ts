import { formatDateForInput, getEndOfMonth, getStartOfMonth } from '@/utils/date'

export interface MonthDateFilter {
  dateFilter: 'month' | 'custom'
  customDateFrom: string
  customDateTo: string
}

/**
 * Maps a dashboard-selected month to the History page's date filter.
 * The current month uses the rolling "month" filter (always up to date);
 * any other month is pinned to a custom range so navigating away from
 * "now" doesn't silently snap back to the current month.
 */
export function getMonthDateFilter(selectedMonth: Date): MonthDateFilter {
  const now = new Date()
  const isCurrentMonth =
    selectedMonth.getMonth() === now.getMonth() && selectedMonth.getFullYear() === now.getFullYear()

  return {
    dateFilter: isCurrentMonth ? 'month' : 'custom',
    customDateFrom: isCurrentMonth ? '' : formatDateForInput(getStartOfMonth(selectedMonth)),
    customDateTo: isCurrentMonth ? '' : formatDateForInput(getEndOfMonth(selectedMonth)),
  }
}
