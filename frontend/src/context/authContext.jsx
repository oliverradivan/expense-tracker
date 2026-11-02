/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, post } from '../lib/api'
import { clearTransactionCache } from '../lib/transactionCache'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [households, setHouseholds] = useState([])
  const [invitations, setInvitations] = useState([])
  const [householdError, setHouseholdError] = useState('')
  const [authError, setAuthError] = useState('')
  const [space, setSpace] = useState({ id: 'private', name: 'Personal Account' })

  const refreshHouseholds = useCallback(async () => {
    try {
      const data = await api('/households/')
      setHouseholds(data.households || [])
      setInvitations(data.invitations || [])
      const saved = localStorage.getItem('expense-space')
      const selected = (data.households || []).find((h) => h.id === saved)
      setSpace(selected ? { id: selected.id, name: selected.name } : { id: 'private', name: 'Personal Account' })
      setHouseholdError('')
    } catch (error) {
      setHouseholdError(error.message)
      throw error
    }
  }, [])

  const refresh = useCallback(async () => {
    let account
    try {
      account = await api('/auth/me')
    } catch (error) {
      if (error.status === 401) {
        clearTransactionCache()
        setUser(null)
        setHouseholds([])
        setInvitations([])
        setHouseholdError('')
        setSpace({ id: 'private', name: 'Personal Account' })
        setAuthError('')
      } else {
        setAuthError(error.message)
      }
      setLoading(false)
      return
    }
    setUser(account)
    setAuthError('')
    try {
      await refreshHouseholds()
    } catch {
      // The household error is retained separately; the authenticated session remains valid.
    }
    setLoading(false)
  }, [refreshHouseholds])

  useEffect(() => { void Promise.resolve().then(refresh) }, [refresh])
  const signIn = useCallback(async (username, password) => {
    const account = await post('/auth/login', new URLSearchParams({ username, password }))
    setUser(account)
    setAuthError('')
    try { await refreshHouseholds() } catch { /* The household error is shown separately. */ }
  }, [refreshHouseholds])
  const signUp = useCallback(async (username, password) => {
    const account = await post('/auth/register', new URLSearchParams({ username, password }))
    setUser(account)
    setAuthError('')
    try { await refreshHouseholds() } catch { /* The household error is shown separately. */ }
  }, [refreshHouseholds])
  const signOut = useCallback(async () => {
    try {
      await post('/auth/logout', {})
    } catch {
      // Clear local app state even when the network is unavailable.
    } finally {
      clearTransactionCache()
      setUser(null)
      setHouseholds([])
      setInvitations([])
      setHouseholdError('')
      setAuthError('')
      setSpace({ id: 'private', name: 'Personal Account' })
    }
  }, [])
  const selectSpace = useCallback((id) => {
    const selected = households.find((h) => h.id === id)
    const next = selected ? { id: selected.id, name: selected.name } : { id: 'private', name: 'Personal Account' }
    setSpace(next)
    localStorage.setItem('expense-space', next.id)
  }, [households])
  const value = useMemo(() => ({
    user, loading, signIn, signUp, signOut, refresh, households, invitations,
    householdError, authError, refreshHouseholds, space, selectSpace,
  }), [user, loading, signIn, signUp, signOut, refresh, households, invitations, householdError, authError, refreshHouseholds, space, selectSpace])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
