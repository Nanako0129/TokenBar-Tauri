import React from 'react'

// The set of analysis lenses, echoing tokscale's TUI tabs. The active client
// tab (Overview/Claude/Codex…) filters *which* data; this switch picks *how*
// that data is broken down. The two compose.
export type AppView = 'overview' | 'models' | 'daily' | 'hourly' | 'stats' | 'agents'

interface ViewDef {
  id: AppView
  label: string
}

const VIEWS: ViewDef[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'models', label: 'Models' },
  { id: 'daily', label: 'Daily' },
  { id: 'hourly', label: 'Hourly' },
  { id: 'stats', label: 'Stats' },
  { id: 'agents', label: 'Agents' },
]

interface Props {
  active: AppView
  onChange: (view: AppView) => void
}

export function ViewSwitch({ active, onChange }: Props) {
  return (
    <div className="view-switch" role="tablist" aria-label="Dashboard view">
      {VIEWS.map(v => (
        <button
          key={v.id}
          type="button"
          role="tab"
          aria-selected={active === v.id}
          className={`view-switch-btn${active === v.id ? ' is-active' : ''}`}
          onClick={() => onChange(v.id)}
        >
          {v.label}
        </button>
      ))}
    </div>
  )
}
