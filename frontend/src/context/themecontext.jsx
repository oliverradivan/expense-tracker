/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
const ThemeContext = createContext(null)
export const useTheme = () => useContext(ThemeContext)

function systemTheme() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('expense-theme') || 'system')
  const [theme, setThemeState] = useState(() => localStorage.getItem('expense-theme') || systemTheme())
  const setTheme = (nextTheme) => {
    if (nextTheme === 'system') localStorage.removeItem('expense-theme')
    else localStorage.setItem('expense-theme', nextTheme)
    setMode(nextTheme)
    setThemeState(nextTheme === 'system' ? systemTheme() : nextTheme)
  }
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    const followSystem = () => { if (mode === 'system') setThemeState(systemTheme()) }
    media?.addEventListener?.('change', followSystem)
    return () => media?.removeEventListener?.('change', followSystem)
  }, [mode, theme])
  return <ThemeContext.Provider value={{ theme, mode, setTheme }}>{children}</ThemeContext.Provider>
}
