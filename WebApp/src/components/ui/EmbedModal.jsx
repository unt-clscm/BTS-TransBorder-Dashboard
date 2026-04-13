import { useState, useCallback, useEffect, useRef } from 'react'
import { X, Copy, Check, Code, Image, Download } from 'lucide-react'

/**
 * Serializes a live SVG node into a self-contained SVG string with inlined styles.
 */
function serializeSvg(svgEl) {
  if (!svgEl) return null
  const clone = svgEl.cloneNode(true)
  const { width, height } = svgEl.getBoundingClientRect()
  if (!width || !height) return null

  clone.setAttribute('width', width)
  clone.setAttribute('height', height)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.querySelectorAll('.export-ignore').forEach((el) => el.remove())

  // Inline computed styles
  const PROPS = [
    'font', 'font-family', 'font-size', 'font-weight', 'font-style',
    'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap',
    'opacity', 'visibility', 'display', 'text-anchor', 'dominant-baseline',
    'letter-spacing', 'color',
  ]
  function inlineStyles(source, target) {
    const computed = window.getComputedStyle(source)
    for (const prop of PROPS) {
      const val = computed.getPropertyValue(prop)
      if (val) target.style.setProperty(prop, val)
    }
    for (let i = 0; i < source.children.length; i++) {
      if (target.children[i]) inlineStyles(source.children[i], target.children[i])
    }
  }
  inlineStyles(svgEl, clone)

  return new XMLSerializer().serializeToString(clone)
}

// All interactive elements that can receive focus
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export default function EmbedModal({ isOpen, onClose, chartTitle, embedId, pageId, chartContainerRef }) {
  const [tab, setTab] = useState('iframe')
  const [copied, setCopied] = useState(false)
  const [svgString, setSvgString] = useState(null)

  const dialogRef = useRef(null)
  const closeButtonRef = useRef(null)
  const previousFocusRef = useRef(null)

  const baseUrl = window.location.origin + window.location.pathname
  const iframeUrl = `${baseUrl}#/embed/${pageId}/${embedId}`
  const iframeCode = `<iframe src="${iframeUrl}" width="100%" height="500" frameborder="0" title="${chartTitle}"></iframe>`

  // On open: capture previous focus, move focus into dialog.
  // On close: return focus to the element that opened the modal.
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement
      requestAnimationFrame(() => {
        closeButtonRef.current?.focus()
      })
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus()
      previousFocusRef.current = null
    }
  }, [isOpen])

  // Focus trap + Escape key handler on the dialog container
  const handleDialogKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key !== 'Tab') return
    const dialog = dialogRef.current
    if (!dialog) return
    const focusable = Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR))
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }, [onClose])

  // Generate SVG string when user switches to SVG tab
  const handleTabSwitch = useCallback((newTab) => {
    setTab(newTab)
    setCopied(false)
    if (newTab === 'svg') {
      const container = chartContainerRef?.current
      const svg = container?.querySelector('svg')
      setSvgString(serializeSvg(svg))
    }
  }, [chartContainerRef])

  const handleCopy = useCallback(async () => {
    const text = tab === 'iframe' ? iframeCode : svgString
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* fallback */ }
  }, [tab, iframeCode, svgString])

  const handleDownloadSvg = useCallback(() => {
    if (!svgString) return
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.download = `${chartTitle?.replace(/[^a-zA-Z0-9]+/g, '-') || 'chart'}_${new Date().toISOString().slice(0, 10)}.svg`
    a.href = url
    a.click()
    URL.revokeObjectURL(url)
  }, [svgString, chartTitle])

  if (!isOpen) return null

  return (
    // Backdrop: clicking outside the dialog closes it; keyboard dismissal is via Escape in the dialog
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Dialog — focus trap + Escape handled via onKeyDown per WAI-ARIA dialog pattern */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Embed: ${chartTitle}`}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6 focus:outline-none"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">Embed: {chartTitle}</h3>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close"
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab buttons */}
        <div role="tablist" aria-label="Export format" className="flex gap-2 mb-4">
          <button
            role="tab"
            aria-selected={tab === 'iframe'}
            onClick={() => handleTabSwitch('iframe')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${tab === 'iframe' ? 'bg-brand-blue text-white' : 'bg-gray-100 text-text-secondary hover:bg-gray-200'}`}
          >
            <Code size={14} /> Iframe
          </button>
          <button
            role="tab"
            aria-selected={tab === 'svg'}
            onClick={() => handleTabSwitch('svg')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${tab === 'svg' ? 'bg-brand-blue text-white' : 'bg-gray-100 text-text-secondary hover:bg-gray-200'}`}
          >
            <Image size={14} /> SVG
          </button>
        </div>

        {/* Code display */}
        <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm text-text-secondary break-all max-h-40 overflow-y-auto">
          {tab === 'iframe'
            ? iframeCode
            : svgString
              ? svgString.slice(0, 500) + (svgString.length > 500 ? '...' : '')
              : 'No SVG chart found in this card.'}
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleCopy}
            disabled={tab === 'svg' && !svgString}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy to clipboard</>}
          </button>
          {tab === 'svg' && svgString && (
            <button
              onClick={handleDownloadSvg}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-text-primary rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              <Download size={14} /> Download .svg
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
