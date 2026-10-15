import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import './Register.css'
import { Eye, EyeOff } from 'lucide-react'
import LiquidGlassDefs from '../components/LGDefs.jsx'

const initialForm = {
  username: '',
  email: '',
  password: '',
}

function RegisterPage() {
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

    const result = await handleAuth(form, 'register')

    if (result?.success) {
      navigate('/login')
    }
  }

  return (
   <>
    <LiquidGlassDefs />
    <main className="register-container">
      <div className="register-shell">
        <div className="register-card">
          <div className="register-header">
            <div
              className="register-brand-badge"
              aria-label="Workout Tracker"
            >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="1.1" focusable="false">
              <rect x="2" y="5" width="20" height="14" rx="3" />
              <rect x="4.5" y="8.5" width="3.5" height="3" rx=".8" />
              <path d="M5 15.5h4" />
              <path d="M13 10.5a2 2 0 0 1 0 3" />
              <path d="M15.2 9a4 4 0 0 1 0 6" />
              <path d="M17.4 8a5 5 0 0 1 0 8" />
            </svg>
            </div>

            <h1>Create your account</h1>
          </div>

          <form onSubmit={handleSubmit} className="register-form">
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
            />

            <input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />

            <div className="register-password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Password (at least 10 characters)"
                autoComplete="new-password"
                minLength={10}
                required
              />

              <button
                type="button"
                className="register-password-toggle"
                onClick={() =>
                  setShowPassword((prev) => !prev)
                }
                aria-label={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <EyeOff size={18} aria-hidden="true" />
                ) : (
                  <Eye size={18} aria-hidden="true" />
                )}
              </button>
            </div>

            <button
              type="submit"
              className="register-primary-btn"
              disabled={loading}
            >
              {loading ? 'Please wait...' : 'Register'}
            </button>
          </form>

          <p className="register-auth-switch">
            Already have an account?{' '}
            <Link to="/login">Login</Link>
          </p>

          {message && (
            <p className="register-status-message" role="alert">
              {message}
            </p>
          )}
        </div>
      </div>
    </main>
   </>
  )
}

export default RegisterPage