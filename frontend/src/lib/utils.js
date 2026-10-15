export const money = (value) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 2 }).format(Number(value) || 0)
export const readableDate = (value) => new Date(`${value}T12:00:00`).toLocaleDateString('en-IL', { day: 'numeric', month: 'short', year: 'numeric' })
export const monthLabel = (value) => new Date(`${value}-01T12:00:00`).toLocaleDateString('en', { month: 'long', year: 'numeric' })
