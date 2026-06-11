import React, { useState } from 'react'

// One-time promo for the native 1.0 release. Dismiss persists. The new
// dismiss key (v2) re-shows the banner once for the final-build announcement
// even if the earlier beta promo was dismissed.
const DISMISS_KEY = 'tokenbar:promo:native-1.0:v2'
const BREW_CMD = 'brew install --cask nanako0129/tokenbar/tokenbar'

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
        <strong>TokenBar 1.0 is here</strong> — fully rewritten as a native Mac
        app with Liquid Glass, a 3D usage graph, lighter &amp; faster. This is
        the final build of the original; move over and keep your history.
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
