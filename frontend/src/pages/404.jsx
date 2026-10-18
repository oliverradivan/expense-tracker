import { Link } from 'react-router-dom'
import './404.css'
import AuroraBackground from '../components/AuroraBackground'

function NotFoundPage() {
  return (
    <AuroraBackground>
      <div className="not-found-page">
        {/* Sits behind the glass so the card has something to bend */}
        <span className="not-found-ghost" aria-hidden="true">
          404
        </span>

        <div className="not-found-card glass-panel">
          <h1>Page not found</h1>
          <p>The page you are looking for does not exist.</p>
          <Link to="/" className="primary-btn">
            Back to fathom
          </Link>
        </div>
      </div>
    </AuroraBackground>
  )
}

export default NotFoundPage
