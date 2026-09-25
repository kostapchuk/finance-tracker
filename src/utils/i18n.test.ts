import { afterEach, describe, expect, it } from 'vitest'

import {
  criticalTranslations,
  getLanguage,
  getStoredLanguage,
  setLanguage,
  setStoredLanguage,
  t,
  tc,
  translations,
} from './i18n'

afterEach(() => {
  localStorage.clear()
  setLanguage('ru')
})

describe('translations', () => {
  it('defines the same keys for every language', () => {
    expect(Object.keys(translations.ru).toSorted()).toEqual(Object.keys(translations.en).toSorted())
    expect(Object.keys(criticalTranslations.ru).toSorted()).toEqual(
      Object.keys(criticalTranslations.en).toSorted()
    )
  })

  it('has no empty strings', () => {
    for (const lang of ['en', 'ru'] as const) {
      for (const [key, value] of Object.entries(translations[lang])) {
        expect(value, `${lang}.${key}`).not.toBe('')
      }
    }
  })
})

describe('language storage', () => {
  it('defaults to Russian when nothing is stored', () => {
    expect(getStoredLanguage()).toBe('ru')
  })

  it('round-trips the stored language', () => {
    setStoredLanguage('en')
    expect(getStoredLanguage()).toBe('en')
  })

  it('setLanguage updates both the current and the stored language', () => {
    setLanguage('en')
    expect(getLanguage()).toBe('en')
    expect(getStoredLanguage()).toBe('en')
  })
})

describe('t / tc', () => {
  it('translates into the current language', () => {
    setLanguage('en')
    expect(t('save')).toBe('Save')
    expect(tc('save')).toBe('Save')

    setLanguage('ru')
    expect(t('save')).toBe(translations.ru.save)
    expect(tc('save')).toBe(criticalTranslations.ru.save)
    expect(t('save')).not.toBe('Save')
  })
})
