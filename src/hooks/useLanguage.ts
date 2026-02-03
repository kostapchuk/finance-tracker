import { useState, useEffect, useCallback } from 'react'
import { type Language, type TranslationKey, translations, getStoredLanguage, setStoredLanguage } from '@/utils/i18n'

// Global subscribers for language changes
const subscribers = new Set<() => void>()

let currentLang: Language = 'ru'

// Initialize from localStorage
if (typeof window !== 'undefined') {
  currentLang = getStoredLanguage()
  document.documentElement.lang = currentLang
}

export function useLanguage() {
  const [, forceUpdate] = useState({})

  useEffect(() => {
    const update = () => forceUpdate({})
    subscribers.add(update)
    return () => {
      subscribers.delete(update)
    }
  }, [])

  const setLanguage = useCallback((lang: Language) => {
    currentLang = lang
    setStoredLanguage(lang)
    document.documentElement.lang = lang
    // Notify all subscribers
    subscribers.forEach(fn => fn())
  }, [])

  const t = useCallback((key: TranslationKey): string => {
    return translations[currentLang][key] || translations.en[key] || key
  }, [])

  return {
    language: currentLang,
    setLanguage,
    t,
  }
}
