import { useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useOutlet, Link } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import NavBar from './NavBar'
import CoinIcon from './CoinIcon'
import Login from '../pages/login'
import './Layout.css'

const SLIDE_MS = 300

export default function Layout() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [pageTransition, setPageTransition] = useState(null)
  const [logoutPage, setLogoutPage] = useState(null)
  const activePage = useRef(null)
  const timer = useRef(null)
  const logoutTimer = useRef(null)
  const touchStart = useRef(null)
  const outlet = useOutlet({ onLogout: beginLogout })
  const pages = ['/', '/history', '/log', '/review', '/household']

  if (!activePage.current) activePage.current = { path: location.pathname, element: outlet }
  if (!pageTransition && activePage.current.path === location.pathname) activePage.current.element = outlet

  function beginLogout() {
    if (logoutTimer.current) return
    const settingsPage = activePage.current?.element
    setLogoutPage(settingsPage)
    logoutTimer.current = window.setTimeout(async () => {
      await signOut()
      navigate('/login', { replace: true })
      logoutTimer.current = null
    }, SLIDE_MS)
  }

  useLayoutEffect(() => {
    const previous = activePage.current
    if (!previous || previous.path === location.pathname) {
      activePage.current = { path: location.pathname, element: outlet }
      return undefined
    }

    const fromDashboardToSettings = previous.path === '/' && location.pathname === '/settings'
    const fromSettingsToDashboard = previous.path === '/settings' && location.pathname === '/'
    if (fromDashboardToSettings || fromSettingsToDashboard) {
      window.clearTimeout(timer.current)
      setPageTransition({
        direction: fromDashboardToSettings ? 'settings-enter' : 'settings-exit',
        from: previous.element,
        to: outlet,
      })
      activePage.current = { path: location.pathname, element: outlet }
      timer.current = window.setTimeout(() => {
        setPageTransition(null)
      }, SLIDE_MS)
      return () => window.clearTimeout(timer.current)
    }

    activePage.current = { path: location.pathname, element: outlet }
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

  const transitioningFromDashboard = pageTransition?.direction === 'settings-enter'

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
    {(location.pathname === '/' || transitioningFromDashboard) && !logoutPage && (
      <Link to="/settings" className="dashboard-settings-coin" aria-label="Open settings" title="Settings">
        <span className="brand-mark"><CoinIcon size={28} /></span>
      </Link>
    )}
    {!logoutPage && <NavBar />}
    {logoutPage && <div className="settings-logout-transition">
      <div className="logout-login-base"><div className="main-content"><Login /></div></div>
      <div className="settings-slide-layer settings-slide-out-right"><div className="main-content settings-slide-content">{logoutPage}</div></div>
    </div>}
  </div>
}
