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
  const spiritOrbitRef = useRef(null)
  const ready = !loading && introComplete

  useEffect(() => { const timer = setTimeout(() => setIntroComplete(true), 620); return () => clearTimeout(timer) }, [])

  // When the app is ready, the spirit dives into the splash coin and sends it to Settings.
  useLayoutEffect(() => {
    if (!ready || splashGone) return
    const splash = splashRef.current
    const mark = markRef.current
    const brand = document.querySelector('.dashboard-settings-coin .brand-mark')
    const target = brand ? (brand.firstElementChild || brand) : null
    let finished = false
    let fallback
    let inward
    let flight

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

    function launchCoin() {
      if (finished) return
      // The spirit lands in the coin, which recoils slightly before flying to its link.
      flight = mark.animate(
        [
          { transform: 'translate(0px, 0px) scale(1)', offset: 0 },
          { transform: `translate(${-dx * 0.012}px, ${-dy * 0.012}px) scale(1.08)`, offset: 0.12 },
          { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, offset: 1 },
        ],
        { duration: 750, easing: 'cubic-bezier(.65, 0, .2, 1)', fill: 'forwards' },
      )
      splash.querySelector('.startup-backdrop')?.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 650, easing: 'ease', fill: 'forwards' },
      )
      splash.querySelectorAll('.startup-fade').forEach((el) => {
        el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: 'ease', fill: 'forwards' })
      })
      flight.onfinish = finish
    }

    if (spiritOrbitRef.current) {
      inward = spiritOrbitRef.current.animate(
        [{ scale: 1 }, { scale: 0.02 }],
        { duration: 600, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'forwards' },
      )
      inward.onfinish = launchCoin
    } else {
      launchCoin()
    }

    fallback = window.setTimeout(finish, 1800)
    return () => {
      inward?.cancel()
      flight?.cancel()
      if (target) target.style.visibility = ''
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
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>}
    {(!ready || !splashGone) && (
      <div className="startup" ref={splashRef}>
        <div className="startup-backdrop" />
        <svg className="startup-spirit-track startup-fade" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="startup-spirit-ribbon" x1="0" y1="0" x2=".2" y2="1">
              <stop offset="0" stopColor="#FFF1B8" stopOpacity=".98" />
              <stop offset=".2" stopColor="#FFB347" stopOpacity=".82" />
              <stop offset=".58" stopColor="#F27835" stopOpacity=".38" />
              <stop offset="1" stopColor="#C55BFF" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="startup-spirit-wisp" x1="0" y1="0" x2=".3" y2="1">
              <stop offset="0" stopColor="#FFF7D6" stopOpacity=".95" />
              <stop offset=".38" stopColor="#FF9F55" stopOpacity=".58" />
              <stop offset="1" stopColor="#F27835" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="startup-spirit-core">
              <stop stopColor="#FFFBEA" />
              <stop offset=".5" stopColor="#FFD27A" />
              <stop offset="1" stopColor="#F28C28" stopOpacity="0" />
            </radialGradient>
          </defs>
          <g ref={spiritOrbitRef} className="startup-spirit-orbit">
            <g className="startup-spirit-ribbons">
              <path className="startup-ribbon-glow" d="M500 53C486 91 427 110 382 145C331 184 291 225 234 244C307 239 361 214 413 184C470 151 491 110 500 53Z" />
              <path className="startup-ribbon-main" d="M500 45C491 88 452 112 418 144C377 183 348 218 292 247C355 235 408 209 449 176C489 144 502 97 500 45Z" />
              <path className="startup-ribbon-highlight" d="M498 53C481 104 446 127 415 158C389 184 365 211 333 227C390 206 433 181 464 148C488 123 500 87 498 53Z" />
              <path className="startup-ribbon-wisp startup-ribbon-wisp-one" d="M489 65C458 102 409 121 367 150C323 181 294 209 257 219C306 211 354 194 397 166C438 140 473 111 489 65Z" />
              <path className="startup-ribbon-wisp startup-ribbon-wisp-two" d="M504 67C498 118 467 157 442 193C423 220 405 249 374 274C421 247 458 216 480 177C500 142 508 104 504 67Z" />
              <path className="startup-ribbon-thread" d="M495 62C471 113 425 140 389 176C354 210 330 233 297 247" />
              <path className="startup-ribbon-thread startup-ribbon-thread-two" d="M503 67C490 125 455 165 432 205C416 234 403 254 385 271" />
            </g>
            <g className="startup-spirit">
              <circle className="startup-spirit-aura" cx="500" cy="35" r="23" />
              <path className="startup-spirit-sweep" d="M500 4C512 19 513 27 508 36C505 42 500 45 496 51C493 43 484 39 485 29C486 20 494 14 500 4Z" />
              <path className="startup-spirit-sweep-inner" d="M501 19C508 27 503 33 498 39C496 34 492 31 495 26C496 23 499 21 501 19Z" />
            </g>
          </g>
        </svg>
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
