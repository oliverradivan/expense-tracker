import { Link } from 'react-router-dom'
import './404.css'

function NotFoundPage() {
  return (
      <div className="not-found-page">
        {/* Sits behind the glass so the card has something to bend */}
        <span className="not-found-ghost" aria-hidden="true">
          404
        </span>

        <div className="not-found-card glass">
          <h1>Page not found</h1>
          <p>The page you are looking for does not exist.</p>
          <Link to="/Login" className="primary-btn">
            Turn Back
          </Link>
        </div>
      </div>
  )
}

export default NotFoundPage
