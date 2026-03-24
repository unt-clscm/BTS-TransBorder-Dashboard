/**
 * ── PortMap.jsx ───────────────────────────────────────────────────────────
 * Leaflet map showing port-of-entry markers sized by trade value,
 * with optional trade flow arcs to Mexican crossing points.
 *
 * Props:
 *   ports             — Array of { name, lat, lng, value, portCode }
 *   mexicanCrossings  — Object mapping port name to { name, lat, lon }
 *   formatValue       — Formatter function (default formatCurrency)
 *   metricLabel       — String for legend (default "Trade Value")
 *   showFlowArcs      — Boolean (default true)
 *   center            — [lat, lng] (default [29.0, -100.0])
 *   zoom              — Number (default 6)
 *   height            — CSS height string (default "500px")
 *   topN              — Limit to top N ports by value for arcs (default 15)
 */
import { useMemo, useCallback, useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet'
// leaflet CSS imported above via react-leaflet
import 'leaflet/dist/leaflet.css'

const COLORS = {
  usPort: '#0056a9',
  mxCrossing: '#df5c16',
  arc: '#0056a9',
}

const STROKE = {
  usPort: '#003d75',
  mxCrossing: '#a84410',
}

function formatCurrencyDefault(value) {
  if (value == null) return '$0'
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`
  return `$${value.toLocaleString()}`
}

function radiusScale(value, maxValue) {
  if (!maxValue || !value) return 4
  return Math.max(4, Math.min(20, 4 + 16 * Math.sqrt(value / maxValue)))
}

function arcWeightScale(value, maxValue) {
  if (!maxValue || !value) return 1.5
  return Math.max(1.5, Math.min(6, 1.5 + 4.5 * (value / maxValue)))
}

/** Disables scroll-wheel zoom until the user clicks on the map */
function ScrollWheelGuard({ onActiveChange }) {
  const map = useMap()
  useMapEvents({
    click: () => {
      map.scrollWheelZoom.enable()
      onActiveChange?.(true)
    },
    mouseout: () => {
      map.scrollWheelZoom.disable()
      onActiveChange?.(false)
    },
  })
  return null
}

/** Invalidates Leaflet map size when container dimensions change */
function MapResizeHandler() {
  const map = useMap()
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 100)
    const observer = new ResizeObserver(() => map.invalidateSize())
    const container = map.getContainer()
    if (container.parentElement) {
      observer.observe(container.parentElement)
    }
    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [map])
  return null
}

function ResetZoomButton({ center, zoom }) {
  const map = useMap()
  const handleClick = useCallback((e) => {
    e.stopPropagation()
    map.setView(center, zoom)
  }, [map, center, zoom])

  return (
    <div className="leaflet-top leaflet-left" style={{ pointerEvents: 'auto' }}>
      <div className="leaflet-control" style={{ marginTop: 80, marginLeft: 10 }}>
        <button
          onClick={handleClick}
          title="Reset zoom"
          style={{
            background: '#fff',
            border: '2px solid rgba(0,0,0,0.2)',
            borderRadius: 4,
            width: 34,
            height: 34,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            lineHeight: 1,
            color: '#333',
          }}
        >
          &#8962;
        </button>
      </div>
    </div>
  )
}

/**
 * Renders a curved SVG arc (quadratic Bezier) between two lat/lng points on the map.
 * The control point is offset perpendicular to the midpoint for a visible curve.
 */
function CurvedArc({ from, to, weight, color, opacity, onMouseOver, onMouseMove, onMouseOut, children: _children }) {
  const map = useMap()
  const [path, setPath] = useState('')
  const pathRef = useRef(null)

  useEffect(() => {
    const update = () => {
      const p1 = map.latLngToLayerPoint(from)
      const p2 = map.latLngToLayerPoint(to)
      // Perpendicular offset for the control point
      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const offset = Math.max(20, dist * 0.3)
      // Rotate 90 degrees to get perpendicular direction
      const mx = (p1.x + p2.x) / 2 + (-dy / dist) * offset
      const my = (p1.y + p2.y) / 2 + (dx / dist) * offset
      setPath(`M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`)
    }
    update()
    map.on('move zoom viewreset', update)
    return () => map.off('move zoom viewreset', update)
  }, [map, from, to])

  if (!path) return null

  const pane = map.getPane('overlayPane')
  if (!pane) return null

  return createPortal(
    <svg
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}
      width="0" height="0"
    >
      {/* Invisible wide hit area for hover */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(12, weight + 8)}
        style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
        onMouseOver={onMouseOver}
        onMouseMove={onMouseMove}
        onMouseOut={onMouseOut}
      />
      {/* Visible arc */}
      <path
        ref={pathRef}
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={weight}
        strokeOpacity={opacity}
        strokeDasharray="6 4"
        strokeLinecap="round"
        style={{ pointerEvents: 'none' }}
      />
    </svg>,
    pane,
  )
}

/** Captures map instance ref & repositions portal tooltips on map move/zoom */
function TooltipSync({ mapRef, tooltip, setTooltip }) {
  const map = useMap()
  useEffect(() => { mapRef.current = map }, [map, mapRef])
  useEffect(() => {
    if (!tooltip?.latLng) return
    const update = () => {
      const pt = map.latLngToContainerPoint(tooltip.latLng)
      const rect = map.getContainer().getBoundingClientRect()
      setTooltip((prev) =>
        prev?.latLng
          ? { ...prev, x: rect.left + pt.x, y: rect.top + pt.y + (prev.offsetY || 0) }
          : null,
      )
    }
    map.on('move zoom', update)
    return () => map.off('move zoom', update)
  }, [map, tooltip?.latLng, tooltip?.offsetY, setTooltip])
  return null
}

export default function PortMap({
  ports = [],
  mexicanCrossings = {},
  formatValue = formatCurrencyDefault,
  metricLabel = 'Trade Value',
  showFlowArcs = true,
  center = [29.0, -100.0],
  zoom = 6,
  height = '500px',
  topN = 15,
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

  // Build arcs between US ports and their Mexican crossing counterparts
  const arcs = useMemo(() => {
    if (!showFlowArcs) return []
    const sorted = [...ports].sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, topN)
    return sorted
      .filter((p) => mexicanCrossings[p.name])
      .map((p) => {
        const mx = mexicanCrossings[p.name]
        return {
          usPort: p,
          mxCrossing: mx,
          positions: [
            [p.lat, p.lng],
            [mx.lat, mx.lon],
          ],
          weight: arcWeightScale(p.value, maxValue),
        }
      })
  }, [ports, mexicanCrossings, showFlowArcs, topN, maxValue])

  // Collect Mexican crossing markers (deduplicated)
  const mxMarkers = useMemo(() => {
    if (!showFlowArcs) return []
    const seen = new Set()
    return arcs
      .filter((a) => {
        const key = a.mxCrossing.name
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map((a) => a.mxCrossing)
  }, [arcs, showFlowArcs])

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

            {/* Trade flow arcs (curved Bezier) */}
            {arcs.map((arc, i) => (
              <CurvedArc
                key={`arc-${arc.usPort.portCode}-${i}`}
                from={arc.positions[0]}
                to={arc.positions[1]}
                weight={arc.weight}
                color={COLORS.arc}
                opacity={0.4}
                onMouseOver={(e) => {
                  setTooltip({
                    content: (
                      <>
                        <strong>{arc.usPort.name}</strong> &#8596; <strong>{arc.mxCrossing.name}</strong>
                        <br />
                        {formatValue(arc.usPort.value)} {metricLabel}
                      </>
                    ),
                    x: e.clientX + 12,
                    y: e.clientY - 12,
                    sticky: true,
                  })
                }}
                onMouseMove={(e) => {
                  setTooltip((prev) => prev ? { ...prev, x: e.clientX + 12, y: e.clientY - 12 } : null)
                }}
                onMouseOut={() => setTooltip(null)}
              />
            ))}

            {/* Mexican crossing markers (orange) */}
            {mxMarkers.map((mx) => (
              <CircleMarker
                key={`mx-${mx.name}`}
                center={[mx.lat, mx.lon]}
                radius={6}
                bubblingMouseEvents={false}
                pathOptions={{
                  fillColor: COLORS.mxCrossing,
                  color: STROKE.mxCrossing,
                  weight: 1.5,
                  opacity: 0.9,
                  fillOpacity: 0.85,
                }}
                eventHandlers={{
                  mouseover: () => {
                    const map = mapInstanceRef.current
                    if (!map) return
                    const pt = map.latLngToContainerPoint([mx.lat, mx.lon])
                    const rect = map.getContainer().getBoundingClientRect()
                    setTooltip({
                      content: <><strong>{mx.name}</strong> (Mexico)</>,
                      x: rect.left + pt.x,
                      y: rect.top + pt.y - 14,
                      latLng: [mx.lat, mx.lon],
                      offsetY: -14,
                    })
                  },
                  mouseout: () => setTooltip(null),
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>{mx.name}</strong>
                    <br />
                    Mexican crossing point
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* US port markers (blue, sized by value) */}
            {ports
              .filter((p) => p.lat != null && p.lng != null)
              .map((p) => {
                const r = radiusScale(p.value, maxValue)
                return (
                  <CircleMarker
                    key={`us-${p.portCode}`}
                    center={[p.lat, p.lng]}
                    radius={r}
                    bubblingMouseEvents={false}
                    pathOptions={{
                      fillColor: COLORS.usPort,
                      color: STROKE.usPort,
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
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: COLORS.usPort }} />
            U.S. Port
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: COLORS.mxCrossing }} />
            Mexican Crossing
          </span>
          {showFlowArcs && (
            <span className="flex items-center gap-1.5">
              <svg width="24" height="10" aria-hidden="true">
                <line x1="0" y1="5" x2="24" y2="5" stroke={COLORS.arc} strokeWidth="2" strokeDasharray="5 3" opacity="0.5" />
              </svg>
              Trade flow
            </span>
          )}
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
