import { describe, it, expect } from 'vitest'

import { PRESET_COLORS, getRandomColor } from './colors'

describe('colors utilities', () => {
  describe('PRESET_COLORS', () => {
    it('is an array of strings', () => {
      expect(Array.isArray(PRESET_COLORS)).toBe(true)
      PRESET_COLORS.forEach((color) => {
        expect(typeof color).toBe('string')
      })
    })

    it('contains valid hex color codes', () => {
      const hexColorPattern = /^#[0-9a-fA-F]{6}$/
      PRESET_COLORS.forEach((color) => {
        expect(color).toMatch(hexColorPattern)
      })
    })

    it('contains at least 10 colors', () => {
      expect(PRESET_COLORS.length).toBeGreaterThanOrEqual(10)
    })

    it('has unique colors', () => {
      const uniqueColors = new Set(PRESET_COLORS)
      expect(uniqueColors.size).toBe(PRESET_COLORS.length)
    })

    it('includes common colors (red, green, blue)', () => {
      expect(PRESET_COLORS).toContain('#ef4444')
      expect(PRESET_COLORS).toContain('#22c55e')
      expect(PRESET_COLORS).toContain('#3b82f6')
    })

    it('includes all expected preset colors', () => {
      const expectedColors = [
        '#ef4444',
        '#f97316',
        '#f59e0b',
        '#eab308',
        '#84cc16',
        '#22c55e',
        '#10b981',
        '#14b8a6',
        '#06b6d4',
        '#0ea5e9',
        '#3b82f6',
        '#6366f1',
        '#8b5cf6',
        '#a855f7',
        '#d946ef',
        '#ec4899',
        '#f43f5e',
        '#78716c',
      ]
      expect(PRESET_COLORS).toEqual(expectedColors)
    })
  })

  describe('getRandomColor', () => {
    it('returns a string', () => {
      const color = getRandomColor()
      expect(typeof color).toBe('string')
    })

    it('returns a valid hex color code', () => {
      const hexColorPattern = /^#[0-9a-fA-F]{6}$/
      const color = getRandomColor()
      expect(color).toMatch(hexColorPattern)
    })

    it('returns a color from PRESET_COLORS', () => {
      const color = getRandomColor()
      expect(PRESET_COLORS).toContain(color)
    })

    it('returns different colors on multiple calls (probabilistic)', () => {
      const colors = new Set<string>()
      for (let i = 0; i < 50; i++) {
        colors.add(getRandomColor())
      }
      expect(colors.size).toBeGreaterThan(1)
    })

    it('eventually covers all preset colors with enough calls', () => {
      const foundColors = new Set<string>()
      for (let i = 0; i < 500; i++) {
        foundColors.add(getRandomColor())
      }
      expect(foundColors.size).toBe(PRESET_COLORS.length)
    })
  })
})
