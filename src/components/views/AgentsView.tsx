import React, { useMemo } from 'react'
import type { AgentsReport } from '../../lib/types'
import { getClientStyle } from '../../lib/clients'
import { humanizeTokens, formatCost } from '../../lib/format'

interface Props {
  report: AgentsReport | null
  // Restrict to agents that ran under any of these clients. Empty = all.
  clientIds: string[]
  error: string | null
}

// tokscale's "Agents" view: named sub-agents (plus a "Main" bucket for
// unattributed messages) ranked by cost, showing the source clients they ran
// under, their message count, total tokens, and cost.
export function AgentsView({ report, clientIds, error }: Props) {
  const allow = useMemo(() => new Set(clientIds), [clientIds])

  const rows = useMemo(() => {
    if (!report) return []
    return report.entries.filter(e => allow.size === 0 || e.clients.some(c => allow.has(c)))
  }, [report, allow])

  const totalCost = useMemo(() => rows.reduce((s, e) => s + e.cost, 0), [rows])
  const maxCost = useMemo(() => Math.max(1, ...rows.map(e => e.cost)), [rows])

  return (
    <div className="dashboard-stack">
      <div className="model-card">
        <div className="model-head">
          <h2 className="model-heading">Agents by cost</h2>
          <div className="model-sub">
            {rows.length} agent{rows.length === 1 ? '' : 's'} · {formatCost(totalCost)}
          </div>
        </div>
        {error ? (
          <div className="model-empty">Error: {error}</div>
        ) : !report ? (
          <div className="model-empty">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="model-empty">No agent activity in this range</div>
        ) : (
          <div className="agents-rows">
            {rows.map(e => {
              const share = totalCost > 0 ? (e.cost / totalCost) * 100 : 0
              const barWidth = (e.cost / maxCost) * 100
              const sources = e.clients.map(c => getClientStyle(c).displayName).join(' · ')
              return (
                <div className="agents-row" key={e.agent}>
                  <div className="agents-line1">
                    <span className="agents-name" title={e.agent}>{e.agent}</span>
                    <span className="agents-share">{share.toFixed(1)}%</span>
                  </div>
                  <div className="agents-track">
                    <div className="agents-fill" style={{ width: `${barWidth}%` }} />
                  </div>
                  <div className="agents-line2">
                    <span className="agents-sources" title={sources}>{sources}</span>
                    <span className="agents-stats">
                      {e.messages.toLocaleString('en-US')} msgs · {humanizeTokens(e.total)} · {formatCost(e.cost)}
                    </span>
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
