// Used twice: the always-visible "quick add" bar, and the edit dialog.
import { useId, useMemo, useRef, useState } from 'react'
import { todayIso } from '../lib/format.js'

const blank = (date, account) => ({ amount: '', description: '', category: '', date, account, notes: '' })

export default function TransactionForm({
  categories,
  accounts,
  pastEntries, // Map: lowercased description -> last transaction with it
  initial, // a transaction to edit, or undefined for a new one
  onSubmit,
  submitLabel = 'Add',
  autoFocus = false,
  variant = 'quick', // 'quick' | 'dialog'
}) {
  const ids = useId()
  const [form, setForm] = useState(() =>
    initial ? { ...initial, amount: String(initial.amount) } : blank(todayIso(), accounts[0] ?? ''),
  )
  const [touchedCategory, setTouchedCategory] = useState(!!initial)
  const [showNotes, setShowNotes] = useState(!!initial?.notes)
  const [problem, setProblem] = useState('')
  const amountRef = useRef(null)

  const descriptions = useMemo(
    () => [...new Set([...pastEntries.values()].map((t) => t.description))].sort(),
    [pastEntries],
  )

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  // Typing a description you've used before fills in its category and account.
  const onDescription = (e) => {
    const value = e.target.value
    const seen = pastEntries.get(value.trim().toLowerCase())
    setForm((f) => ({
      ...f,
      description: value,
      ...(seen && !touchedCategory ? { category: seen.category, account: seen.account || f.account } : {}),
    }))
  }

  const pickCategory = (name) => {
    setTouchedCategory(true)
    setForm((f) => ({ ...f, category: name }))
    setProblem('')
  }

  const submit = (e) => {
    e.preventDefault()
    const amount = Math.round(parseFloat(String(form.amount).replace(/[$,]/g, '')) * 100) / 100
    if (!Number.isFinite(amount) || amount === 0) return fail('Enter an amount.', amountRef)
    if (!form.category) return fail('Pick a category.')
    if (!form.date) return fail('Pick a date.')
    onSubmit({ ...form, amount, description: form.description.trim(), notes: form.notes.trim() })
    if (!initial) {
      // Keep date + account (you often enter several from the same day/card in a row)
      setForm((f) => blank(f.date, f.account))
      setTouchedCategory(false)
      setShowNotes(false)
      amountRef.current?.focus()
    }
  }

  function fail(message, ref) {
    setProblem(message)
    ref?.current?.focus()
  }

  return (
    <form className={`txform txform--${variant}`} onSubmit={submit} noValidate>
      <div className="txform__row">
        <label className="field field--amount">
          <span className="field__label">Amount</span>
          <span className="amount-input">
            <span aria-hidden="true">$</span>
            <input
              ref={amountRef}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => {
                set('amount')(e)
                setProblem('')
              }}
              autoFocus={autoFocus}
            />
          </span>
        </label>

        <label className="field field--grow">
          <span className="field__label">What for</span>
          <input
            list={`${ids}-desc`}
            placeholder="Publix, Shell, Netflix…"
            value={form.description}
            onChange={onDescription}
            autoComplete="off"
          />
          <datalist id={`${ids}-desc`}>
            {descriptions.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </label>

        <label className="field">
          <span className="field__label">Date</span>
          <input type="date" value={form.date} onChange={set('date')} />
        </label>

        <label className="field">
          <span className="field__label">Paid with</span>
          <input list={`${ids}-acct`} value={form.account} onChange={set('account')} autoComplete="off" />
          <datalist id={`${ids}-acct`}>
            {accounts.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </label>
      </div>

      <fieldset className="chips">
        <legend className="field__label">Category</legend>
        {categories.map((c) => (
          <button
            type="button"
            key={c.name}
            className="chip"
            aria-pressed={form.category === c.name}
            onClick={() => pickCategory(c.name)}
          >
            {c.name}
          </button>
        ))}
      </fieldset>

      {showNotes ? (
        <label className="field">
          <span className="field__label">Notes</span>
          <input value={form.notes} onChange={set('notes')} placeholder="Optional" />
        </label>
      ) : null}

      <div className="txform__actions">
        {!showNotes && (
          <button type="button" className="btn btn--quiet" onClick={() => setShowNotes(true)}>
            Add a note
          </button>
        )}
        <p className="txform__problem" role="alert">
          {problem}
        </p>
        <button type="submit" className="btn btn--primary">
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
