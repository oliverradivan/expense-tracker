import { NavLink } from 'react-router-dom'
import { House, List, Plus, ChartNoAxesColumn, Settings } from 'lucide-react'
import './NavBar.css'
const links = [
  { to: '/', label: 'Dashboard', icon: House, end: true },
  { to: '/history', label: 'History', icon: List },
  { to: '/log', label: 'Log Expense', icon: Plus, center: true },
  { to: '/review', label: 'Month in Review', icon: ChartNoAxesColumn },
  { to: '/settings', label: 'Settings', icon: Settings },
]
export default function NavBar() { return <nav className="bottom-nav" aria-label="Main navigation">{links.map(({ to, label, icon: Icon, center, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item${center ? ' nav-add' : ''}${isActive ? ' active' : ''}`}><span className="nav-icon"><Icon size={center ? 22 : 19} strokeWidth={2} /></span><span className="nav-label">{label}</span></NavLink>)}</nav> }
