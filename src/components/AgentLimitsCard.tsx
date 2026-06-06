import React from 'react'
import { clientInitial, getClientStyle } from '../lib/clients'
import type { AgentUsagePayload, AgentUsageSnapshot } from '../lib/agentUsage'
import type { TraceBucket } from '../lib/usage'

interface Props {
  clients: string[]
  trace: TraceBucket[]
  agentUsage: AgentUsagePayload | null
  title?: string
  note?: string
  // When true, bars fill by amount used (counting up) instead of remaining.
  asUsed?: boolean
}

interface LimitRow {
  label: string
  usedPercent?: number
  remainingPercent?: number
  resetText?: string
}

const LIMIT_ROWS: Record<string, LimitRow[]> = {
  codex: [{ label: 'Session' }, { label: 'Weekly' }],
  claude: [{ label: 'Session' }, { label: 'Weekly' }],
  gemini: [{ label: 'Pro' }, { label: 'Flash' }],
}

// tokscale's Usage view color-codes each quota bar by how much is left: a
// healthy window reads green, an exhausting one ambers then reds. When there's
// no quota signal yet we fall back to the agent's brand color.
function gaugeColor(remaining: number | undefined, brand: string): string {
  if (remaining === undefined) return brand
  if (remaining <= 10) return '#ef4444'
  if (remaining <= 25) return '#f59e0b'
  return '#22c55e'
}

function normalizeTraceClient(id: string): string {
  if (id === 'claude-code') return 'claude'
  if (id === 'codex-cli') return 'codex'
  if (id === 'gemini-cli') return 'gemini'
  return id.replace(/-cli$/, '')
}

function mark(id: string) {
  const style = getClientStyle(id)
  if (style.iconRaw) {
    return (
      <span
        className={`limit-agent-icon limit-agent-icon-${style.iconType}`}
        style={style.iconType === 'mono' ? { background: style.color } : undefined}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: style.iconRaw }}
      />
    )
  }
  return (
    <span className="limit-agent-icon" style={{ background: style.color }} aria-hidden="true">
      {clientInitial(style.displayName)}
    </span>
  )
}

export function AgentLimitsCard({ clients, trace, agentUsage, title = 'Agent limits', note = 'OAuth quota', asUsed = false }: Props) {
  const liveClients = new Set(trace.filter(t => t.tokens_per_min > 0).map(t => normalizeTraceClient(t.client)))
  const snapshots = new Map((agentUsage?.agents ?? []).map(agent => [agent.clientId, agent]))
  const visibleClients = Array.from(new Set([
    ...clients.filter(id => LIMIT_ROWS[id] || id === 'codex' || id === 'claude' || id === 'gemini'),
    ...Array.from(snapshots.keys()),
  ]))

  return (
    <div className="limits-card">
      <div className="limits-head">
        <h2 className="limits-title">{title}</h2>
        <span className="limits-note">{note}</span>
      </div>
      {visibleClients.length === 0 ? (
        <div className="limits-empty">No supported agents yet</div>
      ) : (
        <div className={`limits-list${visibleClients.length === 1 ? ' is-single' : ''}`}>
          {visibleClients.map(id => {
            const style = getClientStyle(id)
            const snapshot = snapshots.get(id)
            const rows = snapshot?.windows.length
              ? snapshot.windows
              : LIMIT_ROWS[id] ?? [{ label: 'Limit' }]
            const isLive = liveClients.has(id)
            const status = statusText(snapshot, isLive)
            return (
              <div className="limit-agent" key={id}>
                <div className="limit-agent-head">
                  <div className="limit-agent-name">
                    {mark(id)}
                    <span>{style.displayName}</span>
                  </div>
                  <span className={`limit-agent-status${isLive ? ' is-live' : ''}${snapshot?.error ? ' is-error' : ''}`}>
                    {status}
                  </span>
                </div>
                {(snapshot?.identity?.email || snapshot?.identity?.plan || snapshot?.error) && (
                  <div className="limit-agent-detail" title={snapshot?.error || undefined}>
                    {snapshot.error || [snapshot.identity?.email, snapshot.identity?.plan].filter(Boolean).join(' · ')}
                  </div>
                )}
                <div className="limit-windows">
                  {rows.map(row => {
                    const remaining = 'remainingPercent' in row ? row.remainingPercent : undefined
                    const used = remaining === undefined ? undefined : 100 - remaining
                    // Bar fills by used (counting up) or remaining (counting
                    // down); color always tracks how much quota is left.
                    const fill = asUsed ? used ?? 0 : remaining ?? 0
                    const left =
                      remaining === undefined
                        ? 'No data'
                        : asUsed
                          ? `${Math.max(0, used as number).toFixed(0)}% used`
                          : `${Math.max(0, remaining).toFixed(0)}% left`
                    return (
                      <div className="limit-window" key={row.label}>
                        <div className="limit-window-meta">
                          <span>{row.label}</span>
                          <span>{row.resetText || left}</span>
                        </div>
                        <div className="limit-bar">
                          <div
                            className="limit-bar-fill"
                            style={{
                              width: `${Math.min(100, Math.max(0, fill))}%`,
                              background: gaugeColor(remaining, style.color),
                            }}
                          />
                        </div>
                        {row.resetText && <div className="limit-window-left">{left}</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function statusText(snapshot: AgentUsageSnapshot | undefined, isLive: boolean): string {
  if (snapshot?.error) return 'Error'
  if (snapshot?.windows.length) return snapshot.source.toUpperCase()
  if (isLive) return 'Live'
  return 'No quota'
}
