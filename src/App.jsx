import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { useBudget } from './hooks/useBudget.js'
import { monthSummary, paceSeries, trendSeries, memoryOfPastEntries, inMonth } from './lib/derive.js'
import { currentMonthKey, shiftMonth, monthLabel, fmtMoney, fmtMoneyRound, fmtTime, monthKeyOf } from './lib/format.js'
import { newId } from './lib/ids.js'
import { DEFAULT_ACCOUNTS } from './config.js'
import Connect from './components/Connect.jsx'
import TransactionForm from './components/TransactionForm.jsx'
import Envelopes from './components/Envelopes.jsx'
import { PaceChart, TrendChart } from './components/Charts.jsx'
import TransactionList from './components/TransactionList.jsx'
import Goals from './components/Goals.jsx'

export default function App() {
  const budget = useBudget()
  const { data } = budget

  const [month, setMonth] = useState(currentMonthKey)
  const [view, setView] = useState('dashboard') // 'dashboard' | 'transactions'
  const [categoryFilter, setCategoryFilter] = useState('')
  const [editing, setEditing] = useState(null)
  const [toast, setToast] = useState(null) // { message, undo? }

  // Warn before closing the tab while a change is still being sent to the sheet.
  useEffect(() => {
    const warn = (e) => {
      if (budget.saveState === 'saving') e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [budget.saveState])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(t)
  }, [toast])

  const derived = useMemo(() => {
    if (!data) return null
    const accounts = [...new Set([...data.transactions.map((t) => t.account).filter(Boolean), ...DEFAULT_ACCOUNTS])]
    return {
      summary: monthSummary(data, month),
      pace: paceSeries(data, month),
      trend: trendSeries(data, month),
      pastEntries: memoryOfPastEntries(data.transactions),
      accounts,
    }
  }, [data, month])

  if (budget.status === 'disconnected') return <Connect onConnect={budget.connect} />
  if (!data) {
    return (
      <main className="welcome">
        <h1 className="welcome__title">Budget</h1>
        {budget.error ? (
          <>
            <p className="banner banner--error" role="alert">{budget.error}</p>
            <div className="welcome__actions">
              <button className="btn btn--primary" onClick={budget.refresh}>Try again</button>
              <button className="btn" onClick={budget.disconnect}>Change connection</button>
            </div>
          </>
        ) : (
          <p className="welcome__lede" aria-live="polite">Loading your budget…</p>
        )}
      </main>
    )
  }

  const { summary, pace, trend, pastEntries, accounts } = derived

  // ----- actions -----
  const add = (t) => {
    const tx = { ...t, id: newId() }
    budget.addTransaction(tx)
    if (monthKeyOf(tx.date) !== month) setMonth(monthKeyOf(tx.date))
    setToast({ message: `Added ${fmtMoney(tx.amount)} · ${tx.category}` })
  }
  const save = (t) => {
    budget.updateTransaction(t)
    setEditing(null)
    setToast({ message: 'Changes saved' })
  }
  const remove = (t) => {
    budget.deleteTransaction(t)
    setToast({
      message: `Deleted ${t.description || fmtMoney(t.amount)}`,
      undo: () => budget.addTransaction({ ...t, id: newId() }),
    })
  }
  const updateGoal = (row, current) => budget.setGoal(row, current)

  const openCategory = (name) => {
    setCategoryFilter(name)
    setView('transactions')
  }

  const pctUsed = summary.budgeted ? summary.spent / summary.budgeted : 0

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <h1>Budget</h1>
          <SaveStatus budget={budget} />
        </div>

        <nav className="monthnav" aria-label="Month">
          <button className="btn btn--icon" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Previous month">
            ‹
          </button>
          <span className="monthnav__label" aria-live="polite">{monthLabel(month)}</span>
          <button className="btn btn--icon" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="Next month">
            ›
          </button>
          {month !== currentMonthKey() && (
            <button className="btn btn--quiet" onClick={() => setMonth(currentMonthKey())}>
              This month
            </button>
          )}
        </nav>

        <div className="tabs" role="tablist" aria-label="View">
          <button role="tab" aria-selected={view === 'dashboard'} onClick={() => setView('dashboard')}>
            Overview
          </button>
          <button
            role="tab"
            aria-selected={view === 'transactions'}
            onClick={() => {
              setCategoryFilter('')
              setView('transactions')
            }}
          >
            Transactions
          </button>
        </div>
      </header>

      {budget.error && (
        <p className="banner banner--error" role="alert">
          {budget.error} <button className="btn btn--quiet" onClick={budget.clearError}>Dismiss</button>
        </p>
      )}

      <section className="register" aria-label="Add a transaction">
        <TransactionForm
          categories={data.categories}
          accounts={accounts}
          pastEntries={pastEntries}
          onSubmit={add}
          submitLabel="Add transaction"
          autoFocus
        />
      </section>

      {view === 'dashboard' ? (
        <main className="dashboard">
          <section className="stats" aria-label={`${monthLabel(month)} totals`}>
            <div className="stat stat--hero">
              <span className="stat__label">Left to spend in {monthLabel(month, { month: 'long' })}</span>
              <span className={`stat__value${summary.left < 0 ? ' is-negative' : ''}`}>{fmtMoney(summary.left)}</span>
              <span className="stat__bar" aria-hidden="true">
                <span style={{ width: `${Math.min(pctUsed, 1) * 100}%` }} className={pctUsed > 1 ? 'is-over' : ''} />
              </span>
              <span className="stat__sub">
                {fmtMoney(summary.spent)} spent of {fmtMoneyRound(summary.budgeted)} budgeted · {summary.count}{' '}
                {summary.count === 1 ? 'transaction' : 'transactions'}
              </span>
            </div>
            <div className="stat">
              <span className="stat__label">Take-home</span>
              <span className="stat__value stat__value--small">{fmtMoneyRound(data.takeHome)}</span>
              <span className="stat__sub">average per month</span>
            </div>
            <div className="stat">
              <span className="stat__label">Breathing room</span>
              <span className="stat__value stat__value--small">{fmtMoneyRound(summary.breathingRoom)}</span>
              <span className="stat__sub">take-home not assigned to a category</span>
            </div>
          </section>

          <div className="dashboard__main">
            <Envelopes envelopes={summary.envelopes} onPick={openCategory} />
          </div>
          <div className="dashboard__side">
            <PaceChart pace={pace} monthKey={month} />
            <TrendChart trend={trend} budgeted={summary.budgeted} monthKey={month} onPickMonth={(k) => k && setMonth(k)} />
          </div>
          <div className="dashboard__main">
            <TransactionList
              title="Latest"
              transactions={summary.transactions}
              limit={6}
              onEdit={setEditing}
              onDelete={remove}
              onShowAll={() => setView('transactions')}
            />
          </div>
          <div className="dashboard__side">
            <Goals goals={data.goals} onUpdate={updateGoal} />
          </div>
        </main>
      ) : (
        <main className="listview">
          <TransactionList
            title={`${monthLabel(month)} transactions`}
            transactions={inMonth(data.transactions, month)}
            categoryFilter={categoryFilter}
            onCategoryFilter={setCategoryFilter}
            categories={data.categories}
            onEdit={setEditing}
            onDelete={remove}
          />
        </main>
      )}

      {editing && (
        <EditDialog onClose={() => setEditing(null)}>
          <TransactionForm
            key={editing.id}
            variant="dialog"
            categories={data.categories}
            accounts={accounts}
            pastEntries={pastEntries}
            initial={editing}
            onSubmit={(t) => save({ ...editing, ...t })}
            submitLabel="Save changes"
          />
          <div className="dialog__foot">
            <button
              className="btn btn--quiet btn--danger-text"
              onClick={() => {
                remove(editing)
                setEditing(null)
              }}
            >
              Delete this transaction
            </button>
          </div>
        </EditDialog>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast.message}
          {toast.undo && (
            <button
              className="btn btn--quiet"
              onClick={() => {
                toast.undo()
                setToast({ message: 'Restored' })
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function SaveStatus({ budget }) {
  const { saveState, lastSyncedAt } = budget
  const text =
    saveState === 'saving'
      ? 'Saving…'
      : saveState === 'error'
        ? 'Not saved'
        : lastSyncedAt
          ? `Synced ${fmtTime(lastSyncedAt)}`
          : 'Connected'
  return (
    <span className={`savestatus savestatus--${saveState}`}>
      <span className="savestatus__dot" aria-hidden="true" />
      Google Sheet · {text}
      <button className="btn btn--quiet btn--small" onClick={budget.refresh} disabled={saveState === 'saving'}>
        Refresh
      </button>
      <button
        className="btn btn--quiet btn--small"
        onClick={() => {
          if (window.confirm('Disconnect this device? You will need the URL and key to connect again.')) budget.disconnect()
        }}
      >
        Disconnect
      </button>
    </span>
  )
}

function EditDialog({ children, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current
    d?.showModal()
    return () => d?.close()
  }, [])
  return (
    <dialog ref={ref} className="dialog" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <div className="dialog__head">
        <h2>Edit transaction</h2>
        <button className="btn btn--icon" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      {children}
    </dialog>
  )
}
