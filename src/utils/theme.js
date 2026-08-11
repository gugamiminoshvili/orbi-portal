// Theme storage. setTheme() stamps document.documentElement.dataset.theme,
// which is what index.css's `[data-theme="light"]` / `[data-theme="dark"]`
// selectors key off of, and persists the choice to localStorage so it
// survives a reload. Unset means light — index.css's
// `:root, [data-theme="light"]` selector covers the no-attribute case too.
//
// Three things read STORAGE_KEY and must stay in step: this module, the
// pre-paint boot script in index.html, and ThemeContext (which owns the
// live value and is what the account menu's toggle actually calls).

const STORAGE_KEY = 'orbi-theme'
const THEMES = ['light', 'dark']
const DEFAULT_THEME = 'light'

function isValidTheme(value) {
  return THEMES.includes(value)
}

export function getTheme() {
  if (typeof localStorage === 'undefined') return DEFAULT_THEME
  const stored = localStorage.getItem(STORAGE_KEY)
  return isValidTheme(stored) ? stored : DEFAULT_THEME
}

export function setTheme(theme) {
  const next = isValidTheme(theme) ? theme : DEFAULT_THEME
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = next
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, next)
  }
  return next
}

export { DEFAULT_THEME }
