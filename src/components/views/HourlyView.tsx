import React, { useEffect, useMemo, useState } from 'react'
import type { HourlyReport, HourlyReportEntry } from '../../lib/types'
import { humanizeTokens, formatCost } from '../../lib/format'

// Timeline can hold thousands of per-hour slots for long-running accounts.
// Rendering them all at once janks WKWebView (DOM + paint + the overlay
// scrollbar's MutationObserver), so we render a window and grow it on demand.
const TIMELINE_INITIAL = 200
const TIMELINE_STEP = 200

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

// tokscale exposes two hourly lenses: a chronological per-day-per-hour table
// ("Timeline" — its default) and a 24-hour-of-day "Profile" rhythm. We mirror
// both behind a toggle; Timeline is the default so each day's hours stay
// independent rather than being folded into one 24-hour distribution.
type HourlyMode = 'timeline' | 'profile'
const MODE_KEY = 'tokenbar:hourly-mode:v1'

function loadMode(): HourlyMode {
  try {
    return localStorage.getItem(MODE_KEY) === 'profile' ? 'profile' : 'timeline'
  } catch {
    return 'timeline'
  }
}

// Local "YYYY-MM-DD HH:00" for the current hour, to highlight the live slot.
function currentHourKey(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:00`
}

export function HourlyView({ report, clientIds, filtered, error }: Props) {
  const allow = useMemo(() => new Set(clientIds), [clientIds])
  const [mode, setMode] = useState<HourlyMode>(loadMode)
  const [visible, setVisible] = useState(TIMELINE_INITIAL)

  const changeMode = (next: HourlyMode) => {
    setMode(next)
    try {
      localStorage.setItem(MODE_KEY, next)
    } catch {}
  }

  // Profile: fold every slot into a 24-hour-of-day rhythm.
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
      const hh = Number(e.hour.slice(11, 13)) // "YYYY-MM-DD HH:00"
      if (!Number.isFinite(hh) || hh < 0 || hh > 23) continue
      const b = out[hh]
      b.tokens += e.total
      b.cost += e.cost
      b.messages += e.messageCount
      b.turns += e.turnCount
    }
    return out
  }, [report, allow])

  // Timeline: each "YYYY-MM-DD HH:00" slot on its own, newest first.
  const timeline = useMemo<HourlyReportEntry[]>(() => {
    if (!report) return []
    return report.entries
      .filter(e => (allow.size === 0 || e.clients.some(c => allow.has(c))) && (e.total > 0 || e.cost > 0))
      .slice()
      .sort((a, b) => b.hour.localeCompare(a.hour))
  }, [report, allow])

  const profileMax = useMemo(() => Math.max(1, ...buckets.map(b => b.tokens)), [buckets])
  const timelineMax = useMemo(() => Math.max(1, ...timeline.map(e => e.total)), [timeline])
  const peak = useMemo(
    () => buckets.reduce((best, b) => (b.tokens > best.tokens ? b : best), buckets[0]),
    [buckets],
  )
  const profileCost = useMemo(() => buckets.reduce((s, b) => s + b.cost, 0), [buckets])
  const timelineCost = useMemo(() => timeline.reduce((s, e) => s + e.cost, 0), [timeline])

  // Reset the window whenever the underlying slice changes (new report, client
  // filter, or switching back to timeline) so we don't keep a huge list mounted.
  useEffect(() => {
    setVisible(TIMELINE_INITIAL)
  }, [timeline, mode])
  const shownTimeline = useMemo(() => timeline.slice(0, visible), [timeline, visible])

  const hasData = mode === 'profile' ? buckets.some(b => b.tokens > 0 || b.cost > 0) : timeline.length > 0
  const nowKey = currentHourKey()

  const subtitle =
    mode === 'profile'
      ? hasData
        ? `peak ${String(peak.hour).padStart(2, '0')}:00 · ${formatCost(profileCost)}`
        : '—'
      : hasData
        ? `${timeline.length} hrs · ${formatCost(timelineCost)}`
        : '—'

  return (
    <div className="dashboard-stack">
      <div className="model-card">
        <div className="model-head">
          <h2 className="model-heading">{mode === 'profile' ? 'Hourly rhythm' : 'Hourly usage'}</h2>
          <div className="model-head-right">
            <div className="model-sub">{subtitle}</div>
            <div className="bar2d-viewtoggle" role="group" aria-label="Hourly view">
              <button
                type="button"
                className={`bar2d-viewbtn${mode === 'timeline' ? ' is-active' : ''}`}
                onClick={() => changeMode('timeline')}
                aria-pressed={mode === 'timeline'}
              >
                Timeline
              </button>
              <button
                type="button"
                className={`bar2d-viewbtn${mode === 'profile' ? ' is-active' : ''}`}
                onClick={() => changeMode('profile')}
                aria-pressed={mode === 'profile'}
              >
                Profile
              </button>
            </div>
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
            {mode === 'profile' ? (
              <div className="hourly-rows">
                {buckets.map(b => {
                  const width = (b.tokens / profileMax) * 100
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
            ) : (
              <>
                <div className="hourly-rows">
                  {shownTimeline.map(e => {
                    const width = (e.total / timelineMax) * 100
                    const isCurrent = e.hour === nowKey
                    // "YYYY-MM-DD HH:00" → "MM-DD HH:00"
                    const label = e.hour.slice(5, 16)
                    return (
                      <div className={`hourly-row is-timeline${isCurrent ? ' is-current' : ''}`} key={e.hour}>
                        <span className="hourly-hour">{label}</span>
                        <div className="hourly-track">
                          <div className="hourly-fill" style={{ width: `${width}%` }} />
                        </div>
                        <span className="hourly-tokens">{e.total > 0 ? humanizeTokens(e.total) : ''}</span>
                        <span className="hourly-cost">{e.cost > 0 ? formatCost(e.cost) : ''}</span>
                      </div>
                    )
                  })}
                </div>
                {timeline.length > visible && (
                  <button
                    type="button"
                    className="hourly-more"
                    onClick={() => setVisible(v => Math.min(v + TIMELINE_STEP, timeline.length))}
                  >
                    Show {Math.min(TIMELINE_STEP, timeline.length - visible)} more · {visible} of {timeline.length}
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
