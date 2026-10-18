import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { useAuth } from '../context/authContext'
import NavBar from './NavBar'
import WalletIcon from './WalletIcon'
import './Layout.css'
export default function Layout() {
  const { user, households, space, selectSpace } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const touchStart = useRef(null)
  const pages = ['/', '/history', '/log', '/review', '/settings']

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
    <header className="topbar glass-panel"><a href="/" className="wordmark"><span className="brand-mark"><WalletIcon /></span><span>fathom<span className="wordmark-dot">.</span></span></a><div className="topbar-right"><label className="space-select-wrap"><span className="sr-only">Financial space</span><select value={space.id} onChange={(e) => selectSpace(e.target.value)}><option value="private">Personal Account</option>{households.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select><ChevronDown size={15} /></label><span className="user-avatar" title={user?.username}>{user?.username?.slice(0, 1).toUpperCase()}</span></div></header>
    <main key={location.pathname} className="main-content page-slide-in" onTouchStart={(event) => { const touch = event.touches[0]; touchStart.current = { x: touch.clientX, y: touch.clientY } }} onTouchEnd={handleTouchEnd}><Outlet /></main><NavBar />
  </div>
}
