import { describe, expect, it } from 'vitest'

import { buildDonutGradient } from './chart'

describe('buildDonutGradient', () => {
  it('sizes each arc by its share of the total', () => {
    expect(
      buildDonutGradient([
        { value: 30, color: '#f00' },
        { value: 10, color: '#0f0' },
      ])
    ).toBe('conic-gradient(#f00 0deg 270deg, #0f0 270deg 360deg)')
  })

  it('renders a single slice as a full circle', () => {
    expect(buildDonutGradient([{ value: 5, color: '#00f' }])).toBe(
      'conic-gradient(#00f 0deg 360deg)'
    )
  })
})
