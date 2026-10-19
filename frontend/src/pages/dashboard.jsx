import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import './dashboard.css'

const today = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const cardRef = useRef(null)
  const coinRef = useRef(null)
  const rollTimer = useRef(null)
  const hasLeft = useRef(false)
  const [rolling, setRolling] = useState(false)

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
      <div className="page-kicker"><span className="kicker-dot" /> {today.toUpperCase()}</div>

      <div className="dashboard-heading">
        <div>
          <h1>Welcome back, <em>{user.username}</em></h1>
          <p className="page-intro">A clear view of your money starts here.</p>
        </div>
      </div>

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
