import React, { useEffect, useRef, useState } from 'react'
import { clientInitial, getClientStyle } from '../lib/clients'
import type { AgentUsagePayload, AgentUsageSnapshot, UsageWindow } from '../lib/agentUsage'
import type { TraceBucket } from '../lib/usage'
import { computePaceFor, paceLabel, paceEta, isDeficit, runOutRiskLabel } from '../lib/usagePace'
import type { PaceMode, LimitsLayout } from '../lib/settings'

interface Props {
  clients: string[]
  trace: TraceBucket[]
  agentUsage: AgentUsagePayload | null
  title?: string
  note?: string
  // When true, the bar label reads "% used" instead of "% left".
  asUsed?: boolean
  // How the pace marker is derived (historical / linear / off).
  paceMode?: PaceMode
  // Card density: 'full' (wide, with pace line) or 'classic' (compact).
  layout?: LimitsLayout
  // When true, show only the passed `clients` (single-client view) instead of
  // unioning in every agent that has a quota snapshot.
  restrict?: boolean
  // When true, cards can be reordered by dragging their grip handle; the order
  // persists to localStorage. Only meaningful for the multi-agent overview.
  reorderable?: boolean
}

const ORDER_KEY = 'tokenbar:limits-order:v1'

// Maps opencode subscription labels (from the backend) to the agent client ids
// whose quota cards represent them, so the opencode view can show those cards.
const SUB_LABEL_TO_ID: Record<string, string> = {
  Codex: 'codex',
  Claude: 'claude',
  Copilot: 'copilot',
  Gemini: 'antigravity',
}

function loadOrder(): string[] {
  try {
    const raw = localStorage.getItem(ORDER_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

// Move `from` to the `to` card's slot, direction-aware: dragging downward drops
// it just after `to`, dragging upward drops it just before `to`. (Plain
// "insert before" makes single-step downward moves a no-op.)
function reorder(list: string[], from: string, to: string): string[] {
  const fromI = list.indexOf(from)
  const toI = list.indexOf(to)
  if (fromI < 0 || toI < 0 || fromI === toI) return list
  const out = list.filter(id => id !== from)
  const insertAt = fromI < toI ? out.indexOf(to) + 1 : out.indexOf(to)
  out.splice(insertAt, 0, from)
  return out
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

const clamp = (v: number) => Math.min(100, Math.max(0, v))

// tokscale/codexbar Usage view: a quota bar reads green when healthy, ambers
// under 25% left and reds under 10%. No quota signal → the agent's brand color.
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

export function AgentLimitsCard({ clients, trace, agentUsage, title = 'Agent limits', note = 'OAuth quota', asUsed = false, paceMode = 'historical', layout = 'full', restrict = false, reorderable = false }: Props) {
  const classic = layout === 'classic'
  const liveClients = new Set(trace.filter(t => t.tokens_per_min > 0).map(t => normalizeTraceClient(t.client)))
  const snapshots = new Map((agentUsage?.agents ?? []).map(agent => [agent.clientId, agent]))
  const known = (id: string) => Boolean(LIMIT_ROWS[id]) || snapshots.has(id)

  // opencode is a router with no quota of its own; its client view instead
  // shows the cards of the subscriptions it's authed against (e.g. Codex, Copilot).
  const opencodeSubs = agentUsage?.opencodeSubscriptions ?? []
  const opencodeView = restrict && clients.includes('opencode')
  const opencodeCardIds = opencodeSubs
    .map(label => SUB_LABEL_TO_ID[label] ?? label.toLowerCase())
    .filter(id => snapshots.has(id))

  // `restrict` (single-client view) shows only the chosen client's quota;
  // otherwise the all-agent overview lists every agent that has a snapshot.
  const baseClients = opencodeView
    ? opencodeCardIds
    : restrict
      ? clients.filter(known)
      : Array.from(new Set([...clients.filter(known), ...snapshots.keys()]))

  const [order, setOrder] = useState<string[]>(loadOrder)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  // Apply the saved drag order; ids without a saved position keep their natural
  // order at the end. Reordering is disabled in single-client / non-reorderable views.
  const visibleClients =
    reorderable && order.length
      ? [...baseClients].sort((a, b) => {
          const ia = order.indexOf(a)
          const ib = order.indexOf(b)
          return (ia < 0 ? Infinity : ia) - (ib < 0 ? Infinity : ib)
        })
      : baseClients

  const commitReorder = (from: string, to: string) => {
    const next = reorder(visibleClients, from, to)
    setOrder(next)
    try {
      localStorage.setItem(ORDER_KEY, JSON.stringify(next))
    } catch {}
  }

  // Pointer-based reorder: WKWebView's HTML5 drag-and-drop is unreliable, so we
  // track the pointer ourselves. While a handle is held, find the card under the
  // pointer via elementFromPoint and drop the dragged card before it on release.
  const overIdRef = useRef<string | null>(null)
  overIdRef.current = overId
  const commitRef = useRef(commitReorder)
  commitRef.current = commitReorder
  useEffect(() => {
    if (!reorderable || !dragId) return
    const onMove = (e: PointerEvent) => {
      const el = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest(
        '.limit-agent',
      ) as HTMLElement | null
      const id = el?.dataset.clientId ?? null
      setOverId(id && id !== dragId ? id : null)
    }
    const onUp = () => {
      const over = overIdRef.current
      if (over && over !== dragId) commitRef.current(dragId, over)
      setDragId(null)
      setOverId(null)
    }
    const onCancel = () => { setDragId(null); setOverId(null) }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
    window.addEventListener('pointercancel', onCancel, { once: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
    }
  }, [dragId, reorderable])

  // Which edge of a card the drop line sits on, matching the direction-aware
  // insert: below when dragging down onto it, above when dragging up.
  const dropEdge = (id: string): 'above' | 'below' | null => {
    if (!reorderable || !dragId || overId !== id || dragId === id) return null
    return visibleClients.indexOf(dragId) < visibleClients.indexOf(id) ? 'below' : 'above'
  }

  return (
    <div className="limits-card">
      <div className="limits-head">
        <h2 className="limits-title">{title}</h2>
        <span className="limits-note">{note}</span>
      </div>
      {opencodeView ? (
        <div className="limits-integration">↔ Routes through opencode</div>
      ) : !restrict && opencodeSubs.length > 0 ? (
        <div className="limits-integration">opencode also taps: {opencodeSubs.join(' · ')}</div>
      ) : null}
      {visibleClients.length === 0 ? (
        <div className="limits-empty">
          {opencodeView && opencodeSubs.length > 0
            ? `Subscriptions: ${opencodeSubs.join(' · ')}`
            : 'No supported agents yet'}
        </div>
      ) : (
        <div className={`limits-list${classic && visibleClients.length === 1 ? ' is-single' : ''}${classic ? ' is-classic' : ''}${dragId ? ' is-reordering' : ''}`}>
          {visibleClients.map(id => {
            const style = getClientStyle(id)
            const snapshot = snapshots.get(id)
            const rows: LimitRow[] = snapshot?.windows.length
              ? snapshot.windows
              : LIMIT_ROWS[id] ?? [{ label: 'Limit' }]
            const isLive = liveClients.has(id)
            const status = statusText(snapshot, isLive)
            return (
              <div
                className={`limit-agent${dragId === id ? ' is-dragging' : ''}${dropEdge(id) ? ` is-drop-${dropEdge(id)}` : ''}`}
                key={id}
                data-client-id={id}
              >
                <div className="limit-agent-head">
                  <div className="limit-agent-name">
                    {reorderable && (
                      <span
                        className="limit-drag-handle"
                        aria-label="Drag to reorder"
                        title="Drag to reorder"
                        onPointerDown={e => { e.preventDefault(); setDragId(id) }}
                      >
                        ⠿
                      </span>
                    )}
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
                    const hasData = row.remainingPercent !== undefined && row.usedPercent !== undefined
                    const remaining = hasData ? row.remainingPercent! : undefined
                    const used = hasData ? row.usedPercent! : undefined
                    // Pace is suppressed entirely in the classic layout and when
                    // the user turns it off; otherwise it follows the chosen mode.
                    const pace = hasData && !classic ? computePaceFor(row as UsageWindow, paceMode) : null
                    // The bar fills by used (counting up) or remaining (counting
                    // down) per the setting; the pace marker sits on the same
                    // axis so it lines up with the fill either way.
                    const fill = asUsed ? used ?? 0 : remaining ?? 0
                    const paceLeft = pace
                      ? asUsed
                        ? pace.expectedUsedPercent
                        : 100 - pace.expectedUsedPercent
                      : 0
                    const leftLabel =
                      remaining === undefined
                        ? 'No data'
                        : asUsed
                          ? `${Math.round(clamp(used as number))}% used`
                          : `${Math.round(clamp(remaining))}% left`
                    const eta = pace ? paceEta(pace) : null
                    // Historical run-out risk only pairs with the historical pace.
                    const risk = pace && paceMode === 'historical' ? runOutRiskLabel(row as UsageWindow) : null

                    if (classic) {
                      return (
                        <div className="limit-window" key={row.label}>
                          <div className="limit-window-meta">
                            <span>{row.label}</span>
                            <span>{row.resetText || leftLabel}</span>
                          </div>
                          <div className="limit-bar">
                            <div
                              className="limit-bar-fill"
                              style={{ width: `${clamp(fill)}%`, background: gaugeColor(remaining, style.color) }}
                            />
                          </div>
                          {row.resetText && <div className="limit-window-left">{leftLabel}</div>}
                        </div>
                      )
                    }

                    return (
                      <div className="limit-window" key={row.label}>
                        <div className="limit-window-meta">
                          <span className="limit-window-name">{row.label}</span>
                          {row.resetText && <span className="limit-window-reset">{row.resetText}</span>}
                        </div>
                        <div className="limit-bar">
                          <div
                            className="limit-bar-fill"
                            style={{ width: `${clamp(fill)}%`, background: gaugeColor(remaining, style.color) }}
                          />
                          {pace && (
                            <span
                              className={`limit-pace-line${isDeficit(pace.stage) ? ' is-deficit' : ''}`}
                              style={{ left: `${clamp(paceLeft)}%` }}
                              title={`Expected ${Math.round(pace.expectedUsedPercent)}% used by now`}
                            />
                          )}
                        </div>
                        <div className="limit-window-foot">
                          <span className="limit-left">{leftLabel}</span>
                          {pace && (
                            <span className={`limit-pace${isDeficit(pace.stage) ? ' is-deficit' : ' is-reserve'}`}>
                              {paceLabel(pace)}{eta ? ` · ${eta}` : ''}{risk ? ` · ${risk}` : ''}
                            </span>
                          )}
                        </div>
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
