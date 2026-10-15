import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './components/LG.css'
import App from './App.jsx'
import { AuthProvider } from './context/authContext'
import { ThemeProvider } from './context/themecontext'

const storedTheme = localStorage.getItem('expense-theme')
const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
document.documentElement.dataset.theme = storedTheme || (systemDark ? 'dark' : 'light')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider><App /></ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
