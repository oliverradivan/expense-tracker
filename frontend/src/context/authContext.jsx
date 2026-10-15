/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState, useEffect } from 'react'

const AuthContext = createContext(null)
const API_URL = import.meta.env.VITE_API_URL || '/api'
// localStorage keeps sessions available across reloads but is readable by page
// JavaScript; an XSS vulnerability could expose the stored access/refresh tokens.
const AUTH_STORAGE_KEY = 'workout-tracker-auth'

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY)
      // Handle migration from old format that had { user, session }
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.user !== undefined) {
          return parsed.user
        }
        // Fallback: if it's the old format with user and session, take the user
        return parsed.user || null
      }
      return null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user }))
      return
    }

    localStorage.removeItem(AUTH_STORAGE_KEY)
  }, [user])

  const handleAuth = async (form, mode) => {
    setLoading(true)
    setMessage('')

    try {
      const endpoint = mode || (form.email ? 'register' : 'login')
      const payload = {
        username: form.username?.trim(),
        email: form.email?.trim(),
        password: form.password,
      }

      // Convert payload to form data, skipping undefined values
      const formData = new URLSearchParams()
      for (const [key, value] of Object.entries(payload)) {
        if (value !== undefined && value !== null) {
          formData.append(key, value)
        }
      }

      const response = await fetch(`${API_URL}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      })

      const rawText = await response.text()
      let result = {}

      if (rawText) {
        try {
          result = JSON.parse(rawText)
        } catch {
          result = { detail: rawText }
        }
      }

      if (!response.ok) {
        throw new Error(result.detail || result.message || 'Authentication failed.')
      }

      // After successful login or registration, fetch the user info from /auth/me
      const meResponse = await fetch(`${API_URL}/auth/me`, {
        credentials: 'include',
      })
      if (!meResponse.ok) {
        throw new Error('Failed to fetch user info')
      }
      const meData = await meResponse.json()
      setUser(meData)
      setMessage(endpoint === 'register'
        ? `Account created for @${meData.username}. You can now log in.`
        : 'Logged in successfully.')
      return { success: true }
    } catch (error) {
      setMessage(error.message || 'Something went wrong. Please try again.')
      return { success: false }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Logout failed')
      }
    } catch (error) {
      setMessage(error.message || 'Logout failed')
    } finally {
      setLoading(false)
      setUser(null)
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      message,
      setMessage,
      handleAuth,
      handleLogout,
    }),
    [user, loading, message],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}