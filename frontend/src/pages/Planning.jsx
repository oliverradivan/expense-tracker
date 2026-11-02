import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, CirclePlus, Goal, Trash2 } from 'lucide-react'
import { useAuth } from '../context/authContext'
import { api, post } from '../lib/api'
import { getCachedTransactions, setCachedTransactions } from '../lib/transactionCache'
import { money } from '../lib/utils'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/constants'
import './Planning.css'

const localDate = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
const currentMonth = () => localDate().slice(0, 7)
const scopeQuery = (space) => space.id === 'private' ? '' : `?household_id=${encodeURIComponent(space.id)}`
const scopeBody = (space) => space.id === 'private' ? {} : { household_id: space.id }

export default function Planning() {
  const { space, user } = useAuth()
  const [month, setMonth] = useState(currentMonth)
  const [budgets, setBudgets] = useState([])
  const [goals, setGoals] = useState([])
  const [reminders, setReminders] = useState([])
  const [transactions, setTransactions] = useState(() => getCachedTransactions(user.id, space.id) || [])
  const [categories, setCategories] = useState(EXPENSE_CATEGORIES)
  const [categorySpace, setCategorySpace] = useState('')
  const [loadedSpace, setLoadedSpace] = useState('')
  const [loadedBudgetKey, setLoadedBudgetKey] = useState('')
  const [type, setType] = useState('expense')
  const [budgetCategory, setBudgetCategory] = useState('')
  const [budgetAmount, setBudgetAmount] = useState('')
  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalDate, setGoalDate] = useState('')
  const [label, setLabel] = useState('')
  const [reminderAmount, setReminderAmount] = useState('')
  const [frequency, setFrequency] = useState('monthly')
  const [nextDue, setNextDue] = useState(localDate)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    const query = scopeQuery(space)
    Promise.all([
      api(`/planning/goals${query}`),
      api(`/planning/reminders${query}`),
      api(`/transactions/${query}`),
    ]).then(([goalRows, reminderRows, transactionRows]) => {
      if (!active) return
      setGoals(goalRows || [])
      setReminders(reminderRows || [])
      setTransactions(transactionRows || [])
      setCachedTransactions(user.id, space.id, transactionRows || [])
      setLoadedSpace(`${user.id}:${space.id}`)
      setError('')
    }).catch((err) => { if (active) setError(err.message) })
    return () => { active = false }
  }, [space, user.id])

  useEffect(() => {
    let active = true
    const query = new URLSearchParams({ type })
    if (space.id !== 'private') query.set('household_id', space.id)
    api(`/transactions/categories?${query}`)
      .then(result => { if (active) { setCategories(result.categories || []); setCategorySpace(`${space.id}:${type}`) } })
      .catch(err => { if (active) setError(err.message) })
    return () => { active = false }
  }, [space.id, type])

  useEffect(() => {
    let active = true
    const query = new URLSearchParams({ month })
    if (space.id !== 'private') query.set('household_id', space.id)
    api(`/planning/budgets?${query}`)
      .then(result => { if (active) { setBudgets(result || []); setLoadedBudgetKey(`${space.id}:${month}`) } })
      .catch(err => { if (active) setError(err.message) })
    return () => { active = false }
  }, [month, space.id])

  const spaceKey = `${user.id}:${space.id}`
  const monthExpenses = (loadedSpace === spaceKey ? transactions : []).filter(row => row.type === 'expense' && String(row.date).startsWith(month))
  const visibleGoals = loadedSpace === spaceKey ? goals : []
  const visibleReminders = loadedSpace === spaceKey ? reminders : []
  const visibleBudgets = loadedBudgetKey === `${space.id}:${month}` ? budgets : []
  const reminderCategories = categorySpace === `${space.id}:${type}` ? categories : type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  const spentByCategory = monthExpenses.reduce((totals, row) => {
    totals[row.category] = (totals[row.category] || 0) + Number(row.amount || 0)
    return totals
  }, {})

  async function saveBudget(event) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const saved = await post('/planning/budgets', {
        month, category: budgetCategory, amount: budgetAmount, ...scopeBody(space),
      })
      setBudgets(rows => [...rows.filter(row => row.category.toLowerCase() !== saved.category.toLowerCase()), saved])
      setBudgetAmount('')
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  async function addGoal(event) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const goal = await post('/planning/goals', {
        name: goalName, target_amount: goalTarget, target_date: goalDate || null, ...scopeBody(space),
      })
      setGoals(rows => [...rows, goal])
      setGoalName(''); setGoalTarget(''); setGoalDate('')
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  async function contribute(event, goal) {
    event.preventDefault()
    const form = event.currentTarget
    const amount = new FormData(form).get('amount')
    setError('')
    try {
      const result = await post(`/planning/goals/${goal.id}/contributions${space.id === 'private' ? '' : `?household_id=${encodeURIComponent(space.id)}`}`, { amount })
      setGoals(rows => rows.map(row => row.id === goal.id ? { ...row, saved_amount: result.saved_amount } : row))
      form.reset()
    } catch (err) { setError(err.message) }
  }

  async function addReminder(event) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const reminder = await post('/planning/reminders', {
        type, category: event.currentTarget.category.value, label,
        amount: reminderAmount, frequency, next_due: nextDue, ...scopeBody(space),
      })
      setReminders(rows => [...rows, reminder].sort((a, b) => a.next_due.localeCompare(b.next_due)))
      setLabel(''); setReminderAmount('')
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  async function removeItem(path, id, update) {
    setError('')
    try {
      const query = space.id === 'private' ? '' : `?household_id=${encodeURIComponent(space.id)}`
      await api(`/planning/${path}/${id}${query}`, { method: 'DELETE' })
      update(rows => rows.filter(row => row.id !== id))
    } catch (err) { setError(err.message) }
  }

  async function logReminder(reminder) {
    setError('')
    try {
      const query = space.id === 'private' ? '' : `?household_id=${encodeURIComponent(space.id)}`
      const result = await post(`/planning/reminders/${reminder.id}/log${query}`, {})
      setReminders(rows => rows.map(row => row.id === reminder.id ? { ...row, next_due: result.next_due } : row))
      const updatedTransactions = [{
        id: result.transaction_id, type: reminder.type, category: reminder.category,
        label: reminder.label, amount: reminder.amount, date: reminder.next_due,
      }, ...transactions]
      setTransactions(updatedTransactions)
      setCachedTransactions(user.id, space.id, updatedTransactions)
    } catch (err) { setError(err.message) }
  }

  return <section className="page planning-page">
    <div className="page-heading-row"><div><h1>Your plan</h1><p className="page-intro">Budgets, goals, and upcoming regular entries for {space.name}.</p></div><Link className="secondary-button" to="/">Dashboard</Link></div>
    {error && <p className="notice error-notice" role="alert">{error}</p>}

    <section className="planning-section glass-panel">
      <header className="planning-section-heading"><div><span className="eyebrow">SPENDING LIMITS</span><h2>Monthly budgets</h2></div><label className="planning-month"><span className="sr-only">Budget month</span><input type="month" value={month} onChange={event => event.target.value && setMonth(event.target.value)} /></label></header>
      <form className="planning-form budget-form" onSubmit={saveBudget}>
        <label className="field"><span className="field-label">CATEGORY</span><select value={budgetCategory} onChange={event => setBudgetCategory(event.target.value)}><option value="">All expenses</option>{[...new Set([...EXPENSE_CATEGORIES, ...Object.keys(spentByCategory), ...visibleBudgets.map(row => row.category)].filter(Boolean))].sort().map(category => <option key={category}>{category}</option>)}</select></label>
        <label className="field"><span className="field-label">MONTHLY LIMIT · ₪</span><input type="number" min="0.01" step="0.01" required value={budgetAmount} onChange={event => setBudgetAmount(event.target.value)} placeholder="e.g. 3,000" /></label>
        <button className="primary-button" disabled={busy}>Set budget</button>
      </form>
      {visibleBudgets.length ? <div className="planning-list">{visibleBudgets.map(budget => {
        const spent = budget.category ? spentByCategory[budget.category] || 0 : monthExpenses.reduce((sum, row) => sum + Number(row.amount || 0), 0)
        const progress = Math.min(spent / Number(budget.amount) * 100, 100)
        return <article className="budget-item" key={budget.id}><div className="planning-item-top"><div><strong>{budget.category || 'All expenses'}</strong><span>{money(spent)} of {money(budget.amount)}</span></div><button className="planning-delete" type="button" aria-label={`Delete ${budget.category || 'total'} budget`} onClick={() => removeItem('budgets', budget.id, setBudgets)}><Trash2 size={16}/></button></div><div className="planning-progress"><i className={progress >= 100 ? 'over-budget' : ''} style={{ width: `${progress}%` }}/></div>{spent > Number(budget.amount) && <small className="over-budget-note">Over budget by {money(spent - Number(budget.amount))}</small>}</article>
      })}</div> : <p className="planning-empty">Set a limit to keep this month on track.</p>}
    </section>

    <section className="planning-section glass-panel">
      <header className="planning-section-heading"><div><span className="eyebrow">SAVE TOWARD SOMETHING</span><h2>Savings goals</h2></div><Goal size={19}/></header>
      <form className="planning-form goal-form" onSubmit={addGoal}>
        <label className="field"><span className="field-label">GOAL</span><input maxLength="60" required value={goalName} onChange={event => setGoalName(event.target.value)} placeholder="Emergency fund" /></label>
        <label className="field"><span className="field-label">TARGET · ₪</span><input type="number" min="0.01" step="0.01" required value={goalTarget} onChange={event => setGoalTarget(event.target.value)} placeholder="10,000" /></label>
        <label className="field"><span className="field-label">TARGET DATE · OPTIONAL</span><input type="date" value={goalDate} onChange={event => setGoalDate(event.target.value)} /></label>
        <button className="primary-button" disabled={busy}>Add goal</button>
      </form>
      {visibleGoals.length ? <div className="planning-list">{visibleGoals.map(goal => {
        const progress = Math.min(Number(goal.saved_amount) / Number(goal.target_amount) * 100, 100)
        return <article className="goal-item" key={goal.id}><div className="planning-item-top"><div><strong>{goal.name}</strong><span>{money(goal.saved_amount)} saved of {money(goal.target_amount)}{goal.target_date ? ` · by ${goal.target_date}` : ''}</span></div><button className="planning-delete" type="button" aria-label={`Delete ${goal.name}`} onClick={() => removeItem('goals', goal.id, setGoals)}><Trash2 size={16}/></button></div><div className="planning-progress"><i style={{ width: `${progress}%` }}/></div><form className="contribution-form" onSubmit={event => contribute(event, goal)}><label className="sr-only" htmlFor={`contribution-${goal.id}`}>Add to {goal.name}</label><input id={`contribution-${goal.id}`} name="amount" type="number" min="0.01" step="0.01" placeholder="Add amount · ₪" required disabled={progress >= 100}/><button type="submit" className="secondary-button" disabled={progress >= 100}><CirclePlus size={15}/> Add</button></form></article>
      })}</div> : <p className="planning-empty">Create a goal and track each contribution.</p>}
    </section>

    <section className="planning-section glass-panel">
      <header className="planning-section-heading"><div><span className="eyebrow">MANUAL REMINDERS</span><h2>Recurring transactions</h2></div></header>
      <p className="planning-help">We’ll remind you when these are due. Nothing is recorded until you choose “Log now.”</p>
      <form className="planning-form reminder-form" onSubmit={addReminder}>
        <label className="field"><span className="field-label">TYPE</span><select value={type} onChange={event => setType(event.target.value)}><option value="expense">Expense</option><option value="income">Income</option></select></label>
        <label className="field"><span className="field-label">CATEGORY</span><select name="category">{reminderCategories.map(category => <option key={category}>{category}</option>)}</select></label>
        <label className="field"><span className="field-label">DESCRIPTION</span><input maxLength="100" required value={label} onChange={event => setLabel(event.target.value)} placeholder="Rent, salary…" /></label>
        <label className="field"><span className="field-label">AMOUNT · ₪</span><input type="number" min="0.01" step="0.01" required value={reminderAmount} onChange={event => setReminderAmount(event.target.value)} placeholder="0.00" /></label>
        <label className="field"><span className="field-label">REPEATS</span><select value={frequency} onChange={event => setFrequency(event.target.value)}><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label>
        <label className="field"><span className="field-label">NEXT DUE</span><input type="date" required value={nextDue} onChange={event => setNextDue(event.target.value)} /></label>
        <button className="primary-button" disabled={busy}>Add reminder</button>
      </form>
      {visibleReminders.length ? <div className="planning-list">{visibleReminders.map(reminder => {
        const due = reminder.next_due <= localDate()
        const Icon = reminder.type === 'income' ? ArrowUpRight : ArrowDownRight
        return <article className="reminder-item" key={reminder.id}><span className={`reminder-icon ${reminder.type}`}><Icon size={17}/></span><div className="reminder-description"><strong>{reminder.label}</strong><span>{reminder.category} · {reminder.frequency} · {money(reminder.amount)}</span><small>{due ? 'Due now' : `Next due ${reminder.next_due}`}</small></div>{due && <button className="secondary-button" type="button" onClick={() => logReminder(reminder)}>Log now</button>}<button className="planning-delete" type="button" aria-label={`Delete reminder for ${reminder.label}`} onClick={() => removeItem('reminders', reminder.id, setReminders)}><Trash2 size={16}/></button></article>
      })}</div> : <p className="planning-empty">Add a regular bill or income to get a reminder when it’s due.</p>}
    </section>
  </section>
}
