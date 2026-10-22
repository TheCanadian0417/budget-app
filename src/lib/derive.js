// Turns the raw transaction list into the numbers the dashboard shows.
// Pure functions: same input, same output, no React — easy to reason about.
import { FIXED_CATEGORIES, TREND_MONTHS } from '../config.js'
import { daysInMonth, monthKeyOf, shiftMonth, todayIso, monthLabel } from './format.js'

export const inMonth = (transactions, key) => transactions.filter((t) => monthKeyOf(t.date) === key)

export function monthSummary(data, key) {
  const txs = inMonth(data.transactions, key)
  const spentBy = {}
  for (const t of txs) spentBy[t.category] = (spentBy[t.category] || 0) + t.amount

  const known = new Set(data.categories.map((c) => c.name))
  const envelopes = data.categories.map((c) => ({
    name: c.name,
    budget: c.budget,
    spent: spentBy[c.name] || 0,
  }))
  // Anything typed in Excel with a category that isn't on the budget still gets counted.
  for (const [name, spent] of Object.entries(spentBy)) {
    if (!known.has(name)) envelopes.push({ name: name || 'No category', budget: 0, spent })
  }

  const budgeted = data.categories.reduce((s, c) => s + c.budget, 0)
  const spent = txs.reduce((s, t) => s + t.amount, 0)
  return {
    transactions: txs,
    envelopes,
    budgeted,
    spent,
    left: budgeted - spent,
    breathingRoom: data.takeHome - budgeted,
    count: txs.length,
  }
}

/**
 * Cumulative everyday (non-fixed) spending by day, next to an even pace line.
 * Days after today are left empty for the current month so the line stops at "now".
 */
export function paceSeries(data, key) {
  const fixed = new Set(FIXED_CATEGORIES)
  const flexBudget = data.categories.filter((c) => !fixed.has(c.name)).reduce((s, c) => s + c.budget, 0)
  const days = daysInMonth(key)
  const today = todayIso()
  const lastDay = monthKeyOf(today) === key ? Number(today.slice(8, 10)) : key < monthKeyOf(today) ? days : 0

  const byDay = new Array(days + 1).fill(0)
  for (const t of inMonth(data.transactions, key)) {
    if (!fixed.has(t.category)) byDay[Number(t.date.slice(8, 10))] += t.amount
  }
  let running = 0
  const points = []
  for (let d = 1; d <= days; d++) {
    running += byDay[d]
    points.push({
      day: d,
      actual: d <= lastDay ? Math.round(running * 100) / 100 : null,
      pace: Math.round(((flexBudget * d) / days) * 100) / 100,
    })
  }
  return { points, flexBudget, spentSoFar: running, lastDay, days }
}

/** Total spent per month for the months leading up to (and including) `key`. */
export function trendSeries(data, key) {
  const out = []
  for (let i = TREND_MONTHS - 1; i >= 0; i--) {
    const k = shiftMonth(key, -i)
    const spent = inMonth(data.transactions, k).reduce((s, t) => s + t.amount, 0)
    out.push({ key: k, label: monthLabel(k, { month: 'short' }), spent: Math.round(spent * 100) / 100 })
  }
  return out
}

/** Descriptions you've used before -> the category/account you used last time. */
export function memoryOfPastEntries(transactions) {
  const map = new Map()
  for (const t of transactions) if (t.description) map.set(t.description.toLowerCase(), t)
  return map
}
