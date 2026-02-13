import { describe, it, expect } from 'vitest'

import { cn } from './cn'

describe('cn', () => {
  it('merges class names using clsx', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    const condition = false
    expect(cn('foo', condition && 'bar', 'baz')).toBe('foo baz')
  })

  it('merges tailwind classes correctly', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })

  it('handles undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
  })

  it('handles objects', () => {
    expect(cn({ foo: true, bar: false })).toBe('foo')
  })

  it('handles arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })
})
