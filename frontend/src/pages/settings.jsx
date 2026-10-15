import { useState } from 'react'
import { Check, KeyRound, LogOut, Monitor, Moon, Sun, Trash2 } from 'lucide-react'
import { api, post } from '../lib/api'
import { useAuth } from '../context/authContext'
import { useTheme } from '../context/themecontext'
import './settings.css'

function Feedback({ error, ok }) {
  return <>{error && <p className="notice error-notice">{error}</p>}{ok && <p className="notice success-notice"><Check size={15}/>{ok}</p>}</>
}

export default function Settings() {
  const { user, signOut } = useAuth()
  const { mode, setTheme } = useTheme()
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '' })
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(action, message) {
    setError(''); setOk(''); setBusy(true)
    try { await action(); setOk(message); return true }
    catch (e) { setError(e.message); return false }
    finally { setBusy(false) }
  }
  async function changePassword(event) {
    event.preventDefault()
    if (await run(() => post('/auth/password', passwords), 'Password changed.')) setPasswords({ current_password: '', new_password: '' })
  }
  async function deleteAccount() {
    const password = prompt('Enter your password to permanently delete your account. Shared household records are retained.')
    if (password === null) return
    setError(''); setOk(''); setBusy(true)
    try { await api('/auth/me', { method: 'DELETE', body: new URLSearchParams({ password }) }); setOk('Account deleted.'); await signOut() }
    catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  return <section className="page settings-page">
    <div className="page-kicker"><span className="kicker-dot"/> PREFERENCES & PEOPLE</div>
    <div className="page-heading-row"><div><h1>Settings<span className="heading-period">.</span></h1><p className="page-intro">Signed in as <strong>{user?.username}</strong>.</p></div></div>
    <Feedback error={error} ok={ok}/>
    <section className="settings-section">
      <div className="settings-section-title"><span className="section-icon"><Sun size={17}/></span><div><h2>Appearance</h2><p>Make Ledger feel like yours.</p></div></div>
      <div className="theme-options"><button className={mode === 'system' ? 'chosen' : ''} onClick={() => setTheme('system')}><Monitor size={17}/>System</button><button className={mode === 'light' ? 'chosen' : ''} onClick={() => setTheme('light')}><Sun size={17}/>Light</button><button className={mode === 'dark' ? 'chosen' : ''} onClick={() => setTheme('dark')}><Moon size={17}/>Dark</button></div>
    </section>
    <section className="settings-section">
      <div className="settings-section-title"><span className="section-icon"><KeyRound size={17}/></span><div><h2>Change password</h2><p>Keep your account secure.</p></div></div>
      <form className="settings-password" onSubmit={changePassword}><input type="password" placeholder="Current password" autoComplete="current-password" value={passwords.current_password} onChange={e => setPasswords({ ...passwords, current_password: e.target.value })} required/><input type="password" placeholder="New password (7+ characters)" minLength={7} autoComplete="new-password" value={passwords.new_password} onChange={e => setPasswords({ ...passwords, new_password: e.target.value })} required/><button className="secondary-button" disabled={busy}>Update password</button></form>
    </section>
    <section className="account-actions"><button className="logout-button" onClick={signOut}><LogOut size={16}/> Log out</button><button className="delete-button" onClick={deleteAccount} disabled={busy}><Trash2 size={16}/> Delete account</button></section>
  </section>
}
