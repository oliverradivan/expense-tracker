import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Bell, Check, Plus, Sparkles, UserPlus, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, post } from '../lib/api'
import { useAuth } from '../context/authContext'
import './dashboard.css'

const today = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())

export default function Dashboard() {
  const { user, space, households, invitations, refreshHouseholds } = useAuth()
  const [createName, setCreateName] = useState('')
  const [joinName, setJoinName] = useState('')
  const [inviteNames, setInviteNames] = useState({})
  const [joinRequests, setJoinRequests] = useState({ incoming: [], outgoing: [] })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const seenRequests = useRef(null)

  useEffect(() => {
    let active = true
    async function refreshRequests() {
      try {
        const data = await api('/households/join-requests')
        if (!active) return
        const incoming = data.incoming || []
        const currentIds = new Set(incoming.map((request) => request.id))
        if (seenRequests.current && incoming.some((request) => !seenRequests.current.has(request.id))) {
          setMessage('A new household join request just arrived.')
        }
        seenRequests.current = currentIds
        setJoinRequests({ incoming, outgoing: data.outgoing || [] })
      } catch {
        // The dashboard still works if this request check is temporarily unavailable.
      }
    }
    void refreshRequests()
    const timer = window.setInterval(refreshRequests, 5000)
    return () => { active = false; window.clearInterval(timer) }
  }, [])

  async function run(action, successMessage) {
    setError('')
    setMessage('')
    setBusy(true)
    try {
      await action()
      await refreshHouseholds()
      setMessage(successMessage)
      const data = await api('/households/join-requests')
      setJoinRequests({ incoming: data.incoming || [], outgoing: data.outgoing || [] })
      seenRequests.current = new Set((data.incoming || []).map((request) => request.id))
      return true
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function createHousehold(event) {
    event.preventDefault()
    if (await run(() => post('/households/', { name: createName.trim() }), `Created “${createName.trim()}”. You can invite people below.`)) setCreateName('')
  }

  async function requestToJoin(event) {
    event.preventDefault()
    if (await run(() => post('/households/join-requests', { household_name: joinName.trim() }), `Join request sent to “${joinName.trim()}”.`)) setJoinName('')
  }

  async function invite(event, householdId) {
    event.preventDefault()
    const username = (inviteNames[householdId] || '').trim()
    if (await run(() => post(`/households/${householdId}/invitations`, { username }), `Invitation sent to ${username}.`)) {
      setInviteNames((current) => ({ ...current, [householdId]: '' }))
    }
  }

  async function respondToInvitation(invitationId, action) {
    await run(() => post(`/households/invitations/${invitationId}/${action}`, {}), action === 'accept' ? 'Invitation accepted.' : 'Invitation declined.')
  }

  async function respondToJoinRequest(requestId, action) {
    await run(() => post(`/households/join-requests/${requestId}/${action}`, {}), action === 'accept' ? 'Join request accepted.' : 'Join request declined.')
  }

  return <section className="page dashboard-page">
    <div className="page-kicker"><span className="kicker-dot" />{today.toUpperCase()}</div>
    <div className="dashboard-heading">
      <div><h1>Welcome back, <em className="username">{user?.username || 'friend'}</em></h1><p className="page-intro">A clear view of your money starts here.</p></div>
      <div className="dashboard-stamp"><Sparkles size={17} /><span>YOUR MONEY, IN VIEW</span></div>
    </div>

    {(error || message) && <p className={`notice ${error ? 'error-notice' : 'success-notice'} dashboard-feedback`} role={error ? 'alert' : 'status'}>{error || <><Check size={15}/>{message}</>}</p>}

    {joinRequests.incoming.length > 0 && <section className="dashboard-notifications glass-panel" aria-live="polite">
      <div className="dashboard-section-heading"><span className="dashboard-icon"><Bell size={17}/></span><div><h2>Household requests</h2><p>People are asking to join your household.</p></div><span className="request-count">{joinRequests.incoming.length}</span></div>
      <div className="dashboard-request-list">{joinRequests.incoming.map((request) => <article className="dashboard-request" key={request.id}>
        <div><strong>{request.users?.username || 'Someone'} wants to join {request.households?.name || 'your household'}</strong><small>Requested {new Date(request.created_at).toLocaleString()}</small></div>
        <div className="dashboard-request-actions"><button className="secondary-button" disabled={busy} onClick={() => respondToJoinRequest(request.id, 'accept')}>Accept</button><button className="plain-button" disabled={busy} onClick={() => respondToJoinRequest(request.id, 'decline')}>Decline</button></div>
      </article>)}</div>
    </section>}

    <div className="dashboard-primary-row">
      <section className="welcome-card glass-panel"><div className="welcome-copy"><span className="eyebrow">CURRENT SPACE</span><h2>{space.name}</h2><p>Your financial space is ready when you are.</p><Link to="/log" className="text-link">Log expense or income <ArrowUpRight size={15} /></Link></div><div className="welcome-symbol"><span>₪</span><div className="symbol-orbit orbit-one"/><div className="symbol-orbit orbit-two"/></div></section>
      <Link to="/log" className="dashboard-log-card glass-panel"><span className="dashboard-icon"><Plus size={18}/></span><span><strong>Log expense</strong><small>Add an expense or income</small></span><ArrowUpRight size={17}/></Link>
    </div>

    {invitations.length > 0 && <section className="dashboard-tools glass-panel">
      <div className="dashboard-section-heading"><span className="dashboard-icon"><Bell size={17}/></span><div><h2>Invitations for you</h2><p>Choose which shared households to join.</p></div></div>
      <div className="dashboard-request-list">{invitations.map((invitation) => <article className="dashboard-request" key={invitation.id}><div><strong>{invitation.households?.name || 'Household invitation'}</strong><small>Invited by {invitation.users?.username || 'a member'}</small></div><div className="dashboard-request-actions"><button className="secondary-button" disabled={busy} onClick={() => respondToInvitation(invitation.id, 'accept')}>Accept</button><button className="plain-button" disabled={busy} onClick={() => respondToInvitation(invitation.id, 'decline')}>Decline</button></div></article>)}</div>
    </section>}

    <section className="dashboard-tools glass-panel">
      <div className="dashboard-section-heading"><span className="dashboard-icon"><Users size={17}/></span><div><h2>Make it shared</h2><p>Create a household or ask to join one.</p></div></div>
      <div className="dashboard-household-actions">
        <article className="dashboard-household-card glass-panel"><div className="dashboard-household-title"><h3>Create a household</h3><p>Start a shared space and invite people by username.</p></div><form className="inline-form" onSubmit={createHousehold}><input placeholder="Household name" value={createName} onChange={(event) => setCreateName(event.target.value)} minLength={2} maxLength={60} required/><button className="secondary-button" disabled={busy}>Create <ArrowUpRight size={15}/></button></form></article>
        <article className="dashboard-household-card glass-panel"><div className="dashboard-household-title"><h3>Join a household</h3><p>Send a request to its owner for approval.</p></div><form className="inline-form" onSubmit={requestToJoin}><input placeholder="Household name" value={joinName} onChange={(event) => setJoinName(event.target.value)} minLength={2} maxLength={60} required/><button className="secondary-button" disabled={busy}>Request to join <ArrowUpRight size={15}/></button></form></article>
      </div>
      {joinRequests.outgoing.length > 0 && <div className="outgoing-requests"><span className="eyebrow">YOUR JOIN REQUESTS</span>{joinRequests.outgoing.map((request) => <div className="outgoing-request" key={request.id}><span>{request.households?.name || 'Household'}</span><small className={`request-status status-${request.status}`}>{request.status}</small></div>)}</div>}
      {households.map((household) => <article className="dashboard-household-card glass-panel owned-household" key={household.id}>
        <div className="dashboard-household-title"><h3>{household.name}</h3><p>{household.role === 'owner' ? 'Owner' : 'Member'} · Invite people by username</p></div>
        {household.members?.length > 0 && <div className="member-list">{household.members.map((member) => <span key={member.user_id}>{member.users?.username}{member.role === 'owner' ? ' · owner' : ''}</span>)}</div>}
        <form className="inline-form" onSubmit={(event) => invite(event, household.id)}><input placeholder="Invite by username" value={inviteNames[household.id] || ''} onChange={(event) => setInviteNames((current) => ({ ...current, [household.id]: event.target.value }))} required/><button className="secondary-button" disabled={busy}><UserPlus size={15}/> Invite</button></form>
      </article>)}
    </section>
  </section>
}
