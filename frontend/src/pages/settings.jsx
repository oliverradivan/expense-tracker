import { useState } from 'react'
import { ArrowUpRight, Check, LogOut, Moon, Sun, Users, UserPlus, Trash2 } from 'lucide-react'
import { api, post } from '../lib/api'
import { useAuth } from '../context/authContext'
import { useTheme } from '../context/themecontext'
import './Settings.css'

function Feedback({ error, ok }) {
  return <>{error && <p className="notice error-notice">{error}</p>}{ok && <p className="notice success-notice"><Check size={15}/>{ok}</p>}</>
}

export default function Settings() {
  const { user, signOut, households, invitations, refreshHouseholds } = useAuth()
  const { theme, setTheme } = useTheme()
  const [createName, setCreateName] = useState('')
  const [inviteName, setInviteName] = useState({})
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '' })
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(action, message) {
    setError(''); setOk(''); setBusy(true)
    try { await action(); setOk(message); await refreshHouseholds(); return true }
    catch (e) { setError(e.message); return false }
    finally { setBusy(false) }
  }
  async function create(event) {
    event.preventDefault()
    if (await run(() => post('/households/', { name: createName }), `Created “${createName}”.`)) setCreateName('')
  }
  async function invite(event, householdId) {
    event.preventDefault()
    const username = inviteName[householdId]
    if (await run(() => post(`/households/${householdId}/invitations`, { username }), `Invitation sent to ${username}.`)) setInviteName({ ...inviteName, [householdId]: '' })
  }
  async function respond(invitationId, action) {
    await run(() => post(`/households/invitations/${invitationId}/${action}`, {}), action === 'accept' ? 'Invitation accepted.' : 'Invitation declined.')
  }
  async function leave(household) {
    if (!confirm(`Leave “${household.name}”? You will lose access to its shared transactions.`)) return
    await run(() => api(`/households/${household.id}/members/me`, { method: 'DELETE' }), 'You left the household.')
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
      <div className="theme-options"><button className={theme === 'light' ? 'chosen' : ''} onClick={() => setTheme('light')}><Sun size={17}/>Light</button><button className={theme === 'dark' ? 'chosen' : ''} onClick={() => setTheme('dark')}><Moon size={17}/>Dark</button></div>
    </section>
    <section className="settings-section">
      <div className="settings-section-title"><span className="section-icon"><Users size={17}/></span><div><h2>Households</h2><p>Keep shared finances in their own space.</p></div></div>
      <div className="settings-nested">
        <form className="inline-form" onSubmit={create}><input placeholder="Name a household" value={createName} onChange={e => setCreateName(e.target.value)} minLength={2} maxLength={60} required/><button className="secondary-button" disabled={busy}>Create household <ArrowUpRight size={15}/></button></form>
        {invitations.length > 0 && <div className="invite-list"><span className="eyebrow">INVITATIONS FOR YOU</span>{invitations.map(invite => <div className="invite-row" key={invite.id}><span><strong>{invite.households?.name || 'Household invitation'}</strong><small>Invited by {invite.users?.username || 'a member'}</small></span><div><button className="small-button" onClick={() => respond(invite.id, 'accept')}>Accept</button><button className="plain-button" onClick={() => respond(invite.id, 'decline')}>Decline</button></div></div>)}</div>}
        {households.map(household => <div className="household-card" key={household.id}>
          <div className="household-title"><div><strong>{household.name}</strong><span>{household.role === 'owner' ? 'Owner' : 'Member'}</span></div><button className="plain-button leave-button" onClick={() => leave(household)}>Leave</button></div>
          {household.members?.length > 0 && <div className="member-list">{household.members.map(member => <span key={member.user_id}>{member.users?.username}{member.role === 'owner' ? ' · owner' : ''}</span>)}</div>}
          <form className="inline-form" onSubmit={e => invite(e, household.id)}><input placeholder="Invite by username" value={inviteName[household.id] || ''} onChange={e => setInviteName({ ...inviteName, [household.id]: e.target.value })} required/><button className="secondary-button" disabled={busy}><UserPlus size={15}/> Invite</button></form>
          <p className="field-help">Household transactions are shared with current members. Private transactions remain yours.</p>
        </div>)}
      </div>
    </section>
    <section className="settings-section">
      <div className="settings-section-title"><span className="section-icon"><UserPlus size={17}/></span><div><h2>Change password</h2><p>Keep your account secure.</p></div></div>
      <form className="settings-password" onSubmit={changePassword}><input type="password" placeholder="Current password" autoComplete="current-password" value={passwords.current_password} onChange={e => setPasswords({ ...passwords, current_password: e.target.value })} required/><input type="password" placeholder="New password (7+ characters)" minLength={7} autoComplete="new-password" value={passwords.new_password} onChange={e => setPasswords({ ...passwords, new_password: e.target.value })} required/><button className="secondary-button" disabled={busy}>Update password</button></form>
    </section>
    <section className="account-actions"><button className="logout-button" onClick={signOut}><LogOut size={16}/> Log out</button><button className="delete-button" onClick={deleteAccount} disabled={busy}><Trash2 size={16}/> Delete account</button></section>
  </section>
}
