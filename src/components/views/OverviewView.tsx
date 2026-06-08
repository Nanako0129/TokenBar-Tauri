import React from 'react'
import { UsageBarGraph2D, UsageView, StackBy } from '../UsageBarGraph2D'
import { AgentLimitsCard } from '../AgentLimitsCard'
import { UsageTraceCard } from '../UsageTraceCard'
import { ModelBreakdownCard } from '../ModelBreakdownCard'
import { StreaksCard } from '../StreaksCard'
import { getClientStyle } from '../../lib/clients'
import type { ModelReport, Stats, UsagePayload } from '../../lib/types'
import type { ColorFor } from '../../lib/modelColors'
import type { GridLayout } from '../../lib/grid'
import type { TraceBucket } from '../../lib/usage'
import type { AgentUsagePayload } from '../../lib/agentUsage'
import type { PaceMode, LimitsLayout } from '../../lib/settings'

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
  graphLight: string
  graphDark: string
  accent: string
  cmdHeld: boolean
  trace: TraceBucket[]
  detailedTrace: boolean
  agentUsage: AgentUsagePayload | null
  dashboardClients: string[]
  // Agent limit bars fill by used (true) or remaining (false).
  limitsAsUsed: boolean
  // Pace marker source (historical / linear / off) and card layout density.
  paceMode: PaceMode
  limitsLayout: LimitsLayout
  // When set, this view shows a single client's slice; otherwise it's the
  // all-agent overview (which also carries the live-session trace).
  singleClient: string | null
}

// The classic TokenBar dashboard stack, unchanged in spirit — now one lens
// among several. The all-agent overview leads with the usage chart and shows
// the live-session trace; a single-client view leads with that client's limits.
export function OverviewView({
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
  graphLight,
  graphDark,
  accent,
  cmdHeld,
  trace,
  detailedTrace,
  agentUsage,
  dashboardClients,
  limitsAsUsed,
  paceMode,
  limitsLayout,
  singleClient,
}: Props) {
  const chart = (
    <UsageBarGraph2D
      payload={payload}
      clientIds={clientIds}
      title="Token Usage"
      subtitle={stackBy === 'model' ? 'Stacked by model' : 'Stacked by agent'}
      view={usageView}
      onViewChange={onUsageViewChange}
      stackBy={stackBy}
      onStackByChange={onStackByChange}
      grid={grid}
      graphLight={graphLight}
      graphDark={graphDark}
      accent={accent}
      stats={stats}
      kbdHints={cmdHeld}
      colorFor={colorFor}
    />
  )

  if (singleClient) {
    const style = getClientStyle(singleClient)
    return (
      <div className="dashboard-stack">
        <AgentLimitsCard
          clients={[singleClient]}
          trace={trace}
          agentUsage={agentUsage}
          title={`${style.displayName} limits`}
          note="Session / weekly / model limits"
          asUsed={limitsAsUsed}
          paceMode={paceMode}
          layout={limitsLayout}
        />
        {chart}
        <ModelBreakdownCard
          report={modelReport}
          clientIds={clientIds}
          colorFor={colorFor}
          title={`${style.displayName} models`}
        />
        <StreaksCard longest={stats.streaks.longest} current={stats.streaks.current} />
      </div>
    )
  }

  return (
    <div className="dashboard-stack">
      {chart}
      <AgentLimitsCard clients={dashboardClients} trace={trace} agentUsage={agentUsage} asUsed={limitsAsUsed} paceMode={paceMode} layout={limitsLayout} />
      <UsageTraceCard buckets={trace} windowSecs={600} detailed={detailedTrace} title="Live session" />
      <ModelBreakdownCard report={modelReport} clientIds={clientIds} colorFor={colorFor} />
      <StreaksCard longest={stats.streaks.longest} current={stats.streaks.current} />
    </div>
  )
}
