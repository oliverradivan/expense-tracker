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
  const [space, setSpace] = useState({ id: 'private', name: 'My Private Account' })

  const refreshHouseholds = useCallback(async () => {
    const data = await api('/households/')
    setHouseholds(data.households || [])
    setInvitations(data.invitations || [])
    const saved = localStorage.getItem('expense-space')
    const selected = (data.households || []).find((h) => h.id === saved)
    setSpace(selected ? { id: selected.id, name: selected.name } : { id: 'private', name: 'My Private Account' })
  }, [])

  const refresh = useCallback(async () => {
    try {
      const account = await api('/auth/me')
      setUser(account)
      await refreshHouseholds()
    } catch {
      setUser(null); setHouseholds([]); setInvitations([]); setSpace({ id: 'private', name: 'My Private Account' })
    } finally { setLoading(false) }
  }, [refreshHouseholds])

  useEffect(() => { void Promise.resolve().then(refresh) }, [refresh])
  const signIn = useCallback(async (username, password) => { const u = await post('/auth/login', new URLSearchParams({ username, password })); setUser(u); await refreshHouseholds() }, [refreshHouseholds])
  const signUp = useCallback(async (username, password) => { const u = await post('/auth/register', new URLSearchParams({ username, password })); setUser(u); await refreshHouseholds() }, [refreshHouseholds])
  const signOut = useCallback(async () => { try { await post('/auth/logout', {}) } catch { /* Clear local app state even when the network is unavailable. */ } finally { clearTransactionCache(); setUser(null); setHouseholds([]); setSpace({ id: 'private', name: 'My Private Account' }) } }, [])
  const selectSpace = useCallback((id) => { const selected = households.find((h) => h.id === id); const next = selected ? { id: selected.id, name: selected.name } : { id: 'private', name: 'My Private Account' }; setSpace(next); localStorage.setItem('expense-space', next.id) }, [households])
  const value = useMemo(() => ({ user, loading, signIn, signUp, signOut, refresh, households, invitations, refreshHouseholds, space, selectSpace }), [user, loading, signIn, signUp, signOut, refresh, households, invitations, refreshHouseholds, space, selectSpace])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
