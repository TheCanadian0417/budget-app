// Each budget category as a bar: how much of its monthly budget is used.
import { fmtMoney, fmtMoneyRound } from '../lib/format.js'

export default function Envelopes({ envelopes, onPick }) {
  return (
    <section className="panel" aria-labelledby="env-h">
      <header className="panel__head">
        <h2 id="env-h">Categories</h2>
        <span className="panel__hint">Spent of budget</span>
      </header>
      <ul className="envelopes">
        {envelopes.map((e) => {
          const pct = e.budget > 0 ? Math.min(e.spent / e.budget, 1) : e.spent > 0 ? 1 : 0
          const over = e.spent > e.budget + 0.005
          const left = e.budget - e.spent
          return (
            <li key={e.name}>
              <button className={`envelope${over ? ' envelope--over' : ''}`} onClick={() => onPick(e.name)}>
                <span className="envelope__name">{e.name}</span>
                <span className="envelope__nums">
                  {fmtMoney(e.spent)} <span className="muted">of {fmtMoneyRound(e.budget)}</span>
                </span>
                <span
                  className="envelope__bar"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={e.budget}
                  aria-valuenow={e.spent}
                  aria-label={`${e.name}: ${fmtMoney(e.spent)} of ${fmtMoney(e.budget)}`}
                >
                  <span style={{ width: `${pct * 100}%` }} />
                </span>
                <span className="envelope__left">
                  {over ? (
                    <>
                      <span aria-hidden="true">▲ </span>
                      {fmtMoney(-left)} over
                    </>
                  ) : (
                    `${fmtMoney(left)} left`
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
