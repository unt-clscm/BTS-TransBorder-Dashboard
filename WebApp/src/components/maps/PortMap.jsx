/**
 * ── PortMap.jsx ───────────────────────────────────────────────────────────
 * Leaflet map showing port-of-entry markers sized by trade value.
 *
 * Props:
 *   ports             — Array of { name, lat, lng, value, portCode }
 *   formatValue       — Formatter function (default formatCurrency)
 *   metricLabel       — String for legend (default "Trade Value")
 *   center            — [lat, lng] (default [29.0, -100.0])
 *   zoom              — Number (default 6)
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

const COLORS = {
  usPort: '#0056a9',
}

const STROKE = {
  usPort: '#003d75',
}

function radiusScale(value, maxValue) {
  if (!maxValue || !value) return 4
  return Math.max(4, Math.min(20, 4 + 16 * Math.sqrt(value / maxValue)))
}

export default function PortMap({
  ports = [],
  formatValue = formatCurrencyDefault,
  metricLabel = 'Trade Value',
  center = [29.0, -100.0],
  zoom = 6,
  height = '500px',
  groupColors = null,   // { groupName: { fill, stroke } } — color ports by p.group
  legendGroups = null,   // [{ label, color }] — custom legend entries (replaces default)
}) {
  const mapInstanceRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)
  const [mapActive, setMapActive] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const hintTimer = useRef(null)

  const maxValue = useMemo(
    () => Math.max(1, ...ports.map((p) => p.value || 0)),
    [ports],
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
        aria-label={`Port map showing ${metricLabel}`}
      >
        <div className="flex-1 relative" style={{ minHeight: 0 }} onWheel={handleWheel}>
          {/* Scroll hint overlay */}
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

            {/* Port markers (sized by value, colored by group if provided) */}
            {ports
              .filter((p) => p.lat != null && p.lng != null)
              .map((p) => {
                const r = radiusScale(p.value, maxValue)
                const gc = groupColors && p.group ? groupColors[p.group] : null
                const fillColor = gc?.fill || COLORS.usPort
                const strokeColor = gc?.stroke || STROKE.usPort
                return (
                  <CircleMarker
                    key={`us-${p.portCode}`}
                    center={[p.lat, p.lng]}
                    radius={r}
                    bubblingMouseEvents={false}
                    pathOptions={{
                      fillColor,
                      color: strokeColor,
                      weight: 1.5,
                      opacity: 0.9,
                      fillOpacity: 0.85,
                    }}
                    eventHandlers={{
                      mouseover: () => {
                        const map = mapInstanceRef.current
                        if (!map) return
                        const pt = map.latLngToContainerPoint([p.lat, p.lng])
                        const rect = map.getContainer().getBoundingClientRect()
                        setTooltip({
                          content: (
                            <>
                              <strong>{p.name}</strong> ({p.portCode})
                              <br />
                              {formatValue(p.value)} {metricLabel}
                            </>
                          ),
                          x: rect.left + pt.x,
                          y: rect.top + pt.y - r - 8,
                          latLng: [p.lat, p.lng],
                          offsetY: -r - 8,
                        })
                      },
                      mouseout: () => setTooltip(null),
                    }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <strong>{p.name}</strong>
                        <br />
                        {formatValue(p.value)} {metricLabel}
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
          {legendGroups
            ? legendGroups.map((g) => (
                <span key={g.label} className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ background: g.color }} />
                  {g.label}
                </span>
              ))
            : (
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full" style={{ background: COLORS.usPort }} />
                U.S. Port
              </span>
            )
          }
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
              transform: tooltip.sticky ? 'none' : 'translate(-50%, -100%)',
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
