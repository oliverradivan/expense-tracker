import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/authContext'
import './Login.css'
import LGDefs from '../components/LGDefs'

const initialForm = {
  username: '',
  password: '',
}

function LoginPage() {
  const [form, setForm] = useState(initialForm)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const { handleAuth, loading, message, setMessage } = useAuth()

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage('')

    const result = await handleAuth(form, 'login')
    if (result?.success) {
      navigate('/Dashboard')
    }
  }

  return (
    <>
    <LGDefs />
    <main className="login-container">
      <div className="auth-shell login-page">
        <div className="auth-card login-card">
          <div className="auth-header">
            <div className="brand-badge" aria-hidden="true">
<svg className="logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="1.1" focusable="false">
  <rect x="2" y="5" width="20" height="14" rx="3" />
  <rect x="4.5" y="8.5" width="3.5" height="3" rx=".8" />
  <path d="M5 15.5h4" />
  <path d="M13 10.5a2 2 0 0 1 0 3" />
  <path d="M15.2 9a4 4 0 0 1 0 6" />
  <path d="M17.4 8a5 5 0 0 1 0 8" />
</svg>
            </div>
            <h1>Welcome back</h1>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="field">
              <input
                id="login-username"
                type="text"
                name="username"
                placeholder="Username"
                value={form.username}
                onChange={handleChange}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="login-password"></label>
              <div className="password-field">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  enterKeyHint="go"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label="Show password"
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff size={20} aria-hidden="true" />
                  ) : (
                    <Eye size={20} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {message && (
              <p className="status-message" role="alert">
                {message}
              </p>
            )}

            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          <p className="auth-switch">
            New here? <Link to="/register">Create an account</Link>
          </p>
        </div>
      </div>
    </main>
    </>
  )
}

export default LoginPage