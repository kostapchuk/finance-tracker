import { describe, expect, it } from 'vitest'

import { formatDaysCount, formatOperationsCount } from './i18n'

describe('formatDaysCount', () => {
  it('uses Russian plural forms based on the count', () => {
    expect(formatDaysCount(1, 'ru')).toBe('1 день')
    expect(formatDaysCount(2, 'ru')).toBe('2 дня')
    expect(formatDaysCount(4, 'ru')).toBe('4 дня')
    expect(formatDaysCount(5, 'ru')).toBe('5 дней')
    expect(formatDaysCount(11, 'ru')).toBe('11 дней')
    expect(formatDaysCount(21, 'ru')).toBe('21 день')
  })

  it('uses English singular/plural forms based on the count', () => {
    expect(formatDaysCount(0, 'en')).toBe('0 days')
    expect(formatDaysCount(1, 'en')).toBe('1 day')
    expect(formatDaysCount(2, 'en')).toBe('2 days')
  })
})

describe('formatOperationsCount', () => {
  it('uses Russian plural forms based on the count', () => {
    expect(formatOperationsCount(1, 'ru')).toBe('1 операция')
    expect(formatOperationsCount(3, 'ru')).toBe('3 операции')
    expect(formatOperationsCount(5, 'ru')).toBe('5 операций')
    expect(formatOperationsCount(12, 'ru')).toBe('12 операций')
  })

  it('uses English singular/plural forms based on the count', () => {
    expect(formatOperationsCount(1, 'en')).toBe('1 transaction')
    expect(formatOperationsCount(3, 'en')).toBe('3 transactions')
  })
})
