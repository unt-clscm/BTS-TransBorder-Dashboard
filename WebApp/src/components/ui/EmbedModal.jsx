import { useState, useCallback } from 'react'
import { X, Copy, Check, Code, Image } from 'lucide-react'

export default function EmbedModal({ isOpen, onClose, chartTitle, embedId, pageId }) {
  const [tab, setTab] = useState('iframe') // 'iframe' or 'svg'
  const [copied, setCopied] = useState(false)

  const baseUrl = window.location.origin + window.location.pathname
  const iframeUrl = `${baseUrl}#/embed/${pageId}/${embedId}`
  const iframeCode = `<iframe src="${iframeUrl}" width="100%" height="500" frameborder="0" title="${chartTitle}"></iframe>`

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(tab === 'iframe' ? iframeCode : 'SVG export coming soon')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* fallback */ }
  }, [tab, iframeCode])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">Embed: {chartTitle}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
        </div>

        {/* Tab buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('iframe')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${tab === 'iframe' ? 'bg-brand-blue text-white' : 'bg-gray-100 text-text-secondary hover:bg-gray-200'}`}
          >
            <Code size={14} /> Iframe
          </button>
          <button
            onClick={() => setTab('svg')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${tab === 'svg' ? 'bg-brand-blue text-white' : 'bg-gray-100 text-text-secondary hover:bg-gray-200'}`}
          >
            <Image size={14} /> SVG
          </button>
        </div>

        {/* Code display */}
        <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm text-text-secondary break-all max-h-40 overflow-y-auto">
          {tab === 'iframe' ? iframeCode : 'SVG export will be available after charts are rendered.'}
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors text-sm font-medium"
        >
          {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy to clipboard</>}
        </button>
      </div>
    </div>
  )
}
