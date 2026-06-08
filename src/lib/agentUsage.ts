export interface AgentIdentity {
  email?: string
  plan?: string
}

export interface UsageWindow {
  label: string
  usedPercent: number
  remainingPercent: number
  resetsAt?: string
  resetText?: string
  /** Total window length in minutes; enables pace (expected vs actual). */
  windowMinutes?: number
  /** Expected used-percent now from *historical* weekly samples (Codex weekly
   *  only, once enough past weeks accrued). Absent → fall back to linear pace. */
  historicalExpectedPercent?: number
  /** 0..1 chance the window empties before reset at the historical burn rate. */
  runOutProbability?: number
}

export interface CreditsSnapshot {
  remaining?: number
  unlimited: boolean
}

export interface AgentUsageSnapshot {
  clientId: string
  source: string
  updatedAt: string
  identity?: AgentIdentity
  windows: UsageWindow[]
  credits?: CreditsSnapshot
  error?: string
}

export interface AgentUsagePayload {
  generatedAt: string
  agents: AgentUsageSnapshot[]
  /** Subscription-type providers opencode is authed against (e.g. ["Codex"]). */
  opencodeSubscriptions?: string[]
}
