import { Outlet } from 'react-router-dom'
import NavBar from './NavBar'
import './Layout.css'

function Layout() {
  return (
    <div className="app-shell">
      <Outlet />
      <NavBar />
    </div>
  )
}

export default Layout