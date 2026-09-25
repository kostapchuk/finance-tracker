import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { APP_URL, DEFAULT_LANGUAGE, detectLanguage, translations } from './i18n.mjs'

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

describe('static page language', () => {
  it('ships Russian markup so there is no English flash before JS runs', () => {
    expect(html).toMatch(/<html lang="ru">/)
    expect(html).toMatch(/data-lang="ru" aria-pressed="true"/)
    expect(html).toMatch(/data-lang="en" aria-pressed="false"/)
    expect(html).toContain(`<title>${translations.ru.metaTitle}</title>`)
    for (const m of html.matchAll(/data-i18n="([^"]+)"[^>]*>([^<]*)</g)) {
      expect(m[2].replaceAll(/\s+/g, ' ').trim(), m[1]).toBe(translations.ru[m[1]])
    }
  })
})

describe('detectLanguage', () => {
  it('prefers a stored choice', () => {
    expect(detectLanguage('ru')).toBe('ru')
    expect(detectLanguage('en')).toBe('en')
  })

  it('defaults to Russian when nothing valid is stored', () => {
    expect(DEFAULT_LANGUAGE).toBe('ru')
    expect(detectLanguage(null)).toBe('ru')
    expect(detectLanguage('fr')).toBe('ru')
  })
})
