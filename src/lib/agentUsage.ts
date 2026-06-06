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
}
