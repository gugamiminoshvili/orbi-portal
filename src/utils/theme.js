// Theme persistence for the (future) dark-mode toggle — P3-6 scaffolding
// only. Nothing in the UI calls setTheme() yet; the owner wires up a
// visible toggle once real dark values land in index.css's
// `[data-theme="dark"]` block. Until then the app always renders the
// light theme, since getTheme()/setTheme() both default to 'light' and
// index.css's `:root, [data-theme="light"]` selector covers the
// no-attribute-yet case too.
//
// setTheme() stamps document.documentElement.dataset.theme, which is what
// index.css's `[data-theme="light"]` / `[data-theme="dark"]` selectors key
// off of, and persists the choice to localStorage so it survives a reload.

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
