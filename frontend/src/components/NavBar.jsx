import { NavLink, useLocation } from 'react-router-dom'
import { House, LayoutGrid, List, Plus, ChartNoAxesColumn } from 'lucide-react'
import './NavBar.css'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/history', label: 'History', icon: List },
  { to: '/log', label: 'Log Expense', icon: Plus, center: true },
  { to: '/review', label: 'Review', icon: ChartNoAxesColumn },
  { to: '/household', label: 'Household', icon: House },
]

export default function NavBar() {
  const { pathname } = useLocation()
  const index = links.findIndex(({ to }) => to === pathname)
  
  return (
    <nav className={`bottom-nav glass-panel${index < 0 ? ' nav-no-active' : ''}`} aria-label="Main navigation" style={{ '--nav-index': Math.max(index, 0) }}>
      <span className="nav-slider" aria-hidden="true" />
      {links.map(({ to, label, icon: Icon, center, end }) => (
        <NavLink 
          key={to} 
          to={to} 
          end={end} 
          aria-label={label}
          className={({ isActive }) => `nav-item${center ? ' nav-add' : ''}${isActive ? ' active' : ''}`}
        >
          <span className="nav-icon">
            <Icon size={center ? 22 : 19} strokeWidth={2} />
          </span>
          <span className="nav-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
