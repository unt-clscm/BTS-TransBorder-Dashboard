/**
 * InteractiveFlowMap.jsx
 *
 * Combined choropleth + port bubble map with click-to-highlight connectivity.
 * Port bubbles render ABOVE state polygons via a custom Leaflet pane.
 *
 * Click a state  -> choropleth re-colors to show only connected ports' trade,
 *                   dims non-connected states, highlights connected ports.
 * Click a port   -> choropleth dynamically re-scales to show trade values
 *                   through that specific port, dims unconnected states.
 * Click empty space or click again -> resets to default view.
 *
 * Props:
 *   geojsonUrl    - URL to GeoJSON FeatureCollection
 *   stateData     - [{ name, value }] choropleth values (total trade)
 *   portData      - [{ name, lat, lng, value, portCode }] port markers
 *   connections   - { stateToPort: Map<state, Map<portCode, value>>,
 *                     portToState: Map<portCode, Map<state, value>> }
 *   formatValue, metricLabel, colorRange, emptyColor
 *   center, zoom, height, title
 */
import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, GeoJSON, CircleMarker } from 'react-leaflet'
import * as d3 from 'd3'
import 'leaflet/dist/leaflet.css'

import {
  ScrollWheelGuard,
  MapResizeHandler,
  ResetZoomButton,
  TooltipSync,
  formatCurrencyDefault,
} from './mapHelpers'
import {
  useGeoJSON,
  radiusScale as _radiusScaleBase,
  makeStateStyle,
  PortPane,
  MapClickReset,
  MapTooltip,
} from './mapShared'

/* Port bubble radius — local defaults: min=5, max=18, mult=13 */
const radiusScale = (value, maxValue) => _radiusScaleBase(value, maxValue, 5, 18, 13)

/* ── Selection info panel ────────────────────────────────────────────── */
function SelectionPanel({ selection, connections, portData, formatValue }) {
  if (!selection) return null

  let title, subtitle, items
  if (selection.type === 'state') {
    const connectedPorts = connections.stateToPort.get(selection.name) || new Map()
    title = selection.name
    subtitle = 'Ports'
    items = portData
      .filter((p) => connectedPorts.has(p.portCode))
      .map((p) => ({ name: p.name, value: connectedPorts.get(p.portCode) || 0 }))
      .sort((a, b) => b.value - a.value)
  } else {
    const connectedStates = connections.portToState.get(selection.id) || new Map()
    title = selection.name
    subtitle = 'States'
    items = Array.from(connectedStates, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }

  return (
    <div
      className="absolute top-3 right-3 z-[1000] bg-white/95 border border-border-light rounded-lg shadow-lg px-3 py-2 max-w-[220px] max-h-[280px] overflow-y-auto text-sm"
    >
      <div className="font-semibold text-text-primary mb-1 flex items-center justify-between">
        <span>{title}</span>
        <span className="text-xs text-text-secondary ml-2">{subtitle}</span>
      </div>
      {items.length === 0 && (
        <div className="text-text-secondary text-xs italic">No connections found</div>
      )}
      {items.map((item) => (
        <div key={item.name} className="flex justify-between gap-2 py-0.5">
          <span className="truncate">{item.name}</span>
          <span className="text-text-secondary whitespace-nowrap">{formatValue(item.value)}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Main component ─────────────────────────────────────────────────── */
export default function InteractiveFlowMap({
  geojsonUrl,
  stateData = [],
  portData = [],
  connections = { stateToPort: new Map(), portToState: new Map() },
  formatValue = formatCurrencyDefault,
  metricLabel = 'Trade Value',
  colorRange = ['#fee0d2', '#de2d26'],
  emptyColor = '#f0f0f0',
  center = [23.5, -102.0],
  zoom = 5,
  height = '520px',
  title = 'Mexican States',
}) {
  const mapInstanceRef = useRef(null)
  const geoJsonRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)
  const [mapActive, setMapActive] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const hintTimer = useRef(null)

  // selection: { type: 'state'|'port', name: string, id: string } | null
  const [selection, setSelection] = useState(null)

  const { geojson, loading } = useGeoJSON(geojsonUrl)

  /* ── Compute effective state values (dynamic when a port is selected) ── */
  const effectiveStateValues = useMemo(() => {
    if (selection?.type === 'port') {
      // Show trade values through the selected port only
      const portStates = connections.portToState.get(selection.id) || new Map()
      return Array.from(portStates, ([name, value]) => ({ name, value }))
    }
    // Default: show total trade values
    return stateData
  }, [selection, connections, stateData])

  const stateValueMap = useMemo(() => {
    const m = new Map()
    for (const d of effectiveStateValues) if (d.name && d.value != null) m.set(d.name, d.value)
    return m
  }, [effectiveStateValues])

  /* ── Compute effective port values (dynamic when a state is selected) ── */
  const effectivePortValues = useMemo(() => {
    if (selection?.type === 'state') {
      const statePorts = connections.stateToPort.get(selection.name) || new Map()
      return statePorts // Map<portCode, value>
    }
    return null // use default portData values
  }, [selection, connections])

  const portMax = useMemo(
    () => Math.max(1, ...portData.map((p) => p.value || 0)),
    [portData],
  )

  /* ── Color scale (re-computed dynamically based on effective values) ─── */
  const colorScale = useMemo(() => {
    const values = effectiveStateValues.map((d) => d.value).filter((v) => v != null && v > 0)
    if (!values.length) return () => emptyColor
    return d3.scaleSequential()
      .domain(d3.extent(values))
      .interpolator(d3.interpolateRgb(colorRange[0], colorRange[1]))
  }, [effectiveStateValues, colorRange, emptyColor])

  /* ── Derived: which states/ports are highlighted ──────────────────── */
  const { highlightedStates, highlightedPorts } = useMemo(() => {
    if (!selection) return { highlightedStates: null, highlightedPorts: null }

    if (selection.type === 'state') {
      const connectedPorts = connections.stateToPort.get(selection.name) || new Map()
      return {
        highlightedStates: new Set([selection.name]),
        highlightedPorts: new Set(connectedPorts.keys()),
      }
    } else {
      const connectedStates = connections.portToState.get(selection.id) || new Map()
      return {
        highlightedStates: new Set(connectedStates.keys()),
        highlightedPorts: new Set([selection.id]),
      }
    }
  }, [selection, connections])

  /* ── GeoJSON style (reactive to selection, dynamic color scale) ─────── */
  const style = useCallback((feature) => {
    const name = feature.properties?.name
    const value = stateValueMap.get(name)
    const fill = value != null && value > 0 ? colorScale(value) : emptyColor
    const isOrigin = selection?.type === 'state' && name === selection.name
    if (highlightedStates) {
      return makeStateStyle(name, fill, emptyColor, highlightedStates, isOrigin)
    }
    // Default (no selection)
    return { fillColor: fill, weight: 1, opacity: 0.8, color: '#666', fillOpacity: 0.75 }
  }, [stateValueMap, colorScale, emptyColor, highlightedStates, selection])

  /* ── GeoJSON interaction ───────────────────────────────────────────── */
  const onEachFeature = useCallback((feature, layer) => {
    const name = feature.properties?.name

    layer.on({
      mouseover: (e) => {
        const target = e.target
        const value = stateValueMap.get(name)
        if (!highlightedStates || highlightedStates.has(name)) {
          target.setStyle({ weight: 2.5, color: '#333', fillOpacity: 0.9 })
          target.bringToFront()
        }
        const map = mapInstanceRef.current
        if (!map) return
        const pt = map.latLngToContainerPoint(e.latlng)
        const rect = map.getContainer().getBoundingClientRect()
        const connCount = connections.stateToPort.get(name)?.size || 0
        setTooltip({
          content: (
            <>
              <strong>{name || 'Unknown'}</strong><br />
              {value != null ? `${formatValue(value)} ${metricLabel}` : 'No data'}
              {connCount > 0 && !selection && (
                <><br /><span style={{ fontSize: 11, color: '#666' }}>{connCount} connected port{connCount > 1 ? 's' : ''} — click to explore</span></>
              )}
            </>
          ),
          x: rect.left + pt.x,
          y: rect.top + pt.y - 12,
          latLng: [e.latlng.lat, e.latlng.lng],
          offsetY: -12,
        })
      },
      mouseout: (e) => {
        geoJsonRef.current?.resetStyle(e.target)
        setTooltip(null)
      },
      mousemove: (e) => {
        const map = mapInstanceRef.current
        if (!map) return
        const pt = map.latLngToContainerPoint(e.latlng)
        const rect = map.getContainer().getBoundingClientRect()
        setTooltip((prev) => prev ? { ...prev, x: rect.left + pt.x, y: rect.top + pt.y - 12, latLng: [e.latlng.lat, e.latlng.lng] } : null)
      },
      click: (e) => {
        // Stop event from reaching MapClickReset
        e.originalEvent._stopped = true
        if (selection?.type === 'state' && selection.name === name) {
          setSelection(null)
        } else {
          setSelection({ type: 'state', name, id: name })
        }
      },
    })
  }, [stateValueMap, connections, formatValue, metricLabel, highlightedStates, selection])

  /* ── Scroll hint ───────────────────────────────────────────────────── */
  const handleWheel = useCallback(() => {
    if (!mapActive) {
      setShowHint(true)
      clearTimeout(hintTimer.current)
      hintTimer.current = setTimeout(() => setShowHint(false), 1500)
    }
  }, [mapActive])

  useEffect(() => () => clearTimeout(hintTimer.current), [])

  /* ── Legend data (dynamic) ─────────────────────────────────────────── */
  const legendStops = useMemo(() => {
    const values = effectiveStateValues.map((d) => d.value).filter((v) => v != null && v > 0)
    if (!values.length) return null
    const [min, max] = d3.extent(values)
    return { min, max }
  }, [effectiveStateValues])

  /* ── Force GeoJSON re-key on data or selection change ──────────────── */
  const geoKey = useMemo(() => {
    const sel = selection ? `${selection.type}-${selection.id}` : 'none'
    return `${geojsonUrl}-${stateData.length}-${stateData.reduce((s, d) => s + (d.value || 0), 0)}-${sel}`
  }, [geojsonUrl, stateData, selection])

  if (loading) {
    return (
      <div style={{ minHeight: height }} className="flex items-center justify-center text-text-secondary">
        Loading map...
      </div>
    )
  }

  return (
    <>
      <div
        style={{ minHeight: height, width: '100%' }}
        className="port-map-container h-full flex flex-col rounded-lg overflow-hidden border border-border-light isolate"
        role="region"
        aria-label={`Interactive map showing ${metricLabel} by ${title} with port connections`}
      >
        <div className="flex-1 relative" style={{ minHeight: 0 }} onWheel={handleWheel}>
          {showHint && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)', pointerEvents: 'none', transition: 'opacity 0.3s' }}>
              <span style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '8px 16px', borderRadius: 6, fontSize: 16 }}>
                Click the map to enable zooming
              </span>
            </div>
          )}

          {/* Selection info panel */}
          <SelectionPanel
            selection={selection}
            connections={connections}
            portData={portData}
            formatValue={formatValue}
          />

          {/* Clear selection button */}
          {selection && (
            <button
              onClick={() => setSelection(null)}
              className="absolute top-3 left-3 z-[1000] bg-white/95 border border-border-light rounded-lg shadow-lg px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Clear selection
            </button>
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
            <PortPane />
            <MapClickReset onReset={() => setSelection(null)} />

            {/* Choropleth layer (underneath) */}
            {geojson && (
              <GeoJSON
                key={geoKey}
                ref={geoJsonRef}
                data={geojson}
                style={style}
                onEachFeature={onEachFeature}
              />
            )}

            {/* Port bubble markers (on portMarkers pane — above choropleth) */}
            {portData
              .filter((p) => p.lat != null && p.lng != null)
              .map((p) => {
                const isDimmed = highlightedPorts && !highlightedPorts.has(p.portCode)
                const isSelected = selection?.type === 'port' && selection.id === p.portCode
                // Use per-pair value when a state is selected, otherwise total
                const displayValue = effectivePortValues ? (effectivePortValues.get(p.portCode) || 0) : p.value
                // Dynamic sizing: when a state is selected, size ports by per-pair value
                const dynamicMax = effectivePortValues
                  ? Math.max(1, ...Array.from(effectivePortValues.values()))
                  : portMax
                const r = radiusScale(displayValue, dynamicMax)
                // Key includes selection to force react-leaflet to re-mount with new pathOptions
                const selKey = selection ? `${selection.type}-${selection.id}` : 'none'

                return (
                  <CircleMarker
                    key={`port-${p.portCode}-${selKey}`}
                    center={[p.lat, p.lng]}
                    radius={isDimmed ? r * 0.7 : r}
                    bubblingMouseEvents={false}
                    pane="portMarkers"
                    pathOptions={{
                      fillColor: isDimmed ? '#ccc' : isSelected ? '#ff6600' : '#0056a9',
                      color: isSelected ? '#cc5200' : isDimmed ? '#aaa' : '#003d75',
                      weight: isSelected ? 3 : 1.5,
                      opacity: isDimmed ? 0.4 : 0.9,
                      fillOpacity: isDimmed ? 0.3 : 0.85,
                    }}
                    eventHandlers={{
                      mouseover: () => {
                        const map = mapInstanceRef.current
                        if (!map) return
                        const pt = map.latLngToContainerPoint([p.lat, p.lng])
                        const rect = map.getContainer().getBoundingClientRect()
                        const connCount = connections.portToState.get(p.portCode)?.size || 0
                        setTooltip({
                          content: (
                            <>
                              <strong>{p.name}</strong> ({p.portCode})<br />
                              {formatValue(displayValue)} {metricLabel}
                              {connCount > 0 && !selection && (
                                <><br /><span style={{ fontSize: 11, color: '#666' }}>{connCount} connected state{connCount > 1 ? 's' : ''} — click to explore</span></>
                              )}
                            </>
                          ),
                          x: rect.left + pt.x,
                          y: rect.top + pt.y - r - 8,
                          latLng: [p.lat, p.lng],
                          offsetY: -r - 8,
                        })
                      },
                      mouseout: () => setTooltip(null),
                      click: (e) => {
                        e.originalEvent._stopped = true
                        if (selection?.type === 'port' && selection.id === p.portCode) {
                          setSelection(null)
                        } else {
                          setSelection({ type: 'port', name: p.name, id: p.portCode })
                        }
                      },
                    }}
                  />
                )
              })}
          </MapContainer>
        </div>

        {/* Legend bar */}
        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 bg-white/90 text-base text-text-secondary border-t border-border-light flex-shrink-0"
          style={{ height: 'auto' }}
        >
          {/* Choropleth gradient */}
          <span className="font-medium text-text-primary">{title}</span>
          {legendStops && (
            <span className="flex items-center gap-2">
              <span className="text-xs">{formatValue(legendStops.min)}</span>
              <span
                style={{
                  display: 'inline-block', width: 100, height: 12, borderRadius: 3,
                  background: `linear-gradient(to right, ${colorRange[0]}, ${colorRange[1]})`,
                  border: '1px solid #ccc',
                }}
              />
              <span className="text-xs">{formatValue(legendStops.max)}</span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: emptyColor, border: '1px solid #ccc' }} />
            <span className="text-xs">No data</span>
          </span>

          {/* Port marker legend */}
          <span className="border-l border-border-light pl-3 flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: '#0056a9' }} />
            <span className="text-xs">Border Port</span>
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="24" height="16" aria-hidden="true" className="flex-shrink-0">
              <circle cx="7" cy="11" r="3" fill="#0056a9" opacity="0.5" />
              <circle cx="17" cy="8" r="6" fill="#0056a9" opacity="0.5" />
            </svg>
            <span className="text-xs">Size = {metricLabel}</span>
          </span>

          {/* Interaction hint */}
          <span className="ml-auto text-xs text-text-secondary italic">
            Click a state or port to explore connections
          </span>
        </div>
      </div>

      <MapTooltip tooltip={tooltip} />
    </>
  )
}
