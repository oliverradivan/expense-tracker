import { useEffect, useLayoutEffect, useState } from 'react'
import { Check, ChevronDown, Info, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import { api, post } from '../lib/api'
import { getCachedTransactions, setCachedTransactions } from '../lib/transactionCache'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/constants'
import './logexpense.css'

const CATEGORY_ACTION = '__add_category__'

export default function LogExpense() {
  const { space, user } = useAuth()
  const navigate = useNavigate()
  const [type, setType] = useState('expense')
  const [category, setCategory] = useState('')
  const [categories, setCategories] = useState([])
  const [categorySpace, setCategorySpace] = useState('')
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [savingCategory, setSavingCategory] = useState(false)
  const [categoryError, setCategoryError] = useState('')
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  })
  const [frequency, setFrequency] = useState('one_time')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useLayoutEffect(() => {
    const root = document.documentElement
    if (type === 'expense' || type === 'income') root.dataset.pageTone = type
    else delete root.dataset.pageTone

    return () => {
      if (root.dataset.pageTone === type) delete root.dataset.pageTone
    }
  }, [type])

  const categoryKey = `${space.id}:${type}`
  const defaults = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  const availableCategories = categorySpace === categoryKey ? categories : defaults

  useEffect(() => {
    let alive = true
    const query = new URLSearchParams({ type })
    if (space.id !== 'private') query.set('household_id', space.id)
    api(`/transactions/categories?${query}`)
      .then((result) => { if (alive) { setCategories(result.categories || defaults); setCategorySpace(categoryKey); setCategoryError('') } })
      .catch((err) => { if (alive) { setCategories(defaults); setCategorySpace(categoryKey); setCategoryError(err.message) } })
    return () => { alive = false }
  }, [categoryKey, defaults, space.id, type])

  function changeType(next) {
    setType(next); setCategory(''); setShowNewCategory(false); setNewCategory(''); setError('')
  }

  async function saveCategory() {
    const name = newCategory.trim()
    if (!name || name.length > 40) { setCategoryError('Category name must be 1–40 characters.'); return }
    setSavingCategory(true); setCategoryError('')
    try {
      const result = await post('/transactions/categories', { type, name, ...(space.id !== 'private' ? { household_id: space.id } : {}) })
      const next = [...availableCategories, result.name]
      setCategories(next); setCategorySpace(categoryKey); setCategory(result.name); setNewCategory(''); setShowNewCategory(false)
    } catch (err) { setCategoryError(err.message) }
    finally { setSavingCategory(false) }
  }

  async function submit(event) {
    event.preventDefault(); setError('')
    const value = Number(amount)
    if (!label.trim() || !Number.isFinite(value) || value <= 0 || !date) {
      setError('Please complete every field with a valid positive amount.'); return
    }
    setBusy(true)
    try {
      const transaction = await post('/transactions/', {
        type, category, label: label.trim(), amount: value.toFixed(2), date, frequency,
        ...(space.id !== 'private' ? { household_id: space.id } : {}),
      })
      const cached = getCachedTransactions(user.id, space.id)
      if (cached) setCachedTransactions(user.id, space.id, [transaction, ...cached])
      setSuccess(true); setTimeout(() => navigate('/history'), 650)
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return <section className="page form-page">
    <div className="page-heading-row"><div><h1>Log transaction</h1><p className="page-intro">This will be added to <strong>{space.name}</strong>.</p></div></div>
    <form className={`entry-card glass-panel ${type}-entry-card`} onSubmit={submit}>
      <div className="field-label-row"><span className="field-label">TRANSACTION TYPE</span><span className="required-hint">REQUIRED</span></div>
      <div className="type-switch" role="group" aria-label="Transaction type"><button type="button" className={type === 'expense' ? 'selected' : ''} onClick={() => changeType('expense')}>Expense</button><button type="button" className={type === 'income' ? 'selected income-selected' : ''} onClick={() => changeType('income')}>Income</button></div>

      <label className="field"><span className="field-label">CATEGORY <span className="required-hint">OPTIONAL</span></span><span className="select-control"><select value={category} onChange={e => { if (e.target.value === CATEGORY_ACTION) { setCategory(''); setShowNewCategory(true) } else { setCategory(e.target.value); setShowNewCategory(false) } }}><option value="">Auto-detect from description</option>{availableCategories.map(item => <option key={item} value={item}>{item}</option>)}<option value={CATEGORY_ACTION}>＋ Add category</option></select><ChevronDown size={16}/></span><span className="field-help">We’ll suggest a category based on the description. You can choose one anytime.</span></label>
      {showNewCategory && <div className="new-category-box"><label className="field"><span className="field-label">NEW CATEGORY</span><input autoFocus maxLength={40} placeholder="e.g. Transport" value={newCategory} onChange={e => setNewCategory(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveCategory() } }}/></label><button className="secondary-button" type="button" disabled={savingCategory} onClick={saveCategory}><Plus size={15}/>{savingCategory ? 'Adding…' : 'Add category'}</button></div>}
      {categoryError && <p role="alert" className="category-note">{categoryError}</p>}

      <label className="field"><span className="field-label">DESCRIPTION <b>*</b></span><input value={label} onChange={e => setLabel(e.target.value)} maxLength={100} placeholder={type === 'expense' ? 'What was it for?' : 'Where did it come from?'} required/></label>
      <div className="field-split"><label className="field"><span className="field-label">AMOUNT <b>*</b></span><span className="amount-control"><span>₪</span><input value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" type="number" min="0.01" step="0.01" placeholder="0.00" required/></span></label><label className="field"><span className="field-label">DATE <b>*</b></span><input type="date" value={date} onChange={e => setDate(e.target.value)} required/></label></div>
      <label className="field frequency-field"><span className="field-label">FREQUENCY <b>*</b></span><span className="select-control"><select value={frequency} onChange={e => setFrequency(e.target.value)}><option value="one_time">One time</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select><ChevronDown size={16}/></span></label>
      <div className="form-footnote"><Info size={15}/><span>Saved to <strong>{space.name}</strong> only.</span></div>
      {error && <p role="alert" className="notice error-notice">{error}</p>}{success && <p role="status" className="notice success-notice"><Check size={16}/> Transaction saved. Opening your history…</p>}
      <button className="primary-button submit-button" disabled={busy || success || savingCategory}>{busy ? 'Saving…' : `Save ${type}`}</button>
    </form>
  </section>
}
