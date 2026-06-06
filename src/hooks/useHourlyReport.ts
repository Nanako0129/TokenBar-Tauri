import { useEffect, useState } from 'react'
import type { HourlyReport, HourlyReportEnvelope } from '../lib/types'
import { isTauri } from '../lib/runtime'

interface State {
  report: HourlyReport | null
  error: string | null
}

// Per-hour usage breakdown for `year`. Re-fetches on year change or refresh
// tick. Lazily fetched: callers should only mount this when the Hourly view is
// active, so the parse runs on demand.
export function useHourlyReport(year: string, refreshKey: number): State {
  const [state, setState] = useState<State>({ report: null, error: null })

  useEffect(() => {
    if (!year) return
    let disposed = false

    if (!isTauri()) {
      ;(async () => {
        try {
          const res = await fetch(`/api/hourly-report?year=${encodeURIComponent(year)}`)
          if (!res.ok) throw new Error(`hourly report ${res.status}`)
          const env: HourlyReportEnvelope = await res.json()
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
        const env = await invoke<HourlyReportEnvelope>('get_hourly_report', { year })
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
