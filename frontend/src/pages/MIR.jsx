import { useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, ChartNoAxesColumnIncreasing } from 'lucide-react'
import { api } from '../lib/api'
import { money, monthLabel } from '../lib/utils'
import { getCachedTransactions, setCachedTransactions } from '../lib/transactionCache'
import { useAuth } from '../context/authContext'
import './MIR.css'

const monthBefore = (value) => {
  const [year, month] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7)
}
const cents = (rows, type) => rows.filter(row => row.type === type).reduce((sum, row) => sum + Math.round(Number(row.amount) * 100), 0)
const byCategory = (rows) => rows.filter(row => row.type === 'expense').reduce((all, row) => {
  all[row.category] = (all[row.category] || 0) + Math.round(Number(row.amount) * 100)
  return all
}, {})
const changeLabel = (current, previous) => {
  const delta = current - previous
  if (!delta) return 'No change from last month'
  return `${delta > 0 ? '+' : '−'}${money(Math.abs(delta) / 100)} vs last month`
}

export default function MIR() {
  const { space, user } = useAuth()
  const [month, setMonth] = useState(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  })
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [loadedKey, setLoadedKey] = useState('')
  const requestKey = `${user.id}:${space.id}:${month}`
  const previousMonth = monthBefore(month)

  useEffect(() => {
    let alive = true
    api(`/transactions/${space.id === 'private' ? '' : `?household_id=${encodeURIComponent(space.id)}`}`)
      .then(result => {
        if (alive) {
          setCachedTransactions(user.id, space.id, result || [])
          setRows(result || [])
          setLoadedKey(requestKey)
          setError('')
        }
      })
      .catch(err => {
        if (alive) {
          const cached = err.status === 401 || err.status === 403 ? [] : (getCachedTransactions(user.id, space.id) || [])
          setRows(cached)
          if (err.status === 401 || err.status === 403) setCachedTransactions(user.id, space.id, [])
          setLoadedKey(requestKey)
          setError(err.message)
        }
      })
    return () => { alive = false }
  }, [space.id, user.id, requestKey])

  const cachedRows = getCachedTransactions(user.id, space.id)
  const isLoading = loadedKey !== requestKey && !cachedRows
  const visibleRows = loadedKey === requestKey ? rows : (cachedRows || [])
  const current = visibleRows.filter(row => String(row.date).startsWith(month))
  const previous = visibleRows.filter(row => String(row.date).startsWith(previousMonth))
  const income = cents(current, 'income')
  const expenses = cents(current, 'expense')
  const priorIncome = cents(previous, 'income')
  const priorExpenses = cents(previous, 'expense')
  const categories = byCategory(current)
  const priorCategories = byCategory(previous)
  const categoryNames = [...new Set([...Object.keys(categories), ...Object.keys(priorCategories)])].sort((a, b) => (categories[b] || 0) - (categories[a] || 0))
  const max = Math.max(income, expenses, 1)

  return <section className="page mir-page">
    <div className="page-kicker"><span className="kicker-dot"/> YOUR MONTH, IN BALANCE</div>
    <div className="page-heading-row"><div><h1>Month in review</h1>
    <p className="page-intro">A monthly snapshot of {space.name.toLowerCase()}.</p></div><label className="month-picker"><span className="sr-only">Choose month</span><input type="month" value={month} onChange={event => setMonth(event.target.value)}/></label></div>
    {loadedKey === requestKey && error && <p className="notice error-notice">{error}</p>}
    {isLoading ? <div className="quiet-state">Putting the numbers together…</div> : <>
      <div className="review-summary glass-panel"><span className="eyebrow">PROFIT / LOSS · {monthLabel(month).toUpperCase()}</span><strong className={income - expenses < 0 ? 'negative' : ''}>{money((income - expenses) / 100)}</strong><span>Income less expenses · {changeLabel(income - expenses, priorIncome - priorExpenses)}</span></div>
      <div className="review-cards">
        <article className="review-card glass-panel"><span className="metric-icon income-icon"><ArrowDownLeft size={18}/></span><span className="eyebrow">TOTAL INCOME</span><strong>{money(income / 100)}</strong><span>{current.filter(row => row.type === 'income').length} entries · {changeLabel(income, priorIncome)}</span></article>
        <article className="review-card glass-panel"><span className="metric-icon expense-icon"><ArrowUpRight size={18}/></span><span className="eyebrow">TOTAL EXPENSES</span><strong>{money(expenses / 100)}</strong><span>{current.filter(row => row.type === 'expense').length} entries · {changeLabel(expenses, priorExpenses)}</span></article>
      </div>
      <div className="analytics-grid">
        <section className="analytics-card glass-panel"><div className="analytics-title"><div><span className="eyebrow">SIDE BY SIDE</span><h2>Income & expenses</h2></div><ChartNoAxesColumnIncreasing size={19}/></div><div className="bar-chart"><div className="bar-column"><strong>{money(income / 100)}</strong><div className="bar-track"><span className="bar-fill income-fill" style={{ height: `${Math.max(income / max * 100, income ? 5 : 0)}%` }}/></div><span>Income</span></div><div className="bar-column"><strong>{money(expenses / 100)}</strong><div className="bar-track"><span className="bar-fill expense-fill" style={{ height: `${Math.max(expenses / max * 100, expenses ? 5 : 0)}%` }}/></div><span>Expenses</span></div></div></section>
        <section className="analytics-card glass-panel category-card"><span className="eyebrow">WHERE IT WENT</span><h2>Expense categories</h2>{categoryNames.length ? categoryNames.map(name => {
          const amount = categories[name] || 0
          const previousAmount = priorCategories[name] || 0
          return <div className="category-row" key={name}><div><span>{name}</span><strong>{money(amount / 100)}</strong></div><span className="category-meter"><i style={{ width: `${expenses ? amount / expenses * 100 : 0}%` }}/></span><small className="category-comparison">{changeLabel(amount, previousAmount)}</small></div>
        }) : <div className="category-empty">No expenses recorded for {monthLabel(month)}.</div>}</section>
      </div>
      <p className="review-comparison-note">Compared with {monthLabel(previousMonth)}.</p>
    </>}
  </section>
}
