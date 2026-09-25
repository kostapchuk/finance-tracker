import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { useLanguage } from './useLanguage'

afterEach(() => {
  localStorage.clear()
})

describe('useLanguage', () => {
  it('switches language, persists it and re-renders every subscriber', () => {
    const first = renderHook(() => useLanguage())
    const second = renderHook(() => useLanguage())

    act(() => first.result.current.setLanguage('en'))

    expect(first.result.current.language).toBe('en')
    expect(second.result.current.language).toBe('en')
    expect(second.result.current.t('save')).toBe('Save')
    expect(document.documentElement.lang).toBe('en')
    expect(localStorage.getItem('finance-tracker-language')).toBe('en')

    act(() => second.result.current.setLanguage('ru'))

    expect(first.result.current.language).toBe('ru')
    expect(first.result.current.t('save')).not.toBe('Save')
  })

  it('stops notifying unmounted subscribers', () => {
    const first = renderHook(() => useLanguage())
    const second = renderHook(() => useLanguage())
    second.unmount()

    act(() => first.result.current.setLanguage('en'))

    expect(first.result.current.language).toBe('en')
  })
})
