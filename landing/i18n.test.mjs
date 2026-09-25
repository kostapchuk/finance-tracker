import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { APP_URL, detectLanguage, translations } from './i18n.mjs'

const html = readFileSync(path.join(import.meta.dirname, 'index.html'), 'utf8')
const usedKeys = new Set([...html.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]))

describe('landing translations', () => {
  it('defines every key used in index.html in both languages', () => {
    for (const lang of ['en', 'ru']) {
      const missing = [...usedKeys].filter((key) => !translations[lang][key])
      expect(missing, `missing ${lang} keys`).toEqual([])
    }
  })

  it('has the same set of keys in EN and RU', () => {
    expect(Object.keys(translations.ru).toSorted()).toEqual(Object.keys(translations.en).toSorted())
  })

  it('points every app link at the deployed app', () => {
    const hrefs = [...html.matchAll(/data-app-link\s+href="([^"]+)"/g)].map((m) => m[1])
    expect(hrefs.length).toBeGreaterThan(0)
    for (const href of hrefs) expect(href).toBe(APP_URL)
  })
})

describe('detectLanguage', () => {
  it('prefers a stored choice', () => {
    expect(detectLanguage('ru', ['en-US'])).toBe('ru')
    expect(detectLanguage('en', ['ru-RU'])).toBe('en')
  })

  it('picks Russian for Russian-speaking browser locales', () => {
    expect(detectLanguage(null, ['ru-RU', 'en'])).toBe('ru')
    expect(detectLanguage(null, ['be'])).toBe('ru')
  })

  it('falls back to English', () => {
    expect(detectLanguage(null, ['de-DE'])).toBe('en')
    expect(detectLanguage('fr', undefined)).toBe('en')
  })
})
