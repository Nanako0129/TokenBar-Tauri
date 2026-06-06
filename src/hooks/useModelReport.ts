import { useEffect, useState } from 'react'
import type { ModelReport, ModelReportEnvelope } from '../lib/types'
import { isTauri } from '../lib/runtime'

interface State {
  report: ModelReport | null
  error: string | null
}

// Per-model usage breakdown for `year`. Re-fetches when the year changes or
// when `refreshKey` ticks (manual refresh). Computed on demand in the backend;
// tokscale-core's message cache keeps the underlying parse cheap.
export function useModelReport(year: string, refreshKey: number): State {
  const [state, setState] = useState<State>({ report: null, error: null })

  useEffect(() => {
    if (!year) return
    let disposed = false

    if (!isTauri()) {
      ;(async () => {
        try {
          const res = await fetch(`/api/model-report?year=${encodeURIComponent(year)}`)
          if (!res.ok) throw new Error(`model report ${res.status}`)
          const env: ModelReportEnvelope = await res.json()
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
        const env = await invoke<ModelReportEnvelope>('get_model_report', { year })
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
