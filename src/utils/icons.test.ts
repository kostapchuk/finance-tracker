import { Circle, Banknote, Wallet } from 'lucide-react'
import { describe, it, expect } from 'vitest'

import { getIcon } from './icons'

describe('getIcon', () => {
  it('should return the correct icon for a known name', () => {
    expect(getIcon('Banknote')).toBe(Banknote)
    expect(getIcon('Circle')).toBe(Circle)
    expect(getIcon('Wallet')).toBe(Wallet)
  })

  it('should return Circle fallback for unknown icon names', () => {
    expect(getIcon('UnknownIcon')).toBe(Circle)
  })

  it('should return Circle fallback for undefined icon names', () => {
    expect(getIcon(undefined)).toBe(Circle)
  })

  it('should return custom fallback when provided', () => {
    expect(getIcon('UnknownIcon', Wallet)).toBe(Wallet)
    expect(getIcon(undefined, Banknote)).toBe(Banknote)
  })
})
