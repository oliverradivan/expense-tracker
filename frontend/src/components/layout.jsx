import { useParams } from 'react-router-dom'
import NavBar from './NavBar'
import './Layout.css'
import Dashboard from '../pages/Dashboard'
import History from '../pages/History'
import LogExpense from '../pages/LogExpense'
import Progress from '../pages/Progress'
import Settings from '../pages/Settings'

function Layout() {
  const { page } = useParams()
  const pageMap = {
    dashboard: Dashboard,
    history: History,
    logexpense: LogExpense,
    progress: Progress,
    settings: Settings,
  }
  const PageComponent = pageMap[page]
  if (!PageComponent) {
    return (
      <div className="app-shell">
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Page not found</h2>
          <p>The page you are looking for does not exist.</p>
        </div>
        <NavBar />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <PageComponent />
      <NavBar />
    </div>
  )
}

export default Layout