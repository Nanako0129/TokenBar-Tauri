// A self-drawn overlay scrollbar.
//
// WKWebView won't reliably repaint `::-webkit-scrollbar` pseudo-elements when
// their style changes — the thumb only re-renders while the cursor is over the
// bar, so a CSS auto-hide freezes in its last state once the pointer leaves.
// Instead we hide the native bar (via the `.ovs` class) and render our own
// thumb element, which is an ordinary DOM node that repaints normally: it fades
// in while scrolling and out a beat later.
//
// The thumb is absolutely positioned inside the scroller. Absolutely-positioned
// descendants of a scroll container scroll with its content, so we add
// `scrollTop` to the thumb's top to keep it visually pinned to the right edge.

const HIDE_DELAY = 900
const MIN_THUMB = 24
const PAD = 4

export function attachOverlayScrollbar(el: HTMLElement): () => void {
  if (getComputedStyle(el).position === 'static') {
    el.style.position = 'relative'
  }
  // Hide the native bar via inline style, not only the `.ovs` class: React
  // rewrites className on some scrollers (e.g. .model-rows toggling
  // `is-expanded`), which would strip the class and let the native bar return
  // alongside our thumb — two scrollbars. Inline style survives those updates.
  el.style.setProperty('scrollbar-width', 'none')
  el.classList.add('ovs')

  const thumb = document.createElement('div')
  thumb.className = 'ovs-thumb'
  el.appendChild(thumb)

  let hideTimer: number | undefined
  let raf = 0

  const layout = () => {
    // Re-attach if a React re-render of the scroller stripped our node.
    if (!thumb.isConnected) el.appendChild(thumb)
    const { scrollTop, scrollHeight, clientHeight } = el
    if (scrollHeight <= clientHeight + 1) {
      thumb.classList.remove('show')
      return false
    }
    const track = clientHeight - PAD * 2
    const h = Math.max(MIN_THUMB, (clientHeight / scrollHeight) * track)
    const ratio = scrollTop / (scrollHeight - clientHeight)
    const top = scrollTop + PAD + ratio * (track - h)
    thumb.style.height = `${h}px`
    thumb.style.top = `${top}px`
    return true
  }

  const onScroll = () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      if (layout()) {
        thumb.classList.add('show')
        window.clearTimeout(hideTimer)
        hideTimer = window.setTimeout(() => thumb.classList.remove('show'), HIDE_DELAY)
      }
    })
  }

  el.addEventListener('scroll', onScroll, { passive: true })
  const ro = new ResizeObserver(() => layout())
  ro.observe(el)
  layout()

  return () => {
    el.removeEventListener('scroll', onScroll)
    ro.disconnect()
    window.clearTimeout(hideTimer)
    cancelAnimationFrame(raf)
    thumb.remove()
    el.classList.remove('ovs')
    el.style.removeProperty('scrollbar-width')
  }
}
