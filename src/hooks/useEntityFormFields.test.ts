import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { useEntityFormFields } from './useEntityFormFields'

vi.mock('@/utils/colors', () => ({
  getRandomColor: vi.fn(() => '#abcdef'),
}))

describe('useEntityFormFields', () => {
  it('starts with empty fields and a random color', () => {
    const { result } = renderHook(() => useEntityFormFields())

    expect(result.current.name).toBe('')
    expect(result.current.color).toBe('#abcdef')
    expect(result.current.hiddenFromDashboard).toBe(false)
    expect(result.current.isLoading).toBe(false)
  })

  it('populates fields from an entity via resetFields', () => {
    const { result } = renderHook(() => useEntityFormFields())

    act(() => {
      result.current.resetFields({ name: 'Groceries', color: '#ff0000', hiddenFromDashboard: true })
    })

    expect(result.current.name).toBe('Groceries')
    expect(result.current.color).toBe('#ff0000')
    expect(result.current.hiddenFromDashboard).toBe(true)
  })

  it('clears fields and assigns a fresh random color when resetFields is called with null', () => {
    const { result } = renderHook(() => useEntityFormFields())

    act(() => {
      result.current.resetFields({ name: 'Groceries', color: '#ff0000', hiddenFromDashboard: true })
    })
    act(() => {
      result.current.resetFields()
    })

    expect(result.current.name).toBe('')
    expect(result.current.color).toBe('#abcdef')
    expect(result.current.hiddenFromDashboard).toBe(false)
  })

  it('defaults hiddenFromDashboard to false when the entity omits it', () => {
    const { result } = renderHook(() => useEntityFormFields())

    act(() => {
      result.current.resetFields({ name: 'Cash', color: '#00ff00' })
    })

    expect(result.current.hiddenFromDashboard).toBe(false)
  })

  it('exposes a settable isLoading flag', () => {
    const { result } = renderHook(() => useEntityFormFields())

    act(() => {
      result.current.setIsLoading(true)
    })

    expect(result.current.isLoading).toBe(true)
  })
})
