import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import { AuthFrame } from './login'
import './register.css'

export default function Register() {
  const { signUp } = useAuth()
  const nav = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (password.length < 7) {
      setError('Password must be at least 7 characters.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await signUp(username, password)
      nav('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame
      title="Make it yours."
      subtitle="Create a private log of your everyday finances."
      footer={
        <>
          Already have an account? <Link to="/login">Sign in</Link>
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
            minLength={3}
            maxLength={30}
            pattern="[A-Za-z0-9_]+"
            required
          />
          <span className="field-help">3–30 letters, numbers, or underscores</span>
        </label>

        <label className="field">
          <span className="password-input-control">
            <input
              placeholder="Password"
              aria-label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={7}
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
          <span className="field-help">At least 7 characters</span>
        </label>

        {error && (
          <p role="alert" className="notice error-notice">
            {error}
          </p>
        )}

        <button className="primary-button" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthFrame>
  )
}