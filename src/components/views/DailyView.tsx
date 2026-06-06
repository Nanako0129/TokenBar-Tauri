import React, { useMemo, useState } from 'react'
import type { Contribution, UsagePayload } from '../../lib/types'
import { humanizeTokens, formatCost, formatMonthDay } from '../../lib/format'
import { getClientStyle } from '../../lib/clients'
import type { ColorFor } from '../../lib/modelColors'

interface Props {
  payload: UsagePayload
  clientIds: string[]
  colorFor: ColorFor
}

interface DayRow {
  date: string
  tokens: number
  cost: number
  messages: number
  contribution: Contribution
}

interface ModelSlice {
  key: string
  model: string
  provider: string
  color: string
  tokens: number
  cost: number
}

function clientTokens(t: { input: number; output: number; cacheRead: number; cacheWrite: number; reasoning: number }): number {
  return (t.input || 0) + (t.output || 0) + (t.cacheRead || 0) + (t.cacheWrite || 0) + (t.reasoning || 0)
}

// tokscale's "Daily" view: one row per active day (most recent first) with msgs,
// total tokens and cost. Selecting a day drills into that day's per-model split
// — the same provider-tinted breakdown the Models view uses, scoped to the date.
export function DailyView({ payload, clientIds, colorFor }: Props) {
  const [open, setOpen] = useState<string | null>(null)
  const allow = useMemo(() => new Set(clientIds), [clientIds])

  const rows = useMemo(() => {
    const out: DayRow[] = []
    for (const c of payload.contributions) {
      let tokens = 0
      let cost = 0
      let messages = 0
      for (const cc of c.clients) {
        if (allow.size > 0 && !allow.has(cc.client)) continue
        tokens += clientTokens(cc.tokens)
        cost += cc.cost || 0
        messages += cc.messages || 0
      }
      if (tokens <= 0 && cost <= 0) continue
      out.push({ date: c.date, tokens, cost, messages, contribution: c })
    }
    return out.sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [payload, allow])

  function modelsFor(c: Contribution): ModelSlice[] {
    const grouped = new Map<string, ModelSlice>()
    for (const cc of c.clients) {
      if (allow.size > 0 && !allow.has(cc.client)) continue
      const tokens = clientTokens(cc.tokens)
      if (tokens <= 0 && (cc.cost || 0) <= 0) continue
      const model = cc.modelId || 'unknown'
      const key = `${model}|${cc.providerId}`
      let slot = grouped.get(key)
      if (!slot) {
        slot = { key, model, provider: cc.providerId, color: colorFor(cc.providerId, model), tokens: 0, cost: 0 }
        grouped.set(key, slot)
      }
      slot.tokens += tokens
      slot.cost += cc.cost || 0
    }
    return Array.from(grouped.values()).sort((a, b) => b.cost - a.cost || b.tokens - a.tokens)
  }

  return (
    <div className="dashboard-stack">
      <div className="model-card">
        <div className="model-head">
          <h2 className="model-heading">Daily</h2>
          <div className="model-sub">{rows.length} active day{rows.length === 1 ? '' : 's'}</div>
        </div>
        {rows.length === 0 ? (
          <div className="model-empty">No usage in this range</div>
        ) : (
          <div className="daily-rows">
            {rows.map(r => {
              const isOpen = open === r.date
              const slices = isOpen ? modelsFor(r.contribution) : []
              return (
                <div className={`daily-item${isOpen ? ' is-open' : ''}`} key={r.date}>
                  <button
                    type="button"
                    className="daily-row"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : r.date)}
                  >
                    <span className={`daily-caret${isOpen ? ' is-open' : ''}`} aria-hidden="true">›</span>
                    <span className="daily-date">{formatMonthDay(r.date)}</span>
                    <span className="daily-msgs">{r.messages.toLocaleString('en-US')} msgs</span>
                    <span className="daily-tokens">{humanizeTokens(r.tokens)}</span>
                    <span className="daily-cost">{formatCost(r.cost)}</span>
                  </button>
                  {isOpen && (
                    <div className="daily-models">
                      {slices.map(s => (
                        <div className="daily-model" key={s.key}>
                          <span className="model-source" style={{ background: s.color }} aria-hidden="true" />
                          <span className="daily-model-name" title={`${s.model} · ${s.provider}`}>{s.model}</span>
                          <span className="daily-model-tokens">{humanizeTokens(s.tokens)}</span>
                          <span className="daily-model-cost">{formatCost(s.cost)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
