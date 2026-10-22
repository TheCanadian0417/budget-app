import { useMemo, useState } from 'react'
import { fmtDay, fmtMoney } from '../lib/format.js'

export default function TransactionList({
  transactions,
  title,
  limit, // show only the newest N (dashboard) — omit for the full list
  categoryFilter,
  onCategoryFilter,
  categories,
  onEdit,
  onDelete,
  onShowAll,
}) {
  const [query, setQuery] = useState('')
  const full = !limit

  const rows = useMemo(() => {
    let list = [...transactions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    if (categoryFilter) list = list.filter((t) => t.category === categoryFilter)
    const q = query.trim().toLowerCase()
    if (q) list = list.filter((t) => `${t.description} ${t.notes} ${t.account} ${t.category}`.toLowerCase().includes(q))
    return list
  }, [transactions, categoryFilter, query])

  const shown = limit ? rows.slice(0, limit) : rows
  const total = rows.reduce((s, t) => s + t.amount, 0)

  return (
    <section className="panel" aria-labelledby="tx-h">
      <header className="panel__head">
        <h2 id="tx-h">{title}</h2>
        {full && <span className="panel__hint">{rows.length} · {fmtMoney(total)}</span>}
        {!full && rows.length > limit && (
          <button className="btn btn--quiet" onClick={onShowAll}>
            See all {rows.length}
          </button>
        )}
      </header>

      {full && (
        <div className="filters">
          <input
            type="search"
            placeholder="Search description, notes, account"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search transactions"
          />
          <select value={categoryFilter} onChange={(e) => onCategoryFilter(e.target.value)} aria-label="Filter by category">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {shown.length === 0 ? (
        <p className="empty">
          {transactions.length === 0 ? 'Nothing entered for this month yet. Add your first purchase above.' : 'No transactions match.'}
        </p>
      ) : (
        <table className="txtable">
          <thead className={full ? '' : 'visually-hidden'}>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">What for</th>
              <th scope="col">Category</th>
              {full && <th scope="col">Paid with</th>}
              <th scope="col" className="num">Amount</th>
              <th scope="col"><span className="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((t) => (
              <tr key={t.id}>
                <td className="txtable__date">{fmtDay(t.date)}</td>
                <td>
                  {t.description || <span className="muted">—</span>}
                  <div className="txtable__catline">{t.category}</div>
                  {t.notes && full && <div className="txtable__note">{t.notes}</div>}
                </td>
                <td className="txtable__cat">{t.category}</td>
                {full && <td className="muted">{t.account}</td>}
                <td className="num">{fmtMoney(t.amount)}</td>
                <td className="txtable__actions">
                  <button className="btn btn--icon" onClick={() => onEdit(t)} aria-label={`Edit ${t.description || 'transaction'}`}>
                    Edit
                  </button>
                  <button className="btn btn--icon btn--danger" onClick={() => onDelete(t)} aria-label={`Delete ${t.description || 'transaction'}`}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
