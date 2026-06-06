import claudeIcon from '../assets/agent-icons/claude.svg?raw'
import geminiIcon from '../assets/agent-icons/gemini.svg?raw'
import copilotIcon from '../assets/agent-icons/copilot.svg?raw'
import cursorIcon from '../assets/agent-icons/cursor.svg?raw'
import qwenIcon from '../assets/agent-icons/qwen.svg?raw'
import ampIcon from '../assets/agent-icons/amp.svg?raw'
import piIcon from '../assets/agent-icons/pi.svg?raw'
import codexIcon from '../assets/agent-icons/codex.svg?raw'
import opencodeIcon from '../assets/agent-icons/opencode.svg?raw'
import droidIcon from '../assets/agent-icons/droid.svg?raw'
import kilocodeIcon from '../assets/agent-icons/kilocode.svg?raw'
import syntheticIcon from '../assets/agent-icons/synthetic.svg?raw'
import warpIcon from '../assets/agent-icons/warp.svg?raw'
import kimiIcon from '../assets/agent-icons/kimi.svg?raw'
import kiroIcon from '../assets/agent-icons/kiro.svg?raw'
import codebuffIcon from '../assets/agent-icons/codebuff.svg?raw'
import antigravityIcon from '../assets/agent-icons/antigravity.svg?raw'
import kiloIcon from '../assets/agent-icons/kilo.svg?raw'

// 'mono' icons are single-color glyphs we tint white over the brand-color disc.
// 'full' icons carry their own design (background + colors) and fill the disc as-is.
export type IconType = 'mono' | 'full'

export interface ClientStyle {
  id: string
  displayName: string
  color: string // logo disc color
  iconRaw?: string
  iconType?: IconType
}

interface RegistryEntry {
  displayName: string
  color: string
  iconRaw?: string
  iconType?: IconType
}

const REGISTRY: Record<string, RegistryEntry> = {
  claude: { displayName: 'Claude Code', color: '#d97706', iconRaw: claudeIcon, iconType: 'mono' },
  openclaw: { displayName: 'OpenClaw', color: '#dc2626' },
  gemini: { displayName: 'Gemini CLI', color: '#60a5fa', iconRaw: geminiIcon, iconType: 'mono' },
  opencode: { displayName: 'OpenCode', color: '#1f2937', iconRaw: opencodeIcon, iconType: 'mono' },
  codex: { displayName: 'Codex CLI', color: '#9ca3af', iconRaw: codexIcon, iconType: 'full' },
  copilot: { displayName: 'Copilot CLI', color: '#1f2937', iconRaw: copilotIcon, iconType: 'mono' },
  cursor: { displayName: 'Cursor IDE', color: '#0ea5e9', iconRaw: cursorIcon, iconType: 'mono' },
  amp: { displayName: 'Amp', color: '#10b981', iconRaw: ampIcon, iconType: 'mono' },
  droid: { displayName: 'Droid', color: '#22c55e', iconRaw: droidIcon, iconType: 'full' },
  hermes: { displayName: 'Hermes', color: '#a78bfa' },
  pi: { displayName: 'Pi', color: '#f472b6', iconRaw: piIcon, iconType: 'mono' },
  kimi: { displayName: 'Kimi CLI', color: '#fbbf24', iconRaw: kimiIcon, iconType: 'mono' },
  qwen: { displayName: 'Qwen CLI', color: '#7c3aed', iconRaw: qwenIcon, iconType: 'mono' },
  roocode: { displayName: 'Roo Code', color: '#ef4444' },
  kilocode: { displayName: 'KiloCode', color: '#f97316', iconRaw: kilocodeIcon, iconType: 'full' },
  kilo: { displayName: 'Kilo CLI', color: '#f59e0b', iconRaw: kiloIcon, iconType: 'full' },
  mux: { displayName: 'Mux', color: '#06b6d4' },
  crush: { displayName: 'Crush', color: '#ec4899' },
  synthetic: { displayName: 'Synthetic', color: '#64748b', iconRaw: syntheticIcon, iconType: 'full' },
  // Agents that tokscale-core parses but TokenBar had no display style for yet.
  // No bundled SVG, so getClientStyle's title-case + brand-color disc fallback
  // renders them until proper icons land.
  goose: { displayName: 'Goose', color: '#14b8a6' },
  codebuff: { displayName: 'Codebuff', color: '#8b5cf6', iconRaw: codebuffIcon, iconType: 'full' },
  antigravity: { displayName: 'Antigravity', color: '#3b82f6', iconRaw: antigravityIcon, iconType: 'full' },
  zed: { displayName: 'Zed', color: '#084fff' },
  kiro: { displayName: 'Kiro', color: '#9046ff', iconRaw: kiroIcon, iconType: 'full' },
  trae: { displayName: 'Trae', color: '#ef4444' },
  warp: { displayName: 'Warp', color: '#01a4ff', iconRaw: warpIcon, iconType: 'mono' },
}

export function getClientStyle(id: string): ClientStyle {
  const entry = REGISTRY[id]
  if (entry) {
    return {
      id,
      displayName: entry.displayName,
      color: entry.color,
      iconRaw: entry.iconRaw,
      iconType: entry.iconType,
    }
  }
  // Fallback: title-case the id, neutral grey disc
  const displayName = id.charAt(0).toUpperCase() + id.slice(1)
  return { id, displayName, color: '#6b7280' }
}

export function clientInitial(displayName: string): string {
  return displayName.charAt(0).toUpperCase()
}
