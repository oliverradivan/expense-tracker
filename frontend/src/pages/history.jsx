import { useEffect, useState } from 'react'
import {
  BriefcaseBusiness, Building2, Gift, Shapes, ShoppingBasket,
  TvMinimalPlay, Wallet,
} from 'lucide-react'
import { api } from '../lib/api'
import { getCachedTransactions, setCachedTransactions } from '../lib/transactionCache'
import { money } from '../lib/utils'
import { useAuth } from '../context/authContext'
import './history.css'

const CATEGORY_ICONS = {
  Subscription: TvMinimalPlay,
  Apartment: Building2,
  Grocery: ShoppingBasket,
  Job: BriefcaseBusiness,
  Maanak: Wallet,
  Gift,
  Other: Shapes,
}

function CategoryIcon({ category }) {
  const Icon = CATEGORY_ICONS[category] || Shapes
  return <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
}

function dateKey(value) {
  const text = String(value || '')
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '0000-00-00'
}

function monthTitle(month) {
  const [year, number] = month.split('-').map(Number)
  return new Date(year, number - 1, 1).toLocaleDateString('en', { month: 'long', year: 'numeric' })
}

function dateLabel(value) {
  const [year, month, day] = dateKey(value).split('-').map(Number)
  if (!year || !month || !day) return { day: '—', weekday: '' }
  const date = new Date(year, month - 1, day)
  return {
    day: String(day),
    weekday: date.toLocaleDateString('en', { weekday: 'short' }),
  }
}

export default function History() {
  const { space, user } = useAuth()
  const cacheKey = [user.id, space.id]
  const [items, setItems] = useState(() => getCachedTransactions(...cacheKey) || [])
  const [state, setState] = useState(() => getCachedTransactions(...cacheKey) ? 'ready' : 'loading')
  const [error, setError] = useState('')
  const [loadedSpace, setLoadedSpace] = useState(() => getCachedTransactions(...cacheKey) ? `${user.id}:${space.id}` : '')
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    let alive = true
    api(`/transactions/${space.id === 'private' ? '' : `?household_id=${encodeURIComponent(space.id)}`}`)
      .then((data) => {
        if (alive) {
          setCachedTransactions(user.id, space.id, data || [])
          setItems(data || [])
          setLoadedSpace(`${user.id}:${space.id}`)
          setState('ready')
          setError('')
        }
      })
      .catch((e) => {
        if (alive) {
          const cached = e.status === 401 || e.status === 403 ? null : getCachedTransactions(user.id, space.id)
          if (e.status === 401 || e.status === 403) setCachedTransactions(user.id, space.id, [])
          setItems(cached || [])
          setLoadedSpace(`${user.id}:${space.id}`)
          setError(e.message)
          setState(cached ? 'ready' : 'error')
        }
      })
    return () => { alive = false }
  }, [space.id, user.id])

  async function removeTransaction(item) {
    if (!confirm(`Delete “${item.label}”?`)) return
    const before = items
    const after = before.filter((row) => row.id !== item.id)
    setItems(after)
    setCachedTransactions(user.id, space.id, after)
    setDeleting(item.id)
    setError('')
    try {
      await api(`/transactions/${item.id}`, { method: 'DELETE' })
    } catch (e) {
      if (e.status === 401 || e.status === 403) {
        setItems([])
        setCachedTransactions(user.id, space.id, [])
        setLoadedSpace(`${user.id}:${space.id}`)
      } else {
        setItems(before)
        setCachedTransactions(user.id, space.id, before)
      }
      setError(e.message)
    } finally {
      setDeleting(null)
    }
  }

  const currentKey = `${user.id}:${space.id}`
  const cachedForSpace = getCachedTransactions(user.id, space.id)
  const displayLoaded = loadedSpace === currentKey
  const displayItems = displayLoaded ? items : cachedForSpace || []
  const viewState = displayLoaded ? state : cachedForSpace ? 'ready' : 'loading'
  const groups = displayItems.reduce((all, item) => {
    const month = dateKey(item.date).slice(0, 7)
    ;(all[month] ||= []).push(item)
    return all
  }, {})

  return <section className="page history-page">
    <div className="page-heading-row history-header">
      <div><h1>History</h1><p className="page-intro">A clear record of {space.name.toLowerCase()}.</p></div>
      <span className="count-pill">{viewState === 'ready' ? `${displayItems.length} ${displayItems.length === 1 ? 'entry' : 'entries'}` : 'Loading'}</span>
    </div>

    {viewState === 'loading' && <div className="quiet-state">Gathering your transactions…</div>}
    {displayLoaded && error && <div className="notice error-notice" role="alert">{error}</div>}
    {viewState === 'ready' && !displayItems.length && <div className="empty-state"><span className="empty-icon"><Shapes size={22}/></span><h2>Nothing here yet</h2><p>Your transactions will appear here once you add them.</p></div>}

    {viewState === 'ready' && Object.entries(groups).sort(([a], [b]) => b.localeCompare(a)).map(([month, rows]) => {
      const orderedRows = [...rows].sort((a, b) => dateKey(b.date).localeCompare(dateKey(a.date)) || String(b.id).localeCompare(String(a.id)))
      return <section className="history-month" key={month}>
        <header className="history-month-heading">
          <h2>{monthTitle(month)}</h2>
          <span>{rows.length} {rows.length === 1 ? 'transaction' : 'transactions'}</span>
        </header>
        <div className="history-entries glass-panel">
          {orderedRows.map((item) => {
            const date = dateLabel(item.date)
            const frequency = { one_time: 'One time', monthly: 'Monthly', yearly: 'Yearly' }[item.frequency || 'one_time']
            return <article className={`history-entry ${item.type}`} key={item.id}>
              <time className="entry-date" dateTime={item.date}>
                <strong>{date.day}</strong><span>{date.weekday}</span>
              </time>
              <span className={`entry-category-icon ${item.type}`} title={item.category}>
                <CategoryIcon category={item.category}/>
              </span>
              <div className="entry-description">
                <strong>{item.label}</strong>
                <span>{item.category} <i aria-hidden="true"/> {frequency}</span>
              </div>
              <strong className={`entry-amount ${item.type}`}>
                {item.type === 'income' ? '+' : '−'}{money(item.amount)}
              </strong>
              <button className="transaction-delete" type="button" aria-label={`Delete ${item.type}: ${item.label}`} title="Delete transaction" disabled={deleting === item.id} onClick={() => removeTransaction(item)}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3"/></svg>
              </button>
            </article>
          })}
        </div>
      </section>
    })}
  </section>
}
