import { useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, ReceiptText, X } from 'lucide-react'
import { api } from '../lib/api'
import { getCachedTransactions, setCachedTransactions } from '../lib/transactionCache'
import { money, readableDate } from '../lib/utils'
import { useAuth } from '../context/authContext'
import './history.css'

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
      .then((data) => { if (alive) { setCachedTransactions(user.id, space.id, data || []); setItems(data || []); setLoadedSpace(`${user.id}:${space.id}`); setState('ready'); setError('') } })
      .catch((e) => { if (alive) { const cached = e.status === 401 || e.status === 403 ? null : getCachedTransactions(user.id, space.id); if (e.status === 401 || e.status === 403) setCachedTransactions(user.id, space.id, []); setItems(cached || []); setLoadedSpace(`${user.id}:${space.id}`); setError(e.message); setState(cached ? 'ready' : 'error') } })
    return () => { alive = false }
  }, [space.id, user.id])

  async function removeTransaction(item) {
    if (!confirm(`Delete “${item.label}”?`)) return
    const before = items
    const after = before.filter((row) => row.id !== item.id)
    setItems(after); setCachedTransactions(user.id, space.id, after); setDeleting(item.id); setError('')
    try { await api(`/transactions/${item.id}`, { method: 'DELETE' }) }
    catch (e) { if (e.status === 401 || e.status === 403) { setItems([]); setCachedTransactions(user.id, space.id, []); setLoadedSpace(`${user.id}:${space.id}`) } else { setItems(before); setCachedTransactions(user.id, space.id, before) } setError(e.message) }
    finally { setDeleting(null) }
  }

  const currentKey = `${user.id}:${space.id}`
  const cachedForSpace = getCachedTransactions(user.id, space.id)
  const displayLoaded = loadedSpace === currentKey
  const displayItems = displayLoaded ? items : cachedForSpace || []
  const viewState = displayLoaded ? state : cachedForSpace ? 'ready' : 'loading'
  const groups = displayItems.reduce((all, item) => {
    const month = String(item.date).slice(0, 7)
    all[month] ||= {}
    ;(all[month][item.category] ||= []).push(item)
    return all
  }, {})

  return <section className="page">
    <div className="page-kicker"><span className="kicker-dot"/> TRANSACTION LEDGER</div>
    <div className="page-heading-row"><div><h1>History</h1><p className="page-intro">A clear record of {space.name.toLowerCase()}.</p></div><span className="count-pill">{viewState === 'ready' ? `${displayItems.length} ${displayItems.length === 1 ? 'entry' : 'entries'}` : 'Loading'}</span></div>
    {viewState === 'loading' && <div className="quiet-state">Gathering your transactions…</div>}
    {displayLoaded && error && <div className="notice error-notice">{error}</div>}
    {viewState === 'ready' && !displayItems.length && <div className="empty-state"><span className="empty-icon"><ReceiptText size={22}/></span><h2>Nothing here yet</h2><p>Your transactions will appear here once you add them.</p></div>}
    {viewState === 'ready' && Object.entries(groups).sort(([a], [b]) => b.localeCompare(a)).map(([month, categories]) => <section className="history-group" key={month}>
      <div className="group-heading"><h2>{new Date(`${month}-01T12:00:00`).toLocaleDateString('en', { month: 'long', year: 'numeric' })}</h2><span>{Object.values(categories).flat().length} transactions</span></div>
      {Object.entries(categories).sort(([a], [b]) => a.localeCompare(b)).map(([category, rows]) => <div className="category-group" key={category}>
        <div className="category-group-heading"><span>{category}</span><span>{rows.length}</span></div>
          <div className="transaction-list glass-panel">{rows.map((item) => <article className="transaction-row" key={item.id}>
          <span className={`transaction-kind ${item.type}`} aria-hidden="true">{item.type === 'income' ? <ArrowDownLeft size={18}/> : <ArrowUpRight size={18}/>}</span>
          <div className="transaction-description"><strong>{item.label}</strong><span>{readableDate(item.date)} · {{ one_time: 'One time', monthly: 'Monthly', yearly: 'Yearly' }[item.frequency || 'one_time']}</span></div>
          <strong className={`transaction-amount ${item.type}`}>{item.type === 'income' ? '+' : '−'}{money(item.amount)}</strong>
          <button className="transaction-delete" type="button" aria-label={`Delete ${item.type}: ${item.label}`} title="Delete transaction" disabled={deleting === item.id} onClick={() => removeTransaction(item)}><X size={16}/></button>
        </article>)}</div>
      </div>)}
    </section>)}
  </section>
}
