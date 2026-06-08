// Usage pace — ported from codexbar's UsagePace (Sources/CodexBarCore/UsagePace.swift).
//
// Given a rate-limit window's length and reset time, work out how much you'd be
// *expected* to have used if you paced evenly, compare it to actual usage, and
// classify the gap. Positive delta = ahead of pace ("in deficit", burning fast);
// negative = behind pace ("in reserve"). Also projects when the window empties
// at the current burn rate.

import type { UsageWindow } from './agentUsage'
import type { PaceMode } from './settings'

export type PaceStage =
  | 'onTrack'
  | 'slightlyAhead'
  | 'ahead'
  | 'farAhead'
  | 'slightlyBehind'
  | 'behind'
  | 'farBehind'

export interface UsagePace {
  stage: PaceStage
  /** actual − expected, in percentage points (>0 = ahead/deficit). */
  deltaPercent: number
  expectedUsedPercent: number
  actualUsedPercent: number
  /** Seconds until the window empties at the current rate, if before reset. */
  etaSeconds: number | null
  /** True if the current rate lasts past the reset (won't run out). */
  willLastToReset: boolean
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function stageFor(delta: number): PaceStage {
  const a = Math.abs(delta)
  if (a <= 2) return 'onTrack'
  if (a <= 6) return delta >= 0 ? 'slightlyAhead' : 'slightlyBehind'
  if (a <= 12) return delta >= 0 ? 'ahead' : 'behind'
  return delta >= 0 ? 'farAhead' : 'farBehind'
}

export function isDeficit(stage: PaceStage): boolean {
  return stage === 'slightlyAhead' || stage === 'ahead' || stage === 'farAhead'
}

/** Compute *linear* pace for a window, or null if it can't be derived yet. */
export function computePace(window: UsageWindow, now: number = Date.now()): UsagePace | null {
  return computePaceCore(window, now, null)
}

/**
 * Compute pace under the user's chosen mode:
 * - `off`        → null (no pace marker).
 * - `historical` → use the backend's historical expected-percent if present,
 *                  otherwise transparently fall back to linear.
 * - `linear`     → naive elapsed/duration pace.
 */
export function computePaceFor(
  window: UsageWindow,
  mode: PaceMode,
  now: number = Date.now(),
): UsagePace | null {
  if (mode === 'off') return null
  const override =
    mode === 'historical' && typeof window.historicalExpectedPercent === 'number'
      ? clamp(window.historicalExpectedPercent, 0, 100)
      : null
  const pace = computePaceCore(window, now, override)
  // In historical mode the run-out *probability* (share of past weeks that hit
  // the cap) is a better lasts/empty signal than the naive linear burn rate —
  // otherwise the card could read "in reserve · Projected empty" at once. If
  // most past weeks lasted, project "Lasts until reset"; codexbar does the same.
  if (pace && override !== null && typeof window.runOutProbability === 'number') {
    const lasts = window.runOutProbability < 0.5
    return { ...pace, willLastToReset: lasts, etaSeconds: lasts ? null : pace.etaSeconds }
  }
  return pace
}

function computePaceCore(
  window: UsageWindow,
  now: number,
  expectedOverride: number | null,
): UsagePace | null {
  if (!window.resetsAt || !window.windowMinutes || window.windowMinutes <= 0) return null
  const resetsAt = Date.parse(window.resetsAt)
  if (Number.isNaN(resetsAt)) return null

  const duration = window.windowMinutes * 60 * 1000
  const timeUntilReset = resetsAt - now
  if (timeUntilReset <= 0 || timeUntilReset > duration) return null

  const elapsed = clamp(duration - timeUntilReset, 0, duration)
  // Expected used-percent: historical override when available, else the naive
  // linear elapsed/duration. The rest (delta/stage/ETA) is identical either way.
  const expected = expectedOverride ?? clamp((elapsed / duration) * 100, 0, 100)
  const actual = clamp(window.usedPercent, 0, 100)
  if (elapsed === 0 && actual > 0) return null

  const delta = actual - expected

  let etaSeconds: number | null = null
  let willLastToReset = false
  if (elapsed > 0 && actual > 0) {
    const rate = actual / elapsed // %% per ms
    if (rate > 0) {
      const remaining = Math.max(0, 100 - actual)
      const candidateMs = remaining / rate
      if (candidateMs >= timeUntilReset) willLastToReset = true
      else etaSeconds = candidateMs / 1000
    }
  } else if (elapsed > 0 && actual === 0) {
    willLastToReset = true
  }

  return {
    stage: stageFor(delta),
    deltaPercent: delta,
    expectedUsedPercent: expected,
    actualUsedPercent: actual,
    etaSeconds,
    willLastToReset,
  }
}

/** Short left-hand label: "On pace" / "12% in deficit" / "8% in reserve". */
export function paceLabel(pace: UsagePace): string {
  const d = Math.round(Math.abs(pace.deltaPercent))
  if (pace.stage === 'onTrack') return 'On pace'
  return isDeficit(pace.stage) ? `${d}% in deficit` : `${d}% in reserve`
}

function durationText(seconds: number): string {
  const m = Math.round(seconds / 60)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  if (h < 24) return rem ? `${h}h ${rem}m` : `${h}h`
  const days = Math.floor(h / 24)
  const hr = h % 24
  return hr ? `${days}d ${hr}h` : `${days}d`
}

/** Right-hand projection: "Lasts until reset" / "Projected empty in 2h 10m". */
export function paceEta(pace: UsagePace): string | null {
  if (pace.willLastToReset) return 'Lasts until reset'
  if (pace.etaSeconds == null) return null
  const t = durationText(pace.etaSeconds)
  return t === 'now' ? 'Projected empty now' : `Projected empty in ${t}`
}

/** codexbar-style historical run-out risk, e.g. "≈ 30% run-out risk", or null. */
export function runOutRiskLabel(window: UsageWindow): string | null {
  if (typeof window.runOutProbability !== 'number') return null
  const pct = Math.round(clamp(window.runOutProbability, 0, 1) * 100)
  if (pct <= 0) return null
  return `≈ ${pct}% run-out risk`
}
