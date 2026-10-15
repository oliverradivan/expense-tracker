/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
const ThemeContext = createContext(null)
export const useTheme = () => useContext(ThemeContext)
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => localStorage.getItem('expense-theme') || 'light')
  const setTheme = (nextTheme) => {
    localStorage.setItem('expense-theme', nextTheme)
    document.documentElement.dataset.theme = nextTheme
    setThemeState(nextTheme)
  }
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('expense-theme', theme) }, [theme])
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
