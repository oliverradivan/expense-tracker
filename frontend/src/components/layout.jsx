import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useOutlet } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import NavBar from './NavBar'
import Login from '../pages/login'
import './Layout.css'

const SLIDE_MS = 300
const SETTINGS_EXIT_MS = 560

export default function Layout() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [pageTransition, setPageTransition] = useState(null)
  const [logoutPage, setLogoutPage] = useState(null)
  const activePage = useRef({ path: null, element: null })
  const timer = useRef(null)
  const logoutTimer = useRef(null)
  const touchStart = useRef(null)
  const beginLogout = useCallback(() => {
    if (logoutTimer.current) return
    const settingsPage = activePage.current?.element
    setLogoutPage(settingsPage)
    logoutTimer.current = window.setTimeout(async () => {
      await signOut()
      navigate('/login', { replace: true })
      logoutTimer.current = null
    }, SLIDE_MS)
  }, [navigate, signOut])
  const outletContext = useMemo(() => ({ onLogout: beginLogout }), [beginLogout])
  const outlet = useOutlet(outletContext)
  const outletRef = useRef(outlet)
  const pages = ['/', '/history', '/log', '/review', '/household']

  useLayoutEffect(() => {
    outletRef.current = outlet
  }, [outlet])

  useLayoutEffect(() => {
    const previous = activePage.current
    if (!previous.path || previous.path === location.pathname) {
      activePage.current = { path: location.pathname, element: previous.element || outletRef.current }
      return undefined
    }

    const fromDashboardToSettings = previous.path === '/' && location.pathname === '/settings'
    const fromSettingsToDashboard = previous.path === '/settings' && location.pathname === '/'
    if (fromDashboardToSettings || fromSettingsToDashboard) {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const transitionDuration = reducedMotion
        ? 1
        : fromSettingsToDashboard ? SETTINGS_EXIT_MS : SLIDE_MS
      window.clearTimeout(timer.current)
      setPageTransition({
        direction: fromDashboardToSettings ? 'settings-enter' : 'settings-exit',
        from: previous.element,
        to: outletRef.current,
      })
      activePage.current = { path: location.pathname, element: outletRef.current }
      timer.current = window.setTimeout(() => {
        setPageTransition(null)
      }, transitionDuration)
      return () => window.clearTimeout(timer.current)
    }

    activePage.current = { path: location.pathname, element: outletRef.current }
    setPageTransition(null)
    return undefined
  }, [location.pathname])

  useLayoutEffect(() => () => {
    window.clearTimeout(timer.current)
    window.clearTimeout(logoutTimer.current)
  }, [])

  function handleTouchEnd(event) {
    if (!touchStart.current || event.changedTouches.length === 0) return
    const start = touchStart.current
    touchStart.current = null
    const touch = event.changedTouches[0]
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (Math.abs(dx) < 76 || Math.abs(dx) < Math.abs(dy) * 1.25) return
    const target = event.target
    if (target instanceof Element && target.closest('a,button,input,select,textarea,[role="button"]')) return
    const index = pages.indexOf(location.pathname)
    if (index < 0) return
    const next = pages[index + (dx < 0 ? 1 : -1)]
    if (next) navigate(next)
  }

  return <div className="app-shell">
    <main className="main-content" onTouchStart={(event) => {
      const touch = event.touches[0]
      touchStart.current = { x: touch.clientX, y: touch.clientY }
    }} onTouchEnd={handleTouchEnd}>
      {!logoutPage && !pageTransition && outlet}
      {!logoutPage && pageTransition?.direction === 'settings-enter' && <>
        <div className="route-base">{pageTransition.from}</div>
        <div className="settings-slide-layer settings-slide-in"><div className="main-content settings-slide-content">{pageTransition.to}</div></div>
      </>}
      {!logoutPage && pageTransition?.direction === 'settings-exit' && <>
        <div className="route-base">{pageTransition.to}</div>
        <div className="settings-slide-layer settings-slide-out-left"><div className="main-content settings-slide-content">{pageTransition.from}</div></div>
      </>}
    </main>
    {!logoutPage && location.pathname !== '/settings' && <NavBar />}
    {logoutPage && <div className="settings-logout-transition">
      <div className="logout-login-base"><div className="main-content"><Login /></div></div>
      <div className="settings-slide-layer settings-slide-out-right"><div className="main-content settings-slide-content">{logoutPage}</div></div>
    </div>}
  </div>
}
