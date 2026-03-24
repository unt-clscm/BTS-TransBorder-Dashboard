/**
 * ── StateMap.jsx ──────────────────────────────────────────────────────────
 * Leaflet map showing U.S. states as circle markers sized by trade value.
 * Similar to PortMap but positioned at state centroids for state-level data.
 *
 * Props:
 *   states            — Array of { name, lat, lng, value }
 *   formatValue       — Formatter function (default formatCurrency)
 *   metricLabel       — String for legend (default "Trade Value")
 *   center            — [lat, lng] (default [39.5, -98.0] — center of US)
 *   zoom              — Number (default 4)
 *   height            — CSS height string (default "500px")
 */
import { useMemo, useCallback, useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

import {
  ScrollWheelGuard,
  MapResizeHandler,
  ResetZoomButton,
  TooltipSync,
  formatCurrencyDefault,
} from './mapHelpers'

const FILL = '#0e7c6b'
const STROKE = '#065f52'

function radiusScale(value, maxValue) {
  if (!maxValue || !value) return 5
  return Math.max(5, Math.min(28, 5 + 23 * Math.sqrt(value / maxValue)))
}

export default function StateMap({
  states = [],
  formatValue = formatCurrencyDefault,
  metricLabel = 'Trade Value',
  center = [39.5, -98.0],
  zoom = 4,
  height = '500px',
}) {
  const mapInstanceRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)
  const [mapActive, setMapActive] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const hintTimer = useRef(null)

  const maxValue = useMemo(
    () => Math.max(1, ...states.map((s) => s.value || 0)),
    [states],
  )

  const handleWheel = useCallback(() => {
    if (!mapActive) {
      setShowHint(true)
      clearTimeout(hintTimer.current)
      hintTimer.current = setTimeout(() => setShowHint(false), 1500)
    }
  }, [mapActive])

  useEffect(() => () => clearTimeout(hintTimer.current), [])

  return (
    <>
      <div
        style={{ minHeight: height, width: '100%' }}
        className="port-map-container h-full flex flex-col rounded-lg overflow-hidden border border-border-light isolate"
        role="region"
        aria-label={`State map showing ${metricLabel}`}
      >
        <div className="flex-1 relative" style={{ minHeight: 0 }} onWheel={handleWheel}>
          {showHint && (
            <div
              style={{
                position: 'absolute', inset: 0, zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.25)', pointerEvents: 'none',
                transition: 'opacity 0.3s',
              }}
            >
              <span
                style={{
                  background: 'rgba(0,0,0,0.7)', color: '#fff',
                  padding: '8px 16px', borderRadius: 6, fontSize: 16,
                }}
              >
                Click the map to enable zooming
              </span>
            </div>
          )}

          <MapContainer
            center={center}
            zoom={zoom}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            scrollWheelZoom={false}
            zoomControl
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ScrollWheelGuard onActiveChange={setMapActive} />
            <ResetZoomButton center={center} zoom={zoom} />
            <MapResizeHandler />
            <TooltipSync mapRef={mapInstanceRef} tooltip={tooltip} setTooltip={setTooltip} />

            {states
              .filter((s) => s.lat != null && s.lng != null)
              .map((s) => {
                const r = radiusScale(s.value, maxValue)
                return (
                  <CircleMarker
                    key={s.name}
                    center={[s.lat, s.lng]}
                    radius={r}
                    bubblingMouseEvents={false}
                    pathOptions={{
                      fillColor: FILL,
                      color: STROKE,
                      weight: 1.5,
                      opacity: 0.9,
                      fillOpacity: 0.75,
                    }}
                    eventHandlers={{
                      mouseover: () => {
                        const map = mapInstanceRef.current
                        if (!map) return
                        const pt = map.latLngToContainerPoint([s.lat, s.lng])
                        const rect = map.getContainer().getBoundingClientRect()
                        setTooltip({
                          content: (
                            <>
                              <strong>{s.name}</strong>
                              <br />
                              {formatValue(s.value)} {metricLabel}
                            </>
                          ),
                          x: rect.left + pt.x,
                          y: rect.top + pt.y - r - 8,
                          latLng: [s.lat, s.lng],
                          offsetY: -r - 8,
                        })
                      },
                      mouseout: () => setTooltip(null),
                    }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <strong>{s.name}</strong>
                        <br />
                        {formatValue(s.value)} {metricLabel}
                      </div>
                    </Popup>
                  </CircleMarker>
                )
              })}
          </MapContainer>
        </div>

        {/* Legend */}
        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 bg-white/90 text-base text-text-secondary border-t border-border-light flex-shrink-0"
          style={{ height: 'auto' }}
        >
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: FILL }} />
            U.S. State
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="24" height="16" aria-hidden="true" className="flex-shrink-0">
              <circle cx="7" cy="11" r="3" fill="#999" opacity="0.5" />
              <circle cx="17" cy="8" r="6" fill="#999" opacity="0.5" />
            </svg>
            Size = {metricLabel}
          </span>
        </div>
      </div>

      {/* Portal tooltip */}
      {tooltip &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              left: tooltip.x,
              top: tooltip.y,
              transform: 'translate(-50%, -100%)',
              zIndex: 10000,
              pointerEvents: 'none',
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 13,
              lineHeight: 1.4,
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
            }}
          >
            {tooltip.content}
          </div>,
          document.body,
        )}
    </>
  )
}
