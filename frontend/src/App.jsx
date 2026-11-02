import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useAuth } from './context/authContext'
import Layout from './components/layout'
import CoinIcon from './components/CoinIcon'
import Skeleton from './components/Skeleton'
import Login from './pages/login'
import Register from './pages/register'
import Dashboard from './pages/dashboard'
import History from './pages/history'
import LogExpense from './pages/logexpense'
import MIR from './pages/MIR'
import Settings from './pages/settings'
import Household from './pages/Household'
import Planning from './pages/Planning'
import NotFoundPage from './pages/404'
import LGDefs from './components/LGDefs'
import './App.css'

function Gate({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  const { user, loading } = useAuth()
  const [introComplete, setIntroComplete] = useState(false)
  const [splashGone, setSplashGone] = useState(false)
  const splashRef = useRef(null)
  const markRef = useRef(null)
  const ready = !loading && introComplete

  useEffect(() => { const timer = setTimeout(() => setIntroComplete(true), 620); return () => clearTimeout(timer) }, [])

  // Hand the startup coin off to the Dashboard's central action coin once it exists.
  useLayoutEffect(() => {
    if (!ready || splashGone) return
    const splash = splashRef.current
    const mark = markRef.current
    const target = document.querySelector('.start-card .coin')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!splash || !mark || !target || reduceMotion) {
      const timer = window.setTimeout(() => setSplashGone(true), 0)
      return () => window.clearTimeout(timer)
    }

    target.style.visibility = 'hidden'
    const from = mark.getBoundingClientRect()
    const to = target.getBoundingClientRect()
    const dx = to.left + to.width / 2 - from.left - from.width / 2
    const dy = to.top + to.height / 2 - from.top - from.height / 2
    const scale = to.width / from.width
    const flight = mark.animate([
      { transform: 'translate(0, 0) scale(1)' },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
    ], { duration: 850, easing: 'cubic-bezier(.5, 0, .2, 1)', fill: 'forwards' })
    splash.querySelector('.startup-backdrop')?.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: 700, easing: 'ease', fill: 'forwards' },
    )
    splash.querySelectorAll('.startup-fade').forEach((element) => {
      element.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, easing: 'ease', fill: 'forwards' })
    })
    let fallback
    const finish = () => {
      window.clearTimeout(fallback)
      target.style.visibility = ''
      setSplashGone(true)
    }
    flight.onfinish = finish
    fallback = window.setTimeout(finish, 1400)
    return () => {
      window.clearTimeout(fallback)
      flight.cancel()
      target.style.visibility = ''
    }
  }, [ready, splashGone])

  return <>
    {ready && <>
      <LGDefs />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
        <Route element={<Gate><Layout /></Gate>}>
          <Route index element={<Dashboard />} />
          <Route path="/history" element={<History />} />
          <Route path="/log" element={<LogExpense />} />
          <Route path="/review" element={<MIR />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/household" element={<Household />} />
          <Route path="/planning" element={<Planning />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>}
    {(!ready || !splashGone) && (
      <div className="startup" ref={splashRef} role="status" aria-label="Loading dashboard">
        <div className="startup-backdrop" />
        <div className="startup-skeleton startup-fade" aria-hidden="true">
          <div className="startup-skeleton-top">
            <Skeleton style={{ width: 44, height: 44, borderRadius: 16 }} />
            <Skeleton style={{ width: 126, height: 10 }} />
          </div>
          <div className="startup-skeleton-heading">
            <Skeleton style={{ width: 'min(60%, 420px)', height: 46 }} />
            <Skeleton style={{ width: 196, height: 12 }} />
          </div>
          <div className="startup-skeleton-stats">
            {[0, 1, 2].map((item) => (
              <div className="startup-skeleton-stat" key={item}>
                <Skeleton style={{ width: 32, height: 32, borderRadius: 10 }} />
                <Skeleton style={{ width: '62%', height: 10 }} />
                <Skeleton style={{ width: '82%', height: 18 }} />
              </div>
            ))}
          </div>
          <div className="startup-skeleton-card">
            <div>
              <Skeleton style={{ width: 220, maxWidth: '100%', height: 18 }} />
              <Skeleton style={{ width: 156, height: 10, marginTop: 10 }} />
            </div>
            <Skeleton style={{ width: 88, height: 88, borderRadius: '50%' }} />
          </div>
        </div>
        <div className="startup-mark" ref={markRef}>
          <CoinIcon size={53} />
        </div>
        <span className="sr-only">Loading dashboard…</span>
      </div>
    )}
  </>
}
