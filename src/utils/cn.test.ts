import { describe, it, expect } from 'vitest'

import { cn } from './cn'

describe('cn', () => {
  it('merges class names using clsx', () => {
    expect(cn('flex', 'p-2')).toBe('flex p-2')
  })

  it('handles conditional classes', () => {
    const condition = false
    expect(cn('flex', condition && 'p-2', 'm-1')).toBe('flex m-1')
  })

  it('merges tailwind classes correctly', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })

  it('handles undefined and null', () => {
    expect(cn('flex', undefined, undefined, 'p-2')).toBe('flex p-2')
  })

  it('handles objects', () => {
    expect(cn({ flex: true, 'p-2': false })).toBe('flex')
  })

  it('handles arrays', () => {
    expect(cn(['flex', 'p-2'])).toBe('flex p-2')
  })
})
