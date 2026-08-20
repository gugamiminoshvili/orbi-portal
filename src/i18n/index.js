import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import ka from './locales/ka.json'
import ru from './locales/ru.json'
import { tokenStore } from '../api/tokenStore'
import { patchUserLang } from '../api/auth'

const STORAGE_KEY = 'orbi-lang'

// The languages the switcher offers, in menu order. Flags are emoji rather
// than image assets — no external requests, and they inherit the surrounding
// type metrics. Lives here (not in the menu component) because the list is
// the i18n configuration, not a detail of where it happens to be rendered.
export const LANGS = [
  { code: 'en', flag: '🇬🇧', label: 'English', short: 'EN' },
  { code: 'ka', flag: '🇬🇪', label: 'ქართული', short: 'ქარ' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский', short: 'РУС' },
]

const storedLang = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null

i18n.use(initReactI18next).init({
  resources: {
    en: { ...en },
    ka: { ...ka },
    ru: { ...ru },
  },
  lng: storedLang || 'en',
  fallbackLng: 'en',
  ns: ['common', 'news', 'apartments', 'pay', 'support', 'auth', 'dashboard', 'profile', 'bookings'],
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
})

if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.language
}

export function setLang(lng) {
  i18n.changeLanguage(lng)
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, lng)
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng
  }
  if (tokenStore.hasSession()) {
    // Fire-and-forget: keep the language switch instant and local; a failed
    // sync to the backend shouldn't block or roll back the UI language.
    patchUserLang(lng).catch(() => {})
  }
}

export default i18n
