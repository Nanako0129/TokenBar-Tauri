import React, { useState } from 'react'

// One-time promo for the native rewrite beta. Dismiss persists; the banner
// retires entirely when the stable native 1.0.0 ships (Phase 10).
const DISMISS_KEY = 'tokenbar:promo:native-beta:v1'
const BREW_CMD = 'brew install nanako0129/tokenbar/tokenbar@beta'

export function PromoBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })
  const [copied, setCopied] = useState(false)
  if (dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {}
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(BREW_CMD)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="promo-banner" role="note">
      <div className="promo-text">
        <strong>TokenBar 2.0 beta is here</strong> — native rewrite with Liquid
        Glass, a 3D usage graph, lighter &amp; faster. Installs alongside this
        version.
      </div>
      <div className="promo-actions">
        <button type="button" className="promo-copy" onClick={copy} title={BREW_CMD}>
          {copied ? 'Copied!' : 'Copy install command'}
        </button>
        <button type="button" className="promo-close" onClick={dismiss} aria-label="Dismiss">
          ×
        </button>
      </div>
    </div>
  )
}
