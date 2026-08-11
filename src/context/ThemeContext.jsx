import { createContext, useContext, useEffect, useState } from 'react'
import { getTheme, setTheme as persistTheme } from '../utils/theme'

const ThemeContext = createContext({ theme: 'light', setTheme: () => {}, toggleTheme: () => {} })

// Holds the active theme and keeps <html data-theme> in sync with it.
//
// The attribute is stamped by the boot script in index.html before React
// mounts, so there is no flash of the wrong theme on reload; this provider
// just takes over from there. The effect re-stamps on mount for the case
// that script didn't run (tests, SSR-less previews).
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getTheme)

  useEffect(() => {
    persistTheme(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: setThemeState,
    toggleTheme: () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')),
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
