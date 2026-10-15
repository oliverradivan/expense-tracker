import { Outlet } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { useAuth } from '../context/authContext'
import NavBar from './NavBar'
import './Layout.css'
export default function Layout() {
  const { user, households, space, selectSpace } = useAuth()
  return <div className="app-shell">
    <header className="topbar"><a href="/" className="wordmark"><span className="brand-mark">₪</span><span>ledger<span className="wordmark-dot">.</span></span></a><div className="topbar-right"><label className="space-select-wrap"><span className="sr-only">Financial space</span><select value={space.id} onChange={(e) => selectSpace(e.target.value)}><option value="private">My Private Account</option>{households.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select><ChevronDown size={15} /></label><span className="user-avatar" title={user?.username}>{user?.username?.slice(0, 1).toUpperCase()}</span></div></header>
    <main className="main-content"><Outlet /></main><NavBar />
  </div>
}
