import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import WalletIcon from '../components/WalletIcon'
import './login.css'

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <main className="auth-screen">
      <div className="auth-brand">
        <WalletIcon size={33} />fathom
      </div>
      <div className="auth-panel glass-panel">
        <span className="page-kicker">
          <span className="kicker-dot" /> YOUR FINANCES, MADE CLEAR
        </span>
        <h1>{title}</h1>
        <p className="page-intro">{subtitle}</p>
        {children}
        <p className="auth-footer">{footer}</p>
      </div>
      <span className="auth-note">A little more clarity, every day.</span>
    </main>
  )
}

export function AuthFrame(props) {
  return <AuthShell {...props} />
}

export default function Login() {
  const { signIn } = useAuth()
  const nav = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signIn(username, password)
      nav('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      footer={
        <>
          New to fathom? <Link to="/register">Create an account</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={submit}>
        <label className="field">
          <input
            placeholder="Username"
            aria-label="Username"
            autoComplete="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            autoFocus
          />
        </label>

        <label className="field">
          <span className="password-input-control">
            <input
              placeholder="Password"
              aria-label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-visibility-button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword(value => !value)}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
        </label>

        {error && (
          <p role="alert" className="notice error-notice">
            {error}
          </p>
        )}

        <button className="primary-button" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  )
}
