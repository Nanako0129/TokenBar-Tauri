import React, { useEffect, useRef } from 'react'
import { clientInitial, getClientStyle } from '../lib/clients'

interface Props {
  clients: string[]
  active: string
  onChange: (tab: string) => void
  kbdHints?: boolean
}

function ClientMark({ id }: { id: string }) {
  const style = getClientStyle(id)
  if (style.iconRaw) {
    return (
      <span
        className={`dash-tab-icon dash-tab-icon-${style.iconType}`}
        style={style.iconType === 'mono' ? { background: style.color } : undefined}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: style.iconRaw }}
      />
    )
  }
  return (
    <span className="dash-tab-icon" style={{ background: style.color }} aria-hidden="true">
      {clientInitial(style.displayName)}
    </span>
  )
}

export function DashboardTabs({ clients, active, onChange, kbdHints }: Props) {
  // ⌘1 = Overview, ⌘2… = clients, matching the keyboard handler in App. Only
  // the first nine tabs get a hint since ⌘0 is unbound.
  const hint = (idx: number) => (kbdHints && idx < 9 ? `⌘${idx + 1}` : null)
  // Keep the active tab in view when the row scrolls horizontally (e.g. keyboard
  // / arrow navigation can land on a tab that's off-screen).
  const activeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [active])
  return (
    <div className="dash-tabs" role="tablist" aria-label="Dashboard sections">
      <button
        type="button"
        ref={active === 'overview' ? activeRef : undefined}
        className={`dash-tab${active === 'overview' ? ' is-active' : ''}`}
        onClick={() => onChange('overview')}
        role="tab"
        aria-selected={active === 'overview'}
      >
        <span>Overview</span>
        {hint(0) && <span className="kbd-pin" aria-hidden="true">{hint(0)}</span>}
      </button>
      {clients.map((id, i) => {
        const style = getClientStyle(id)
        const isActive = active === id
        const h = hint(i + 1)
        return (
          <button
            key={id}
            type="button"
            ref={isActive ? activeRef : undefined}
            className={`dash-tab${isActive ? ' is-active' : ''}`}
            onClick={() => onChange(id)}
            role="tab"
            aria-selected={isActive}
          >
            <ClientMark id={id} />
            <span>{style.displayName.replace(/\s+(CLI|Code|IDE)$/i, '')}</span>
            {h && <span className="kbd-pin" aria-hidden="true">{h}</span>}
          </button>
        )
      })}
    </div>
  )
}
