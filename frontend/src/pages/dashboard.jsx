import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, Wallet } from 'lucide-react'
import { useAuth } from '../context/authContext'
import CoinIcon from '../components/CoinIcon'
import { api } from '../lib/api'
import { getCachedTransactions, setCachedTransactions } from '../lib/transactionCache'
import { money } from '../lib/utils'
import './dashboard.css'

const today = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())

export default function Dashboard() {
  const { user, space } = useAuth()
  const navigate = useNavigate()
  const cardRef = useRef(null)
  const coinRef = useRef(null)
  const rollTimer = useRef(null)
  const hasLeft = useRef(false)
  const [rolling, setRolling] = useState(false)
  const [transactions, setTransactions] = useState(() => getCachedTransactions(user.id, space.id) || [])
  const [statsKey, setStatsKey] = useState(() => `${user.id}:${space.id}`)
  const currentStatsKey = `${user.id}:${space.id}`
  const statsReady = statsKey === currentStatsKey

  useEffect(() => {
    let alive = true
    api(`/transactions/${space.id === 'private' ? '' : `?household_id=${encodeURIComponent(space.id)}`}`)
      .then((rows) => {
        if (!alive) return
        const data = rows || []
        setCachedTransactions(user.id, space.id, data)
        setTransactions(data)
        setStatsKey(currentStatsKey)
      })
      .catch(() => { if (alive) { setTransactions(getCachedTransactions(user.id, space.id) || []); setStatsKey(currentStatsKey) } })
    return () => { alive = false }
  }, [space.id, user.id])

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthTransactions = transactions.filter((item) => String(item.date || '').startsWith(currentMonth))
  const income = monthTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const expenses = monthTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const net = income - expenses

  // Go to the log page once the coin has rolled away (guarded so it only happens once)
  function finishRoll() {
    if (hasLeft.current) return
    hasLeft.current = true
    navigate('/log')
  }

  function rollToLog(event) {
    // Let the browser handle ctrl/cmd-click, middle-click, etc. (open in a new tab)
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    if (rolling) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finishRoll(); return }

    // Roll far enough to leave the card, spinning exactly as much as a real coin would
    const card = cardRef.current.getBoundingClientRect()
    const coin = coinRef.current.getBoundingClientRect()
    const distance = card.right - coin.left + 8
    const spin = (distance / (coin.width / 2)) * (180 / Math.PI)
    coinRef.current.style.setProperty('--roll-x', `${distance}px`)
    coinRef.current.style.setProperty('--roll-spin', `${spin}deg`)
    setRolling(true)
    rollTimer.current = window.setTimeout(finishRoll, 800) // safety net if animationend never fires
  }

  useEffect(() => () => window.clearTimeout(rollTimer.current), [])

  return (
    <section className="page dashboard-page">
      <div className="dashboard-topbar">
        <Link to="/settings" className="dashboard-settings-coin" aria-label="Open settings" title="Settings">
          <span className="brand-mark"><CoinIcon size={28} /></span>
        </Link>
        <div className="page-kicker"><span className="kicker-dot" /> {today.toUpperCase()}</div>
      </div>

      <div className="dashboard-heading">
        <div>
          <h1>Welcome back, <em>{user.username}</em></h1>
          <p className="page-intro">A clear view of your money starts here.</p>
        </div>
      </div>

      <section className="dashboard-stats" aria-label="This month at a glance">
        <div className="dashboard-stat-card">
          <span className="dashboard-stat-icon income"><ArrowUpRight size={17} aria-hidden="true" /></span>
          <span className="dashboard-stat-label">INCOME</span>
          <strong>{statsReady ? money(income) : '—'}</strong>
          <small>This month</small>
        </div>
        <div className="dashboard-stat-card">
          <span className="dashboard-stat-icon expense"><ArrowDownRight size={17} aria-hidden="true" /></span>
          <span className="dashboard-stat-label">SPENT</span>
          <strong>{statsReady ? money(expenses) : '—'}</strong>
          <small>This month</small>
        </div>
        <div className="dashboard-stat-card">
          <span className="dashboard-stat-icon net"><Wallet size={16} aria-hidden="true" /></span>
          <span className="dashboard-stat-label">NET</span>
          <strong className={net < 0 ? 'negative' : ''}>{statsReady ? money(net) : '—'}</strong>
          <small>Income minus spending</small>
        </div>
      </section>

      {/* Start card: the coin rolls away, then opens the log page */}
      <section className="start-card glass-panel" ref={cardRef}>
        <div className="start-copy">
          <h2>Start understanding your money.</h2>
          <p>Click the coin to start saving.</p>
        </div>
        <Link
          to="/log"
          ref={coinRef}
          className={`coin${rolling ? ' coin-rolling' : ''}`}
          onClick={rollToLog}
          onAnimationEnd={(event) => { if (event.animationName === 'coin-roll') finishRoll() }}
          aria-label="Start saving: log an expense or income"
          title="Log expense or income"
        >
          <span className="coin-glyph" aria-hidden="true">₪</span>
        </Link>
      </section>

    </section>
  )
}
