import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Monitor,
  Moon,
  Pencil,
  Plus,
  SlidersHorizontal,
  Sun,
  Tag,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { api, post } from '../lib/api'
import { useAuth } from '../context/authContext'
import { useTheme } from '../context/themecontext'
import AuroraBackground from '../components/AuroraBackground'
import './settings.css'

function Feedback({ error, ok }) {
  return (
    <>
      {error && <p className="notice error-notice">{error}</p>}
      {ok && (
        <p className="notice success-notice">
          <Check size={15} />
          {ok}
        </p>
      )}
    </>
  )
}

export default function Settings() {
  const { user, space, signOut } = useAuth()
  const { onLogout } = useOutletContext()
  const navigate = useNavigate()
  const { mode, setTheme } = useTheme()

  // Account / password state
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '' })
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Tabs
  const [tab, setTab] = useState('preferences')

  // Category state
  const [categories, setCategories] = useState([])
  const [categoryType, setCategoryType] = useState('expense')
  const [newCategory, setNewCategory] = useState('')
  const [editingCategory, setEditingCategory] = useState(null)
  const [categoryBusy, setCategoryBusy] = useState(false)
  const [categoryError, setCategoryError] = useState('')
  const [categoryOk, setCategoryOk] = useState('')

  const householdQuery =
    space.id === 'private' ? '' : `?household_id=${encodeURIComponent(space.id)}`

  useEffect(() => {
    let active = true

    api(`/transactions/categories/manage${householdQuery}`)
      .then(result => {
        if (active) {
          setCategories(result || [])
          setCategoryError('')
        }
      })
      .catch(err => {
        if (active) setCategoryError(err.message)
      })

    return () => {
      active = false
    }
  }, [householdQuery])

  async function run(action, message) {
    setError('')
    setOk('')
    setBusy(true)
    try {
      await action()
      setOk(message)
      return true
    } catch (e) {
      setError(e.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  async function changePassword(event) {
    event.preventDefault()
    const success = await run(() => post('/auth/password', passwords), 'Password changed.')
    if (success) setPasswords({ current_password: '', new_password: '' })
  }

  async function deleteAccount() {
    const password = prompt(
      'Enter your password to permanently delete your account. Shared household records are retained.'
    )
    if (password === null) return

    setError('')
    setOk('')
    setBusy(true)
    try {
      await api('/auth/me', { method: 'DELETE', body: new URLSearchParams({ password }) })
      setOk('Account deleted.')
      await signOut()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function saveCategory(event) {
    event.preventDefault()
    const name = (editingCategory?.name ?? newCategory).trim()
    if (!name || name.length > 40) {
      setCategoryError('Category name must be 1–40 characters.')
      return
    }

    setCategoryBusy(true)
    setCategoryError('')
    setCategoryOk('')
    try {
      const scope = space.id === 'private' ? {} : { household_id: space.id }

      if (editingCategory) {
        await api(`/transactions/categories/${editingCategory.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name, ...scope }),
        })
        setCategoryOk(`“${name}” renamed. Past transactions were updated too.`)
        setEditingCategory(null)
      } else {
        await post('/transactions/categories', { type: categoryType, name, ...scope })
        setCategoryOk(`“${name}” added.`)
        setNewCategory('')
      }

      const result = await api(`/transactions/categories/manage${householdQuery}`)
      setCategories(result || [])
    } catch (err) {
      setCategoryError(err.message)
    } finally {
      setCategoryBusy(false)
    }
  }

  async function removeCategory(category) {
    const confirmed = window.confirm(
      `Remove “${category.name}”? Existing transactions will keep this category name.`
    )
    if (!confirmed) return

    setCategoryBusy(true)
    setCategoryError('')
    setCategoryOk('')
    try {
      const scope =
        space.id === 'private' ? '' : `?household_id=${encodeURIComponent(space.id)}`

      await api(`/transactions/categories/${category.id}${scope}`, { method: 'DELETE' })
      setCategories(current => current.filter(item => item.id !== category.id))
      setCategoryOk(`“${category.name}” removed.`)
      if (editingCategory?.id === category.id) setEditingCategory(null)
    } catch (err) {
      setCategoryError(err.message)
    } finally {
      setCategoryBusy(false)
    }
  }

  function startRename(item) {
    setEditingCategory({ ...item })
    setNewCategory('')
    setCategoryError('')
    setCategoryOk('')
  }

  function switchCategoryType(type) {
    setCategoryType(type)
    setEditingCategory(null)
  }

  const visibleCategories = categories.filter(item => item.type === categoryType)

  // Orange by default; red / green while managing expense / income categories.
  const auroraTone = tab === 'categories' ? categoryType : undefined

  return (
    <AuroraBackground tone={auroraTone}>
      <section className="page settings-page">
        {/* Header */}
        <div className="settings-page-header">
          <div className="settings-nav">
            <button
              type="button"
              className="settings-nav-button settings-logout-button"
              onClick={onLogout}
            >
              <ArrowLeft size={16} />
              Log out
            </button>
            <button
              type="button"
              className="settings-nav-button"
              onClick={() => navigate('/')}
            >
              Back to dashboard
              <ArrowRight size={16} />
            </button>
          </div>
          <h1>Settings</h1>
          <p className="page-intro">
            Signed in as <strong>{user?.username}</strong>.
          </p>
        </div>

        {/* Tabs */}
        <div className="settings-tabs" role="tablist" aria-label="Settings sections">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'preferences'}
            className={tab === 'preferences' ? 'active' : ''}
            onClick={() => setTab('preferences')}
          >
            <SlidersHorizontal size={16} />
            Preferences
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'categories'}
            className={tab === 'categories' ? 'active' : ''}
            onClick={() => setTab('categories')}
          >
            <Tag size={16} />
            Categories
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'account'}
            className={tab === 'account' ? 'active' : ''}
            onClick={() => setTab('account')}
          >
            <User size={16} />
            Account
          </button>
        </div>

        <Feedback error={error} ok={ok} />

        {/* Preferences tab */}
        {tab === 'preferences' && (
          <section className="settings-section">
            <div className="settings-section-title">
              <span className="section-icon">
                <Sun size={17} />
              </span>
              <div>
                <h2>Appearance</h2>
                <p>Make fathom feel like yours.</p>
              </div>
            </div>

            <div className="theme-options">
              <button
                className={mode === 'system' ? 'chosen' : ''}
                onClick={() => setTheme('system')}
              >
                <Monitor size={17} />
                System
              </button>
              <button
                className={mode === 'light' ? 'chosen' : ''}
                onClick={() => setTheme('light')}
              >
                <Sun size={17} />
                Light
              </button>
              <button
                className={mode === 'dark' ? 'chosen' : ''}
                onClick={() => setTheme('dark')}
              >
                <Moon size={17} />
                Dark
              </button>
            </div>
          </section>
        )}

        {/* Categories tab */}
        {tab === 'categories' && (
          <section className={`settings-section category-settings-section ${categoryType}-categories`}>
            <div className="settings-section-title">
              <span className="section-icon">
                <Pencil size={17} />
              </span>
              <div>
                <h2>Categories</h2>
                <p>Manage custom categories in {space.name}</p>
              </div>
            </div>

            <div className="settings-category-content">
              <div
                className="settings-category-tabs"
                role="group"
                aria-label="Transaction category type"
              >
                <button
                  type="button"
                  className={categoryType === 'expense' ? 'chosen' : ''}
                  onClick={() => switchCategoryType('expense')}
                >
                  Expenses
                </button>
                <button
                  type="button"
                  className={categoryType === 'income' ? 'chosen' : ''}
                  onClick={() => switchCategoryType('income')}
                >
                  Income
                </button>
              </div>

              <form className="inline-form category-create-form" onSubmit={saveCategory}>
                <input
                  aria-label={editingCategory ? 'Rename category' : 'New category name'}
                  maxLength={40}
                  placeholder={editingCategory ? 'Category name' : 'e.g. Transport'}
                  value={editingCategory?.name ?? newCategory}
                  onChange={event =>
                    editingCategory
                      ? setEditingCategory({ ...editingCategory, name: event.target.value })
                      : setNewCategory(event.target.value)
                  }
                  required
                />
                <button className="secondary-button" disabled={categoryBusy}>
                  {editingCategory ? <Check size={15} /> : <Plus size={15} />}{' '}
                  {editingCategory ? 'Save name' : 'Add category'}
                </button>
                {editingCategory && (
                  <button
                    className="plain-button"
                    type="button"
                    onClick={() => setEditingCategory(null)}
                    aria-label="Cancel rename"
                  >
                    <X size={16} />
                  </button>
                )}
              </form>

              {(categoryError || categoryOk) && (
                <Feedback error={categoryError} ok={categoryOk} />
              )}

              <div className="settings-category-list">
                {visibleCategories.length ? (
                  visibleCategories.map(item => (
                    <div className="settings-category-row" key={item.id}>
                      <strong>{item.name}</strong>
                      <div>
                        <button
                          type="button"
                          className="small-button"
                          onClick={() => startRename(item)}
                          aria-label={`Rename ${item.name}`}
                        >
                          <Pencil size={14} /> Edit
                        </button>
                        <button
                          type="button"
                          className="category-remove-button"
                          disabled={categoryBusy}
                          onClick={() => removeCategory(item)}
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="field-help">No custom {categoryType} categories yet.</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Account tab */}
        {tab === 'account' && (
          <>
            <section className="settings-section">
              <div className="settings-section-title">
                <span className="section-icon">
                  <KeyRound size={17} />
                </span>
                <div>
                  <h2>Change password</h2>
                  <p>Keep your account secure.</p>
                </div>
              </div>

              <form className="settings-password" onSubmit={changePassword}>
                <span className="password-input-control">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="Current password"
                    autoComplete="current-password"
                    value={passwords.current_password}
                    onChange={e => setPasswords({ ...passwords, current_password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="password-visibility-button"
                    aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                    aria-pressed={showCurrentPassword}
                    onClick={() => setShowCurrentPassword(value => !value)}
                  >
                    {showCurrentPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>

                <span className="password-input-control">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="New password (7+ characters)"
                    minLength={7}
                    autoComplete="new-password"
                    value={passwords.new_password}
                    onChange={e => setPasswords({ ...passwords, new_password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="password-visibility-button"
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                    aria-pressed={showNewPassword}
                    onClick={() => setShowNewPassword(value => !value)}
                  >
                    {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>

                <button className="secondary-button" disabled={busy}>
                  Update password
                </button>
              </form>
            </section>

            <section className="account-actions">
              <span className="account-actions-label">
                Delete your account and its private data
              </span>
              <button className="delete-button" onClick={deleteAccount} disabled={busy}>
                <Trash2 size={16} /> Delete account
              </button>
            </section>
          </>
        )}
      </section>
    </AuroraBackground>
  )
}