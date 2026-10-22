// The two charts on the dashboard, built with Recharts (https://recharts.org).
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts'
import { fmtMoney, fmtMoneyRound, monthLabel } from '../lib/format.js'

// Chart colors come from CSS variables so light/dark mode is handled in App.css.
const css = (name) => `var(${name})`
const axis = { stroke: css('--line-strong'), tick: { fill: css('--ink-3'), fontSize: 12 }, tickLine: false }

function Tip({ active, payload, label, labelFor }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tip">
      <div className="chart-tip__label">{labelFor(label)}</div>
      {payload
        .filter((p) => p.value != null)
        .map((p) => (
          <div key={p.dataKey} className="chart-tip__row">
            <span className="chart-tip__swatch" style={{ background: p.color }} />
            {p.name} <strong>{fmtMoney(p.value)}</strong>
          </div>
        ))}
    </div>
  )
}

export function PaceChart({ pace, monthKey }) {
  const { points, flexBudget, spentSoFar, lastDay, days } = pace
  const paceToday = lastDay ? (flexBudget * lastDay) / days : 0
  const diff = spentSoFar - paceToday
  const shortMonth = monthLabel(monthKey, { month: 'short' })

  return (
    <section className="panel" aria-labelledby="pace-h">
      <header className="panel__head">
        <h2 id="pace-h">Everyday spending</h2>
        <span className="panel__hint">Groceries, gas, dining, shopping… not bills</span>
      </header>
      <p className="chart-summary">
        {lastDay === 0 ? (
          <>Budget for everyday spending: {fmtMoneyRound(flexBudget)}</>
        ) : (
          <>
            <strong>{fmtMoney(spentSoFar)}</strong> of {fmtMoneyRound(flexBudget)} —{' '}
            {Math.abs(diff) < 1 ? 'right on pace' : diff > 0 ? `${fmtMoney(diff)} ahead of pace` : `${fmtMoney(-diff)} under pace`}
          </>
        )}
      </p>
      <div className="chart-legend" aria-hidden="true">
        <span><i className="swatch swatch--actual" /> Spent so far</span>
        <span><i className="swatch swatch--pace" /> Even pace</span>
      </div>
      <div className="chart" role="img" aria-label="Cumulative everyday spending compared to an even pace through the month">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={css('--line')} />
            <XAxis dataKey="day" {...axis} interval="preserveStartEnd" minTickGap={24} />
            <YAxis {...axis} axisLine={false} width={52} tickFormatter={fmtMoneyRound} />
            <Tooltip
              content={<Tip labelFor={(d) => `${shortMonth} ${d}`} />}
              cursor={{ stroke: css('--line-strong') }}
            />
            <Line
              name="Even pace"
              dataKey="pace"
              stroke={css('--chart-pace')}
              strokeWidth={2}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            <Line
              name="Spent so far"
              dataKey="actual"
              type="stepAfter"
              stroke={css('--chart-actual')}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: css('--surface') }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

export function TrendChart({ trend, budgeted, monthKey, onPickMonth }) {
  return (
    <section className="panel" aria-labelledby="trend-h">
      <header className="panel__head">
        <h2 id="trend-h">Month by month</h2>
        <span className="panel__hint">Total spent · line is your {fmtMoneyRound(budgeted)} budget</span>
      </header>
      <div className="chart" role="img" aria-label="Total spending for each of the last six months against the monthly budget">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={trend} margin={{ top: 16, right: 12, bottom: 0, left: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke={css('--line')} />
            <XAxis dataKey="label" {...axis} />
            <YAxis {...axis} axisLine={false} width={52} tickFormatter={fmtMoneyRound} />
            <Tooltip
              content={<Tip labelFor={(label) => monthLabel(trend.find((t) => t.label === label)?.key ?? monthKey)} />}
              cursor={{ fill: css('--hover') }}
            />
            <ReferenceLine y={budgeted} stroke={css('--ink-3')} strokeWidth={1.5} ifOverflow="extendDomain" />
            <Bar
              name="Spent"
              dataKey="spent"
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
              isAnimationActive={false}
              onClick={(d) => onPickMonth(d.key ?? d.payload?.key)}
              style={{ cursor: 'pointer' }}
            >
              {trend.map((t) => (
                <Cell key={t.key} fill={t.key === monthKey ? css('--chart-actual') : css('--chart-muted')} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
