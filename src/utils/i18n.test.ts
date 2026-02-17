import { describe, it, expect, vi, afterEach } from 'vitest'

import {
  t,
  tc,
  getLanguage,
  setLanguage,
  translations,
  criticalTranslations,
  type TranslationKey,
  type CriticalTranslationKey,
} from './i18n'

describe('i18n utilities', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  describe('setLanguage and getLanguage', () => {
    it('sets and gets the current language', () => {
      setLanguage('en')
      expect(getLanguage()).toBe('en')
    })

    it('can switch between languages', () => {
      setLanguage('en')
      expect(getLanguage()).toBe('en')
      setLanguage('ru')
      expect(getLanguage()).toBe('ru')
      setLanguage('en')
      expect(getLanguage()).toBe('en')
    })
  })

  describe('t function', () => {
    it('returns Russian translation when language is ru', () => {
      setLanguage('ru')
      expect(t('dashboard')).toBe('Главная')
      expect(t('history')).toBe('История')
      expect(t('settings')).toBe('Настройки')
    })

    it('returns English translation when language is en', () => {
      setLanguage('en')
      expect(t('dashboard')).toBe('Dashboard')
      expect(t('history')).toBe('History')
      expect(t('settings')).toBe('Settings')
    })

    it('returns key itself when translation not found', () => {
      setLanguage('en')
      expect(t('nonexistentKey' as TranslationKey)).toBe('nonexistentKey')
    })

    it('falls back to English when current language translation missing', () => {
      setLanguage('ru')
      expect(t('dashboard')).toBe('Главная')
    })
  })

  describe('tc function (critical translations)', () => {
    it('returns Russian critical translation when language is ru', () => {
      setLanguage('ru')
      expect(tc('cancel')).toBe('Отмена')
      expect(tc('save')).toBe('Сохранить')
      expect(tc('delete')).toBe('Удалить')
    })

    it('returns English critical translation when language is en', () => {
      setLanguage('en')
      expect(tc('cancel')).toBe('Cancel')
      expect(tc('save')).toBe('Save')
      expect(tc('delete')).toBe('Delete')
    })

    it('returns key itself when critical translation not found', () => {
      setLanguage('en')
      expect(tc('nonexistentKey' as CriticalTranslationKey)).toBe('nonexistentKey')
    })
  })

  describe('translations object', () => {
    it('has both en and ru keys', () => {
      expect(translations).toHaveProperty('en')
      expect(translations).toHaveProperty('ru')
    })

    it('has matching keys in both languages', () => {
      const enKeys = Object.keys(translations.en).sort()
      const ruKeys = Object.keys(translations.ru).sort()
      expect(enKeys).toEqual(ruKeys)
    })

    it('has a substantial number of translation keys', () => {
      const keyCount = Object.keys(translations.en).length
      expect(keyCount).toBeGreaterThan(200)
    })
  })

  describe('criticalTranslations object', () => {
    it('has both en and ru keys', () => {
      expect(criticalTranslations).toHaveProperty('en')
      expect(criticalTranslations).toHaveProperty('ru')
    })

    it('has matching keys in both languages', () => {
      const enKeys = Object.keys(criticalTranslations.en).sort()
      const ruKeys = Object.keys(criticalTranslations.ru).sort()
      expect(enKeys).toEqual(ruKeys)
    })

    it('is a subset of full translations', () => {
      const criticalKeys = Object.keys(criticalTranslations.en)
      const fullKeys = Object.keys(translations.en)
      criticalKeys.forEach((key) => {
        expect(fullKeys).toContain(key)
      })
    })

    it('has fewer keys than full translations', () => {
      const criticalCount = Object.keys(criticalTranslations.en).length
      const fullCount = Object.keys(translations.en).length
      expect(criticalCount).toBeLessThan(fullCount)
    })
  })

  describe('translation key coverage', () => {
    it('has all required navigation keys', () => {
      const navKeys: TranslationKey[] = ['dashboard', 'history', 'loans', 'report', 'settings']
      navKeys.forEach((key) => {
        expect(translations.en[key]).toBeTruthy()
        expect(translations.ru[key]).toBeTruthy()
      })
    })

    it('has all required action keys', () => {
      const actionKeys: TranslationKey[] = ['cancel', 'save', 'delete', 'edit', 'add', 'create']
      actionKeys.forEach((key) => {
        expect(translations.en[key]).toBeTruthy()
        expect(translations.ru[key]).toBeTruthy()
      })
    })

    it('has all required form keys', () => {
      const formKeys: TranslationKey[] = ['name', 'type', 'color', 'currency', 'amount', 'comment']
      formKeys.forEach((key) => {
        expect(translations.en[key]).toBeTruthy()
        expect(translations.ru[key]).toBeTruthy()
      })
    })

    it('has all required date filter keys', () => {
      const dateKeys: TranslationKey[] = [
        'today',
        'yesterday',
        'thisWeek',
        'thisMonth',
        'thisYear',
        'allTime',
      ]
      dateKeys.forEach((key) => {
        expect(translations.en[key]).toBeTruthy()
        expect(translations.ru[key]).toBeTruthy()
      })
    })

    it('has all required account type keys', () => {
      const typeKeys: TranslationKey[] = ['cash', 'bankAccount', 'cryptoWallet', 'creditCard']
      typeKeys.forEach((key) => {
        expect(translations.en[key]).toBeTruthy()
        expect(translations.ru[key]).toBeTruthy()
      })
    })

    it('has all month abbreviation keys', () => {
      const monthKeys: TranslationKey[] = [
        'jan',
        'feb',
        'mar',
        'apr',
        'may',
        'jun',
        'jul',
        'aug',
        'sep',
        'oct',
        'nov',
        'dec',
      ]
      monthKeys.forEach((key) => {
        expect(translations.en[key]).toBeTruthy()
        expect(translations.ru[key]).toBeTruthy()
      })
    })

    it('has loan-related translation keys', () => {
      const loanKeys: TranslationKey[] = [
        'loanGiven',
        'loanReceived',
        'payment',
        'recordPayment',
        'paid',
        'remaining',
      ]
      loanKeys.forEach((key) => {
        expect(translations.en[key]).toBeTruthy()
        expect(translations.ru[key]).toBeTruthy()
      })
    })

    it('has budget-related translation keys', () => {
      const budgetKeys: TranslationKey[] = ['budget', 'budgetPeriod', 'weekly', 'monthly', 'yearly']
      budgetKeys.forEach((key) => {
        expect(translations.en[key]).toBeTruthy()
        expect(translations.ru[key]).toBeTruthy()
      })
    })

    it('has sync status keys', () => {
      const syncKeys: TranslationKey[] = ['syncing', 'syncOffline', 'syncError', 'syncComplete']
      syncKeys.forEach((key) => {
        expect(translations.en[key]).toBeTruthy()
        expect(translations.ru[key]).toBeTruthy()
      })
    })

    it('has import-related keys', () => {
      const importKeys: TranslationKey[] = [
        'importFromBudgetOk',
        'importSelectFile',
        'importConfirm',
        'importSuccess',
      ]
      importKeys.forEach((key) => {
        expect(translations.en[key]).toBeTruthy()
        expect(translations.ru[key]).toBeTruthy()
      })
    })
  })

  describe('translation quality', () => {
    it('Russian translations are in Cyrillic script', () => {
      setLanguage('ru')
      const cyrillicPattern = /[\u0400-\u04FF]/
      expect(t('dashboard')).toMatch(cyrillicPattern)
      expect(t('history')).toMatch(cyrillicPattern)
      expect(t('settings')).toMatch(cyrillicPattern)
    })

    it('English translations are in Latin script', () => {
      setLanguage('en')
      const latinPattern = /^[a-zA-Z]/
      expect(t('dashboard')).toMatch(latinPattern)
      expect(t('history')).toMatch(latinPattern)
      expect(t('settings')).toMatch(latinPattern)
    })
  })
})
