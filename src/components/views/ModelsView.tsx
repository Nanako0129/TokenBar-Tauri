import React, { useMemo } from 'react'
import type { ModelReport, ModelReportEntry } from '../../lib/types'
import { getClientStyle } from '../../lib/clients'
import { humanizeTokens, formatCost, formatRelativeTime } from '../../lib/format'
import type { ColorFor } from '../../lib/modelColors'

interface Props {
  report: ModelReport | null
  clientIds: string[]
  colorFor: ColorFor
}

// tokscale's "Models by Cost" view (crates/tokscale-cli/src/tui/ui/models.rs),
// adapted to the popover width. One row per model sorted by cost: provider-tinted
// name + its share of total cost, a dim In·Out·CR·CW token split, and the model's
// total tokens with its cost in green. No row cap — the view scrolls.
const KINDS = [
  { key: 'input', label: 'In', pick: (e: ModelReportEntry) => e.input },
  { key: 'output', label: 'Out', pick: (e: ModelReportEntry) => e.output },
  { key: 'cacheRead', label: 'CR', pick: (e: ModelReportEntry) => e.cacheRead },
  { key: 'cacheWrite', label: 'CW', pick: (e: ModelReportEntry) => e.cacheWrite },
] as const

export function ModelsView({ report, clientIds, colorFor }: Props) {
  const allow = useMemo(() => new Set(clientIds), [clientIds])
  const rows = useMemo(() => {
    if (!report) return []
    return report.entries
      .filter(e => allow.size === 0 || allow.has(e.client))
      .sort((a, b) => b.cost - a.cost || b.total - a.total)
  }, [report, allow])

  const totalCost = useMemo(() => rows.reduce((s, e) => s + e.cost, 0), [rows])
  const totalTokens = useMemo(() => rows.reduce((s, e) => s + e.total, 0), [rows])

  if (!report) return null

  return (
    <div className="dashboard-stack">
      <div className="model-card">
        <div className="model-head">
          <h2 className="model-heading">Models by cost</h2>
          <div className="model-head-meta">
            <div className="model-sub">
              {rows.length} model{rows.length === 1 ? '' : 's'} · {humanizeTokens(totalTokens)} · {formatCost(totalCost)}
            </div>
            {report.pricingUpdatedAt != null && (
              <div className="model-priced" title="LiteLLM pricing data; refreshes automatically about once an hour">
                Prices updated {formatRelativeTime(report.pricingUpdatedAt)}
              </div>
            )}
          </div>
        </div>
        {rows.length === 0 ? (
          <div className="model-empty">No model usage in this range</div>
        ) : (
          <div className="modelsv-rows">
            {rows.map(e => {
              const style = getClientStyle(e.client)
              const color = colorFor(e.provider, e.model)
              const share = totalCost > 0 ? (e.cost / totalCost) * 100 : 0
              return (
                <div className="modelsv-row" key={`${e.client}|${e.model}|${e.provider}`}>
                  <span className="model-source" style={{ background: color }} aria-hidden="true" />
                  <div className="modelsv-meta">
                    <div className="modelsv-line1">
                      <span className="modelsv-name" title={`${e.model} · ${style.displayName}`}>
                        {e.model}
                      </span>
                      <span className="modelsv-share">{share.toFixed(1)}%</span>
                    </div>
                    <div className="modelsv-kinds">
                      {KINDS.map(k => (
                        <span className="modelsv-kind" key={k.key}>
                          <span className="modelsv-kind-label">{k.label}</span>
                          {humanizeTokens(k.pick(e))}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="modelsv-vals">
                    <span className="modelsv-tokens">{humanizeTokens(e.total)}</span>
                    <span className="modelsv-cost">{formatCost(e.cost)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
