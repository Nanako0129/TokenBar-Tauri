import { useEffect, useState } from 'react'
import type { AgentsReport, AgentsReportEnvelope } from '../lib/types'
import { isTauri } from '../lib/runtime'

interface State {
  report: AgentsReport | null
  error: string | null
}

// Per-(sub-)agent usage breakdown for `year`. Re-fetches on year change or
// refresh tick. Lazily fetched: callers should only mount this when the Agents
// view is active, so the parse runs on demand.
export function useAgentsReport(year: string, refreshKey: number): State {
  const [state, setState] = useState<State>({ report: null, error: null })

  useEffect(() => {
    if (!year) return
    let disposed = false

    if (!isTauri()) {
      ;(async () => {
        try {
          const res = await fetch(`/api/agents-report?year=${encodeURIComponent(year)}`)
          if (!res.ok) throw new Error(`agents report ${res.status}`)
          const env: AgentsReportEnvelope = await res.json()
          if (!disposed) setState({ report: env.payload, error: null })
        } catch (err) {
          if (!disposed) setState(s => ({ ...s, error: (err as Error).message ?? String(err) }))
        }
      })()
      return () => {
        disposed = true
      }
    }

    ;(async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        const env = await invoke<AgentsReportEnvelope>('get_agents_report', { year })
        if (disposed) return
        if (env.year !== year) return
        setState({ report: env.payload, error: null })
      } catch (err) {
        if (!disposed) setState(s => ({ ...s, error: (err as Error).message ?? String(err) }))
      }
    })()
    return () => {
      disposed = true
    }
  }, [year, refreshKey])

  return state
}
