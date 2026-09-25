import { APP_URL, detectLanguage, translations } from './i18n.mjs'

const STORAGE_KEY = 'ft-landing-lang'

function readStoredLanguage() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function applyLanguage(lang) {
  const dict = translations[lang]
  document.documentElement.lang = lang
  document.title = dict.metaTitle
  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = dict[el.dataset.i18n]
  }
  for (const btn of document.querySelectorAll('[data-lang]')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang))
  }
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // Storage may be unavailable (private mode) - language just won't persist.
  }
}

function selectTab(name) {
  for (const tab of document.querySelectorAll('[role="tab"]')) {
    const active = tab.dataset.tab === name
    tab.setAttribute('aria-selected', String(active))
    tab.tabIndex = active ? 0 : -1
  }
  for (const panel of document.querySelectorAll('[role="tabpanel"]')) {
    panel.hidden = panel.dataset.panel !== name
  }
}

for (const link of document.querySelectorAll('[data-app-link]')) {
  link.href = APP_URL
}

applyLanguage(detectLanguage(readStoredLanguage()))
for (const btn of document.querySelectorAll('[data-lang]')) {
  btn.addEventListener('click', () => applyLanguage(btn.dataset.lang))
}

selectTab(/android/i.test(navigator.userAgent) ? 'android' : 'ios')
for (const tab of document.querySelectorAll('[role="tab"]')) {
  tab.addEventListener('click', () => selectTab(tab.dataset.tab))
}

const revealTargets = document.querySelectorAll('.reveal')
if ('IntersectionObserver' in globalThis) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      }
    },
    { threshold: 0.15 }
  )
  for (const el of revealTargets) observer.observe(el)
} else {
  for (const el of revealTargets) el.classList.add('is-visible')
}
