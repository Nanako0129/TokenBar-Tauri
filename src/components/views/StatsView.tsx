import React, { useMemo } from 'react'
import { UsageBarGraph2D, UsageView, StackBy, Metric } from '../UsageBarGraph2D'
import type { ModelReport, Stats, UsagePayload } from '../../lib/types'
import type { ColorFor } from '../../lib/modelColors'
import type { GridLayout } from '../../lib/grid'
import { humanizeTokens, formatCost, formatMonthDay } from '../../lib/format'

interface Props {
  payload: UsagePayload
  clientIds: string[]
  stats: Stats
  grid: GridLayout
  colorFor: ColorFor
  modelReport: ModelReport | null
  usageView: UsageView
  onUsageViewChange: (v: UsageView) => void
  stackBy: StackBy
  onStackByChange: (s: StackBy) => void
  metric: Metric
  onMetricChange: (m: Metric) => void
  graphLight: string
  graphDark: string
  accent: string
  cmdHeld: boolean
}

// tokscale's "Stats" view: the contribution graph (reusing the 2D/3D usage
// chart) over a headline summary — total spend, favorite model, streaks, and
// activity — distilled from the same stats and model report the rest use.
export function StatsView({
  payload,
  clientIds,
  stats,
  grid,
  colorFor,
  modelReport,
  usageView,
  onUsageViewChange,
  stackBy,
  onStackByChange,
  metric,
  onMetricChange,
  graphLight,
  graphDark,
  accent,
  cmdHeld,
}: Props) {
  const favorite = useMemo(() => {
    if (!modelReport) return null
    const allow = new Set(clientIds)
    const rows = modelReport.entries.filter(e => allow.size === 0 || allow.has(e.client))
    if (rows.length === 0) return null
    return rows.reduce((best, e) => (e.cost > best.cost ? e : best), rows[0])
  }, [modelReport, clientIds])

  const metrics: { label: string; value: string; accent?: boolean }[] = [
    { label: 'Total tokens', value: humanizeTokens(stats.totalTokens) },
    { label: 'Total spend', value: formatCost(stats.totalCost), accent: true },
    { label: 'Active days', value: String(stats.activeDays) },
    { label: 'Avg / day', value: formatCost(stats.averagePerDay) },
    { label: 'Current streak', value: `${stats.streaks.current}d` },
    { label: 'Longest streak', value: `${stats.streaks.longest}d` },
  ]

  return (
    <div className="dashboard-stack">
      <UsageBarGraph2D
        payload={payload}
        clientIds={clientIds}
        title="Token Usage"
        subtitle={stackBy === 'model' ? 'Stacked by model' : 'Stacked by agent'}
        view={usageView}
        onViewChange={onUsageViewChange}
        stackBy={stackBy}
        onStackByChange={onStackByChange}
        metric={metric}
        onMetricChange={onMetricChange}
        grid={grid}
        graphLight={graphLight}
        graphDark={graphDark}
        accent={accent}
        stats={stats}
        kbdHints={cmdHeld}
        colorFor={colorFor}
      />
      <div className="stats-card">
        <div className="stats-headline">
          Your total spending is <span className="stats-headline-amt">{formatCost(stats.totalCost)}</span>
        </div>
        <div className="stats-grid">
          {metrics.map(m => (
            <div className="stats-cell" key={m.label}>
              <div className={`stats-cell-val${m.accent ? ' is-accent' : ''}`}>{m.value}</div>
              <div className="stats-cell-label">{m.label}</div>
            </div>
          ))}
        </div>
        <div className="stats-foot">
          {favorite && (
            <div className="stats-foot-row">
              <span className="stats-foot-label">Favorite model</span>
              <span className="stats-foot-val">
                <span className="model-source" style={{ background: colorFor(favorite.provider, favorite.model) }} aria-hidden="true" />
                {favorite.model}
              </span>
            </div>
          )}
          {stats.bestDay && (
            <div className="stats-foot-row">
              <span className="stats-foot-label">Best day</span>
              <span className="stats-foot-val">
                {formatMonthDay(stats.bestDay.date)} · {formatCost(stats.bestDay.cost)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
