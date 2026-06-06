import React, { useMemo } from 'react'
import type { HourlyReport } from '../../lib/types'
import { humanizeTokens, formatCost } from '../../lib/format'

interface Props {
  report: HourlyReport | null
  // When a single client is selected, slots are filtered to those involving it.
  // Per-slot totals are not split by client, so filtered totals are coarse —
  // the view surfaces that caveat.
  clientIds: string[]
  filtered: boolean
  error: string | null
}

interface HourBucket {
  hour: number
  tokens: number
  cost: number
  messages: number
  turns: number
}

// tokscale's "Hourly" view, folded into a 24-hour-of-day rhythm: each
// "YYYY-MM-DD HH:00" slot is bucketed by its hour, so the bars show when in the
// day tokens are spent rather than a flat per-slot timeline.
export function HourlyView({ report, clientIds, filtered, error }: Props) {
  const allow = useMemo(() => new Set(clientIds), [clientIds])

  const buckets = useMemo(() => {
    const out: HourBucket[] = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      tokens: 0,
      cost: 0,
      messages: 0,
      turns: 0,
    }))
    if (!report) return out
    for (const e of report.entries) {
      if (allow.size > 0 && !e.clients.some(c => allow.has(c))) continue
      // hour string is "YYYY-MM-DD HH:00"
      const hh = Number(e.hour.slice(11, 13))
      if (!Number.isFinite(hh) || hh < 0 || hh > 23) continue
      const b = out[hh]
      b.tokens += e.total
      b.cost += e.cost
      b.messages += e.messageCount
      b.turns += e.turnCount
    }
    return out
  }, [report, allow])

  const maxTokens = useMemo(() => Math.max(1, ...buckets.map(b => b.tokens)), [buckets])
  const totalCost = useMemo(() => buckets.reduce((s, b) => s + b.cost, 0), [buckets])
  const peak = useMemo(
    () => buckets.reduce((best, b) => (b.tokens > best.tokens ? b : best), buckets[0]),
    [buckets],
  )
  const hasData = buckets.some(b => b.tokens > 0 || b.cost > 0)

  return (
    <div className="dashboard-stack">
      <div className="model-card">
        <div className="model-head">
          <h2 className="model-heading">Hourly rhythm</h2>
          <div className="model-sub">
            {hasData ? `peak ${String(peak.hour).padStart(2, '0')}:00 · ${formatCost(totalCost)}` : '—'}
          </div>
        </div>
        {error ? (
          <div className="model-empty">Error: {error}</div>
        ) : !report ? (
          <div className="model-empty">Loading…</div>
        ) : !hasData ? (
          <div className="model-empty">No usage in this range</div>
        ) : (
          <>
            {filtered && (
              <div className="hourly-note">Filtered hours include each slot's full total across agents.</div>
            )}
            <div className="hourly-rows">
              {buckets.map(b => {
                const width = (b.tokens / maxTokens) * 100
                return (
                  <div className="hourly-row" key={b.hour}>
                    <span className="hourly-hour">{String(b.hour).padStart(2, '0')}:00</span>
                    <div className="hourly-track">
                      <div className="hourly-fill" style={{ width: `${width}%` }} />
                    </div>
                    <span className="hourly-tokens">{b.tokens > 0 ? humanizeTokens(b.tokens) : ''}</span>
                    <span className="hourly-cost">{b.cost > 0 ? formatCost(b.cost) : ''}</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
