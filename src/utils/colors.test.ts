import { afterEach, describe, expect, it, vi } from 'vitest'

import { PRESET_COLORS, getRandomColor } from './colors'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getRandomColor', () => {
  it('returns a preset color picked by Math.random', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(getRandomColor()).toBe(PRESET_COLORS[0])

    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    expect(getRandomColor()).toBe(PRESET_COLORS.at(-1))
  })

  it('only returns hex colors from the preset list', () => {
    for (let i = 0; i < 20; i++) {
      expect(PRESET_COLORS).toContain(getRandomColor())
    }
  })
})
