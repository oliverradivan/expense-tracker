import { useEffect, useState } from 'react'
import { ArrowUpRight, Check, Clock, Crown, Inbox, LogOut, Mail, UserPlus, Users } from 'lucide-react'
import { api, post } from '../lib/api'
import { useAuth } from '../context/authContext'
import './Household.css'

/* Reusable heading for every section: icon + title + one-line hint + optional count */
function SectionHeading({ icon: Icon, title, hint, count, attention }) {
  return <div className="household-section-heading">
    <span className="household-section-icon"><Icon size={16} /></span>
    <div className="household-section-text">
      <h3>{title}</h3>
      {hint && <p>{hint}</p>}
    </div>
    {count !== undefined && <span className={`household-count ${attention ? 'is-attention' : ''}`}>{count}</span>}
  </div>
}

export default function Household() {
  const { households, invitations, refreshHouseholds } = useAuth()
  const [createName, setCreateName] = useState('')
  const [joinName, setJoinName] = useState('')
  const [inviteNames, setInviteNames] = useState({})
  const [joinRequests, setJoinRequests] = useState([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function refreshRequests() {
    try {
      const data = await api('/households/join-requests')
      setJoinRequests(data.incoming || [])
    } catch {
      setJoinRequests([])
    }
  }

  useEffect(() => { void refreshRequests() }, [households.length])

  async function run(action, successMessage) {
    setError('')
    setMessage('')
    setBusy(true)
    try {
      await action()
      await refreshHouseholds()
      await refreshRequests()
      setMessage(successMessage)
      return true
    } catch (requestError) {
      setError(requestError.message || 'Something went wrong. Please try again.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function createHousehold(event) {
    event.preventDefault()
    if (await run(() => post('/households/', { name: createName.trim() }), 'Household created.')) setCreateName('')
  }

  async function requestToJoin(event) {
    event.preventDefault()
    if (await run(() => post('/households/join-requests', { household_name: joinName.trim() }), 'Join request sent.')) setJoinName('')
  }

  async function invite(event, householdId) {
    event.preventDefault()
    const username = (inviteNames[householdId] || '').trim()
    if (await run(() => post(`/households/${householdId}/invitations`, { username }), `Invitation sent to ${username}.`)) {
      setInviteNames((current) => ({ ...current, [householdId]: '' }))
    }
  }

  async function respondToInvitation(invitationId, action) {
    const success = await run(
      () => post(`/households/invitations/${invitationId}/${action}`, {}),
      action === 'accept' ? 'You joined the household.' : 'Invitation declined.',
    )
    if (success) await refreshHouseholds()
  }

  async function respondToJoinRequest(requestId, action) {
    await run(
      () => post(`/households/join-requests/${requestId}/${action}`, {}),
      action === 'accept' ? 'Join request accepted.' : 'Join request declined.',
    )
  }

  async function leaveHousehold(household) {
    if (!window.confirm(`Leave “${household.name}”?`)) return
    await run(
      () => api(`/households/${household.id}/members/me`, { method: 'DELETE' }),
      `You left “${household.name}”.`,
    )
  }

  const isMember = households.length > 0

  return <section className="page household-page">
    <div className="page-heading-row">
      <div>
        <h1>Household</h1>
        <p className="page-intro">{isMember ? 'Manage your shared space and its members.' : 'Share expenses with the people you trust.'}</p>
      </div>
    </div>

    {(error || message) && <p className={`notice ${error ? 'error-notice' : 'success-notice'}`} role={error ? 'alert' : 'status'}>{error || <><Check size={15} />{message}</>}</p>}

    {!isMember ? <>
      {/* Invitations float to the top (via CSS order) when you have any, since they need a reply */}
      <section className={`household-section glass-panel household-invitations-panel ${invitations.length ? 'is-attention' : ''}`}>
        <SectionHeading
          icon={Inbox}
          title="Invitations"
          hint={invitations.length ? 'Someone invited you. Join or decline.' : 'Invitations from other households appear here.'}
          count={invitations.length}
          attention={invitations.length > 0}
        />
        {invitations.length ? <div className="household-list">
          {invitations.map((invitation) => <article className="household-row" key={invitation.id}>
            <div className="household-row-main">
              <strong>{invitation.households?.name || 'Household invitation'}</strong>
              <small>Invited by {invitation.users?.username || 'a member'}</small>
            </div>
            <div className="household-row-actions">
              <button type="button" className="household-join-button" disabled={busy} onClick={() => respondToInvitation(invitation.id, 'accept')}>Join</button>
              <button type="button" className="household-decline-button" disabled={busy} onClick={() => respondToInvitation(invitation.id, 'decline')}>Decline</button>
            </div>
          </article>)}
        </div> : <p className="household-empty">No pending invitations.</p>}
      </section>

      <div className="household-actions-grid">
        <article className="household-section glass-panel">
          <SectionHeading icon={Users} title="Create a household" hint="Start a shared space and invite members." />
          <form className="inline-form" onSubmit={createHousehold}>
            <input placeholder="Household name" aria-label="Household name" value={createName} onChange={(event) => setCreateName(event.target.value)} minLength={2} maxLength={60} required />
            <button className="household-primary-button" disabled={busy}>Create <ArrowUpRight size={15} /></button>
          </form>
        </article>
        <article className="household-section glass-panel">
          <SectionHeading icon={UserPlus} title="Join a household" hint="Ask the owner to let you in." />
          <form className="inline-form" onSubmit={requestToJoin}>
            <input placeholder="Household name" aria-label="Household name to join" value={joinName} onChange={(event) => setJoinName(event.target.value)} minLength={2} maxLength={60} required />
            <button className="secondary-button" disabled={busy}>Request to join <ArrowUpRight size={15} /></button>
          </form>
        </article>
      </div>
    </> : <div className="household-current-list">
      {households.map((household) => {
        const requests = joinRequests.filter((request) => request.household_id === household.id)
        const members = household.members || []
        const pending = household.pending_invitations || []
        const isOwner = household.role === 'owner'

        return <div className="household-group" key={household.id}>
          {/* 1. Identity: which household, and what is your role */}
          <header className="household-hero glass-panel">
            <span className="household-hero-mark" aria-hidden="true">{(household.name || '?').slice(0, 1).toUpperCase()}</span>
            <div className="household-hero-text">
              <h2>{household.name}</h2>
              <p>{members.length} {members.length === 1 ? 'member' : 'members'}</p>
            </div>
            <span className={`household-role ${isOwner ? 'is-owner' : ''}`}>{isOwner && <Crown size={13} />}{isOwner ? 'Owner' : 'Member'}</span>
          </header>

          {/* 2. Needs your action: floats up to sit under the hero when there are requests */}
          {isOwner && <section className={`household-section glass-panel ${requests.length ? 'is-attention' : 'is-quiet'}`}>
            <SectionHeading
              icon={Mail}
              title="Join requests"
              hint={requests.length ? 'These people want to join. Accept or decline.' : 'No one is waiting to join.'}
              count={requests.length}
              attention={requests.length > 0}
            />
            {requests.length > 0 && <div className="household-list">
              {requests.map((request) => <article className="household-row" key={request.id}>
                <div className="household-row-main">
                  <strong>{request.users?.username || 'Someone'}</strong>
                  <small>Requested {new Date(request.created_at).toLocaleDateString()}</small>
                </div>
                <div className="household-row-actions">
                  <button type="button" className="household-join-button" disabled={busy} onClick={() => respondToJoinRequest(request.id, 'accept')}>Accept</button>
                  <button type="button" className="household-decline-button" disabled={busy} onClick={() => respondToJoinRequest(request.id, 'decline')}>Decline</button>
                </div>
              </article>)}
            </div>}
          </section>}

          {/* 3. Members: the main content */}
          <section className="household-section glass-panel">
            <SectionHeading icon={Users} title="Members" count={members.length} />
            <div className="household-members-list">
              {members.map((member) => <div className="household-member" key={member.user_id}>
                <span className="household-member-avatar">{(member.users?.username || '?').slice(0, 1).toUpperCase()}</span>
                <span className="household-member-name">{member.users?.username || 'Member'}</span>
                {member.role === 'owner' && <span className="household-role is-owner is-small"><Crown size={12} />Owner</span>}
              </div>)}
            </div>
          </section>

          {/* 4. Invite someone */}
          <section className="household-section glass-panel">
            <SectionHeading icon={UserPlus} title="Invite someone" hint="Enter their username. They can accept from their own Household page." />
            <form className="inline-form" onSubmit={(event) => invite(event, household.id)}>
              <input placeholder="Username" aria-label="Username to invite" value={inviteNames[household.id] || ''} onChange={(event) => setInviteNames((current) => ({ ...current, [household.id]: event.target.value }))} required />
              <button className="household-primary-button" disabled={busy}><UserPlus size={15} /> Send invite</button>
            </form>
          </section>

          {/* 5. Waiting on others: deliberately quiet */}
          <section className="household-section glass-panel is-quiet">
            <SectionHeading icon={Clock} title="Sent invitations" hint="Waiting for a reply." count={pending.length} />
            {pending.length ? <div className="household-pending-list">
              {pending.map((invitation) => <div className="household-pending-row" key={invitation.id}>
                <span>{invitation.users?.username || 'A user'}</span>
                <small className="household-pill">Awaiting reply</small>
              </div>)}
            </div> : <p className="household-empty">No pending invitations.</p>}
          </section>

          {/* 6. Destructive action: separated and low-key */}
          <footer className="household-leave-zone">
            <div>
              <strong>Leave this household</strong>
              <p>You will lose access to its shared expenses.</p>
            </div>
            <button type="button" className="household-leave-button" disabled={busy} onClick={() => leaveHousehold(household)}><LogOut size={14} /> Leave</button>
          </footer>
        </div>
      })}
    </div>}
  </section>
}