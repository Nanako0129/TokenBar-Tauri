import React from 'react'
import type { ModelReport, ModelReportEntry } from '../lib/types'
import { getClientStyle } from '../lib/clients'
import { humanizeTokens, formatCost } from '../lib/format'

interface Props {
  report: ModelReport | null
  // Restrict to these client ids (Overview passes every present client; a
  // per-client tab passes just its own). Empty = show everything.
  clientIds: string[]
  title?: string
}

// Echoes tokscale's TUI "Models" view (crates/tokscale-cli/src/tui/ui/models.rs):
// one row per model, sorted by cost, with the input/output/cache split shown as
// a stacked bar. Trimmed to the popover's width — the wide sortable table is
// distilled to model · source, a token total, and cost.
const MAX_ROWS = 8

interface Segment {
  key: string
  value: number
  className: string
}

function segments(e: ModelReportEntry): Segment[] {
  return [
    { key: 'input', value: e.input, className: 'model-seg-input' },
    { key: 'output', value: e.output, className: 'model-seg-output' },
    { key: 'cacheRead', value: e.cacheRead, className: 'model-seg-cache-read' },
    { key: 'cacheWrite', value: e.cacheWrite, className: 'model-seg-cache-write' },
    { key: 'reasoning', value: e.reasoning, className: 'model-seg-reasoning' },
  ].filter(s => s.value > 0)
}

export function ModelBreakdownCard({ report, clientIds, title = 'Models' }: Props) {
  if (!report) return null

  const allow = new Set(clientIds)
  const rows = report.entries
    .filter(e => allow.size === 0 || allow.has(e.client))
    .sort((a, b) => b.cost - a.cost || b.total - a.total)

  const top = rows.slice(0, MAX_ROWS)
  const hidden = rows.length - top.length
  const totalCost = rows.reduce((s, e) => s + e.cost, 0)

  return (
    <div className="model-card">
      <div className="model-head">
        <h2 className="model-heading">{title}</h2>
        <div className="model-sub">
          {rows.length} model{rows.length === 1 ? '' : 's'} · {formatCost(totalCost)}
        </div>
      </div>
      {top.length === 0 ? (
        <div className="model-empty">No model usage in this range</div>
      ) : (
        <div className="model-rows">
          {top.map(e => {
            const style = getClientStyle(e.client)
            const segs = segments(e)
            return (
              <div className="model-row" key={`${e.client}|${e.model}|${e.provider}`}>
                <span
                  className="model-source"
                  style={{ background: style.color }}
                  title={`${style.displayName} · ${e.provider}`}
                  aria-hidden="true"
                />
                <div className="model-meta">
                  <span className="model-name" title={e.model}>{e.model}</span>
                  <div className="model-bar" title={`${humanizeTokens(e.total)} tokens`}>
                    {segs.map(s => (
                      <span
                        key={s.key}
                        className={`model-seg ${s.className}`}
                        style={{ width: `${(s.value / e.total) * 100}%` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="model-vals">
                  <span className="model-tokens">{humanizeTokens(e.total)}</span>
                  <span className="model-cost">{formatCost(e.cost)}</span>
                </div>
              </div>
            )
          })}
          {hidden > 0 && <div className="model-more">+{hidden} more</div>}
        </div>
      )}
    </div>
  )
}
