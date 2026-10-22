// The Goals tab. "Current" amounts are editable here and saved back to the sheet.
import { useState } from 'react'
import { fmtMoney } from '../lib/format.js'

function GoalRow({ goal, onSave }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(goal.current))
  const isRate = goal.target > 0 && goal.target < 1 // e.g. credit card APR stored as 0.3074
  const pct = !isRate && goal.target > 0 ? Math.min(goal.current / goal.target, 1) : null

  const save = (e) => {
    e.preventDefault()
    const n = parseFloat(value.replace(/[$,]/g, ''))
    if (Number.isFinite(n)) onSave(Math.round(n * 100) / 100)
    setEditing(false)
  }

  return (
    <li className="goal">
      <div className="goal__top">
        <span className="goal__name">{goal.name}</span>
        {editing ? (
          <form onSubmit={save} className="goal__edit">
            <input autoFocus inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} aria-label={`${goal.name} current amount`} />
            <button className="btn btn--primary btn--small">Save</button>
          </form>
        ) : (
          <button className="goal__value" onClick={() => { setValue(String(goal.current)); setEditing(true) }} title="Update">
            {fmtMoney(goal.current)}
          </button>
        )}
      </div>
      {pct != null && (
        <>
          <span className="goal__bar" role="meter" aria-valuemin={0} aria-valuemax={goal.target} aria-valuenow={goal.current} aria-label={goal.name}>
            <span style={{ width: `${pct * 100}%` }} />
          </span>
          <span className="goal__meta">{Math.round(pct * 100)}% of {fmtMoney(goal.target)}</span>
        </>
      )}
      {isRate && (
        <span className="goal__meta">
          {(goal.target * 100).toFixed(2)}% APR · about {fmtMoney((goal.current * goal.target) / 12)} interest a month
        </span>
      )}
    </li>
  )
}

export default function Goals({ goals, onUpdate }) {
  if (!goals.length) return null
  return (
    <section className="panel" aria-labelledby="goals-h">
      <header className="panel__head">
        <h2 id="goals-h">Goals</h2>
        <span className="panel__hint">Click an amount to update it</span>
      </header>
      <ul className="goals">
        {goals.map((g) => (
          <GoalRow key={`${g.row}-${g.current}`} goal={g} onSave={(current) => onUpdate(g.row, current)} />
        ))}
      </ul>
    </section>
  )
}
