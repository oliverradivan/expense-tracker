import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useAuth } from './context/authContext'
import Layout from './components/layout'
import CoinIcon from './components/CoinIcon'
import Login from './pages/login'
import Register from './pages/register'
import Dashboard from './pages/dashboard'
import History from './pages/history'
import LogExpense from './pages/logexpense'
import MIR from './pages/MIR'
import Settings from './pages/settings'
import Household from './pages/Household'
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

  // When the app is ready on Dashboard, fly the splash coin to the Settings shortcut.
  useLayoutEffect(() => {
    if (!ready || splashGone) return
    const splash = splashRef.current
    const mark = markRef.current
    const brand = document.querySelector('.brand-mark')
    const target = brand ? (brand.firstElementChild || brand) : null
    let finished = false
    let fallback

    function finish() {
      if (finished) return
      finished = true
      window.clearTimeout(fallback)
      if (target) target.style.visibility = ''
      setSplashGone(true)
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // No splash, no Dashboard coin target, or reduced motion: just leave.
    if (!splash || !mark || !target || reduceMotion) { finish(); return }

    splash.classList.add('startup-leaving')
    target.style.visibility = 'hidden' // the real coin appears when the flying one lands

    const from = mark.getBoundingClientRect()
    const to = target.getBoundingClientRect()
    const dx = (to.left + to.width / 2) - (from.left + from.width / 2)
    const dy = (to.top + to.height / 2) - (from.top + from.height / 2)
    const scale = to.width / from.width

    const flight = mark.animate(
      [
        { transform: 'translate(0px, 0px) scale(1)' },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
      ],
      { duration: 750, easing: 'cubic-bezier(.65, 0, .2, 1)', fill: 'forwards' },
    )
    // the background and the extras fade away while the coin travels
    splash.querySelector('.startup-backdrop')?.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: 650, easing: 'ease', fill: 'forwards' },
    )
    splash.querySelectorAll('.startup-fade').forEach((el) => {
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: 'ease', fill: 'forwards' })
    })

    flight.onfinish = finish
    fallback = window.setTimeout(finish, 1500) // safety net
    return () => { if (target) target.style.visibility = '' }
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
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>}
    {(!ready || !splashGone) && (
      <div className="startup" ref={splashRef}>
        <div className="startup-backdrop" />
        <div className="startup-mark" ref={markRef}>
          <CoinIcon size={53} />
          <i className="startup-fade" />
        </div>
        <p className="startup-fade">Making room for a clearer picture</p>
        <span className="startup-loader startup-fade" />
      </div>
    )}
  </>
}
