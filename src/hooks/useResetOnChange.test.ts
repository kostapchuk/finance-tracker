import { renderHook, act } from '@testing-library/react'
import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'

import { useResetOnChange } from './useResetOnChange'

describe('useResetOnChange', () => {
  it('calls reset on mount, like useEffect does', () => {
    const reset = vi.fn()
    renderHook(() => useResetOnChange(['a'], reset))
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('does not call reset again when deps are unchanged across renders', () => {
    const reset = vi.fn()
    const { rerender } = renderHook(({ deps }) => useResetOnChange(deps, reset), {
      initialProps: { deps: ['a', 1] as unknown[] },
    })

    rerender({ deps: ['a', 1] })
    rerender({ deps: ['a', 1] })

    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('calls reset once when a dep changes', () => {
    const reset = vi.fn()
    const { rerender } = renderHook(({ deps }) => useResetOnChange(deps, reset), {
      initialProps: { deps: ['a'] as unknown[] },
    })
    reset.mockClear()

    rerender({ deps: ['b'] })
    expect(reset).toHaveBeenCalledTimes(1)

    // Stays settled on the new deps.
    rerender({ deps: ['b'] })
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('detects changes by reference, matching useEffect dep semantics', () => {
    const reset = vi.fn()
    const first = { id: 1 }
    const second = { id: 1 }

    const { rerender } = renderHook(({ deps }) => useResetOnChange(deps, reset), {
      initialProps: { deps: [first] as unknown[] },
    })
    reset.mockClear()

    // Same value, different identity - should reset, like useEffect would.
    rerender({ deps: [second] })
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('treats NaN as unchanged, matching Object.is semantics', () => {
    const reset = vi.fn()
    const { rerender } = renderHook(({ deps }) => useResetOnChange(deps, reset), {
      initialProps: { deps: [NaN] as unknown[] },
    })
    reset.mockClear()

    rerender({ deps: [NaN] })
    expect(reset).not.toHaveBeenCalled()
  })

  it('calls reset when the dep list length changes', () => {
    const reset = vi.fn()
    const { rerender } = renderHook(({ deps }) => useResetOnChange(deps, reset), {
      initialProps: { deps: ['a'] as unknown[] },
    })
    reset.mockClear()

    rerender({ deps: ['a', 'b'] })
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('applies the reset within the same commit, without an intermediate frame', () => {
    const observed: string[] = []

    const { result, rerender } = renderHook(
      ({ entity }: { entity: { name: string } }) => {
        const [name, setName] = useState(entity.name)
        useResetOnChange([entity], () => setName(entity.name))
        observed.push(name)
        return name
      },
      { initialProps: { entity: { name: 'first' } } }
    )

    expect(result.current).toBe('first')

    rerender({ entity: { name: 'second' } })

    // The committed value is the new one; 'second' is never missing from the
    // render output the user actually sees.
    expect(result.current).toBe('second')
    expect(observed.at(-1)).toBe('second')
  })

  it('supports resetting several state values at once', () => {
    const { result, rerender } = renderHook(
      ({ entity }: { entity: { name: string; color: string } | null }) => {
        const [name, setName] = useState(entity?.name ?? '')
        const [color, setColor] = useState(entity?.color ?? '')

        useResetOnChange([entity], () => {
          setName(entity?.name ?? '')
          setColor(entity?.color ?? '')
        })

        return { name, color }
      },
      {
        initialProps: {
          entity: { name: 'Cash', color: 'red' } as { name: string; color: string } | null,
        },
      }
    )

    expect(result.current).toEqual({ name: 'Cash', color: 'red' })

    rerender({ entity: { name: 'Bank', color: 'blue' } })
    expect(result.current).toEqual({ name: 'Bank', color: 'blue' })

    // Clearing the entity (e.g. switching the dialog to "create") empties the form.
    act(() => {
      rerender({ entity: null })
    })
    expect(result.current).toEqual({ name: '', color: '' })
  })
})
