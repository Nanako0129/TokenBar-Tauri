import React, { useRef, useState } from 'react'
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

interface HoverState {
  entry: ModelReportEntry
  left: number
  top: number
  transform: string
}

// Echoes tokscale's TUI "Models" view (crates/tokscale-cli/src/tui/ui/models.rs):
// one row per model, sorted by cost, with the input/output/cache split shown as
// a stacked bar. Trimmed to the popover's width — the wide sortable table is
// distilled to model · source, a token total, and cost.
const MAX_ROWS = 8

// Single source of truth for the stacked-bar token categories: drives the bar
// segments, the hover tooltip rows, and the legend. The CSS class colors live
// in styles.css (.model-seg-*).
const TOKEN_KINDS = [
  { key: 'input', label: 'Input', className: 'model-seg-input', pick: (e: ModelReportEntry) => e.input },
  { key: 'output', label: 'Output', className: 'model-seg-output', pick: (e: ModelReportEntry) => e.output },
  { key: 'cacheRead', label: 'Cache read', className: 'model-seg-cache-read', pick: (e: ModelReportEntry) => e.cacheRead },
  { key: 'cacheWrite', label: 'Cache write', className: 'model-seg-cache-write', pick: (e: ModelReportEntry) => e.cacheWrite },
  { key: 'reasoning', label: 'Reasoning', className: 'model-seg-reasoning', pick: (e: ModelReportEntry) => e.reasoning },
] as const

export function ModelBreakdownCard({ report, clientIds, title = 'Models' }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [hover, setHover] = useState<HoverState | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  if (!report) return null

  const allow = new Set(clientIds)
  const rows = report.entries
    .filter(e => allow.size === 0 || allow.has(e.client))
    .sort((a, b) => b.cost - a.cost || b.total - a.total)

  const visible = expanded ? rows : rows.slice(0, MAX_ROWS)
  const hidden = rows.length - Math.min(rows.length, MAX_ROWS)
  const totalCost = rows.reduce((s, e) => s + e.cost, 0)

  // Float a rich tooltip near the cursor, like the Token Usage chart. Position
  // is relative to the card; flip horizontally near the edges and drop below
  // the cursor for rows near the top so it doesn't clip out of the card.
  function showTooltip(e: React.MouseEvent, entry: ModelReportEntry) {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const pctX = (x / rect.width) * 100
    const tx = pctX > 74 ? '-100%' : pctX < 26 ? '0' : '-50%'
    const ty = y > 110 ? 'calc(-100% - 10px)' : 'calc(0% + 14px)'
    setHover({ entry, left: x, top: y, transform: `translate(${tx}, ${ty})` })
  }

  const hoverStyle = hover ? getClientStyle(hover.entry.client) : null

  return (
    <div className="model-card" ref={cardRef}>
      <div className="model-head">
        <h2 className="model-heading">{title}</h2>
        <div className="model-sub">
          {rows.length} model{rows.length === 1 ? '' : 's'} · {formatCost(totalCost)}
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="model-empty">No model usage in this range</div>
      ) : (
        <>
          <div className="model-legend" aria-hidden="true">
            {TOKEN_KINDS.map(k => (
              <span className="model-legend-item" key={k.key}>
                <span className={`model-legend-swatch ${k.className}`} />
                {k.label}
              </span>
            ))}
          </div>
          <div className={`model-rows${expanded ? ' is-expanded' : ''}`}>
            {visible.map(e => {
              const style = getClientStyle(e.client)
              const segs = TOKEN_KINDS.map(k => ({ ...k, value: k.pick(e) })).filter(s => s.value > 0)
              // Bar widths use a square-root scale: cache-read tokens routinely
              // dwarf input/output/reasoning by 10-100×, so a linear stacked bar
              // would render everything else as invisible slivers, while a log
              // scale flattens everything to near-equal widths. sqrt is the
              // middle ground — the dominant category still reads clearly as the
              // largest, but small categories stay visible. The tooltip reports
              // the true token count and true linear share.
              const scaleTotal = segs.reduce((sum, s) => sum + Math.sqrt(s.value), 0)
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
                    <div
                      className="model-bar"
                      onMouseEnter={ev => showTooltip(ev, e)}
                      onMouseMove={ev => showTooltip(ev, e)}
                      onMouseLeave={() => setHover(null)}
                    >
                      {segs.map(s => {
                        const width = scaleTotal > 0 ? (Math.sqrt(s.value) / scaleTotal) * 100 : 0
                        return (
                          <span
                            key={s.key}
                            className={`model-seg ${s.className}`}
                            style={{ width: `${width}%` }}
                          />
                        )
                      })}
                    </div>
                  </div>
                  <div className="model-vals">
                    <span className="model-tokens">{humanizeTokens(e.total)}</span>
                    <span className="model-cost">{formatCost(e.cost)}</span>
                  </div>
                </div>
              )
            })}
          </div>
          {hidden > 0 && (
            <button
              type="button"
              className="model-toggle"
              onClick={() => setExpanded(v => !v)}
              aria-expanded={expanded}
            >
              {expanded ? 'Show less' : `Show ${hidden} more`}
            </button>
          )}
        </>
      )}
      {hover && hoverStyle && (
        <div
          className="model-tooltip"
          style={{ left: hover.left, top: hover.top, transform: hover.transform }}
          role="status"
        >
          <div className="model-tooltip-head">
            <span className="model-tooltip-dot" style={{ background: hoverStyle.color }} />
            {hover.entry.model}
          </div>
          <div className="model-tooltip-sub">
            {hoverStyle.displayName} · {hover.entry.provider}
          </div>
          <div className="model-tooltip-total">
            <span>{humanizeTokens(hover.entry.total)} tokens</span>
            <span>{formatCost(hover.entry.cost)}</span>
          </div>
          <div className="model-tooltip-rows">
            {TOKEN_KINDS.map(k => ({ ...k, value: k.pick(hover.entry) }))
              .filter(s => s.value > 0)
              .map(s => {
                const pct = hover.entry.total > 0 ? (s.value / hover.entry.total) * 100 : 0
                return (
                  <div className="model-tooltip-row" key={s.key}>
                    <span className="model-tooltip-name">
                      <span className={`model-tooltip-dot ${s.className}`} />
                      {s.label}
                    </span>
                    <span className="model-tooltip-value">
                      {humanizeTokens(s.value)} · {pct.toFixed(0)}%
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
