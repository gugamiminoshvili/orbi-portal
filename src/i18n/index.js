import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import ka from './locales/ka.json'
import ru from './locales/ru.json'
import { tokenStore } from '../api/tokenStore'
import { patchUserLang } from '../api/auth'

const STORAGE_KEY = 'orbi-lang'

const storedLang = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null

i18n.use(initReactI18next).init({
  resources: {
    en: { ...en },
    ka: { ...ka },
    ru: { ...ru },
  },
  lng: storedLang || 'en',
  fallbackLng: 'en',
  ns: ['common', 'news', 'apartments', 'pay', 'support', 'auth', 'dashboard', 'profile'],
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
