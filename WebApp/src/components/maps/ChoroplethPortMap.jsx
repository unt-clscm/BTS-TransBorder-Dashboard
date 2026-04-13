/**
 * ChoroplethPortMap.jsx
 *
 * Multi-layer interactive choropleth + port bubble map.
 * Supports multiple GeoJSON layers (e.g. US states + Mexican states) with
 * independent color scales, plus grouped port markers on a high-z pane.
 *
 * Click a state   -> choropleth re-colors to show trade through that state's
 *                    connected ports; dims unconnected regions; side panel.
 * Click a port    -> choropleth re-colors to show trade values through that
 *                    specific port; dims unconnected regions; side panel.
 * Click empty map -> resets selection.
 *
 * Props:
 *   layers        - [{ url, data: [{name,value}], nameProperty, colorRange, title }]
 *   ports         - [{ name, lat, lng, value, portCode, group }]
 *   connections   - { stateToPort: Map<name, Map<portCode, value>>,
 *                     portToState: Map<portCode, Map<name, value>> }
 *   formatValue, metricLabel, center, zoom, height
 *   groupColors   - { groupName: { fill, stroke } }
 *   legendGroups  - [{ label, color }]
 *   emptyColor
 */
import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Polyline } from 'react-leaflet'
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
  geoCache,
  useGeoJSON,
  computeArc,
  computeCentroids,
  radiusScale,
  makeStateStyle,
  ArcPane,
  PortPane,
  MapClickReset,
  MapTooltip,
} from './mapShared'

/* ── Port radius (local alias with ChoroplethPortMap defaults) ───────── */
// radiusScale imported from mapShared; wrap with this map's min/max/mult defaults
const _radiusScale = (value, maxValue) => radiusScale(value, maxValue, 4, 20, 16)

const DEFAULT_PORT_COLOR = { fill: '#0056a9', stroke: '#003d75' }

/* ── Border group config for selection panel ─────────────────────────── */
const BORDER_GROUPS = {
  texas:  { label: 'Mexico Border (Texas)', color: '#d97706', icon: '●' },
  mexico: { label: 'Mexico Border (Other)', color: '#0056a9', icon: '●' },
  canada: { label: 'Canada Border',         color: '#16a34a', icon: '●' },
}

/* ── Selection info panel ────────────────────────────────────────────── */
function SelectionPanel({ selection, connections, ports, formatValue, arcSelection = null, metricLabel = 'Trade Value' }) {
  if (arcSelection) {
    return (
      <div className="absolute top-0 right-0 bottom-0 z-[1000] w-[260px] bg-white/95 border-l border-border-light flex flex-col text-sm">
        <div className="px-3 pt-2.5 pb-1.5 border-b border-border-light flex-shrink-0">
          <div className="font-semibold text-text-primary text-xs uppercase tracking-wide text-text-secondary mb-1">
            Focused Flow
          </div>
          <div className="font-semibold text-text-primary truncate">{arcSelection.originName}</div>
          <div className="text-xs text-text-secondary mt-0.5">↓</div>
          <div className="font-semibold text-text-primary truncate">{arcSelection.destName}</div>
          {arcSelection.value > 0 && (
            <div className="text-xs text-text-secondary mt-1">
              {formatValue(arcSelection.value)} {metricLabel}
            </div>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center px-3">
          <span className="text-xs text-text-secondary italic text-center">
            Click the arc again or click empty space to return to full view
          </span>
        </div>
      </div>
    )
  }

  if (!selection) return null

  let title, subtitle, items, grouped
  if (selection.type === 'state') {
    const connectedPorts = connections.stateToPort.get(selection.name) || new Map()
    title = selection.name
    subtitle = 'Ports'
    items = ports
      .filter((p) => connectedPorts.has(p.portCode))
      .map((p) => ({ name: p.name, value: connectedPorts.get(p.portCode) || 0, group: p.group }))
      .sort((a, b) => b.value - a.value)

    // Group by border
    grouped = {}
    for (const item of items) {
      const g = item.group || 'mexico'
      if (!grouped[g]) grouped[g] = []
      grouped[g].push(item)
    }
  } else {
    const connectedStates = connections.portToState.get(selection.id) || new Map()
    title = selection.name
    subtitle = 'Connected States/Provinces'
    items = Array.from(connectedStates, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
    grouped = null // flat list for port selection
  }

  // Total across all connections
  const total = items.reduce((s, d) => s + d.value, 0)

  // Render grouped items (when a state is selected → show ports by border)
  const renderGrouped = () => {
    const groupOrder = ['texas', 'mexico', 'canada']
    return groupOrder
      .filter((g) => grouped[g]?.length)
      .map((g) => {
        const cfg = BORDER_GROUPS[g]
        const groupItems = grouped[g]
        const groupTotal = groupItems.reduce((s, d) => s + d.value, 0)
        return (
          <div key={g} className="mt-1.5 first:mt-0">
            <div className="flex items-center gap-1.5 mb-0.5 pb-0.5 border-b border-border-light">
              <span style={{ color: cfg.color, fontSize: 10 }}>{cfg.icon}</span>
              <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
              <span className="ml-auto text-xs text-text-secondary">{formatValue(groupTotal)}</span>
            </div>
            {groupItems.map((item) => (
              <div key={item.name} className="flex justify-between gap-3 py-px pl-3">
                <span className="truncate text-text-primary text-[13px]">{item.name}</span>
                <span className="text-text-secondary whitespace-nowrap flex-shrink-0 text-[13px]">{formatValue(item.value)}</span>
              </div>
            ))}
          </div>
        )
      })
  }

  // Render flat list (when a port is selected → show states/provinces)
  const renderFlat = () => (
    <>
      {items.slice(0, 20).map((item) => (
        <div key={item.name} className="flex justify-between gap-3 py-px">
          <span className="truncate text-text-primary text-[13px]">{item.name}</span>
          <span className="text-text-secondary whitespace-nowrap flex-shrink-0 text-[13px]">{formatValue(item.value)}</span>
        </div>
      ))}
      {items.length > 20 && (
        <div className="text-xs text-text-secondary italic mt-1">
          +{items.length - 20} more
        </div>
      )}
    </>
  )

  return (
    <div className="absolute top-0 right-0 bottom-0 z-[1000] w-[260px] bg-white/95 border-l border-border-light flex flex-col text-sm">
      {/* Header — fixed */}
      <div className="px-3 pt-2.5 pb-1.5 border-b border-border-light flex-shrink-0">
        <div className="font-semibold text-text-primary flex items-center justify-between">
          <span className="truncate">{title}</span>
          <span className="text-xs text-text-secondary ml-2 flex-shrink-0">{subtitle}</span>
        </div>
        {total > 0 && (
          <div className="text-xs text-text-secondary mt-0.5">
            Total: <span className="font-semibold text-text-primary">{formatValue(total)}</span>
          </div>
        )}
      </div>
      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto px-3 py-1.5 min-h-0">
        {items.length === 0 && (
          <div className="text-text-secondary text-xs italic">No connections found</div>
        )}
        {grouped ? renderGrouped() : renderFlat()}
      </div>
    </div>
  )
}

/* ── Single GeoJSON layer with interactive styling ───────────────────── */
function ChoroplethLayer({
  url, data, nameProperty = 'name', colorRange, emptyColor,
  selection, highlightedStates, connections, portToStateValues,
  formatValue, metricLabel, setSelection, setTooltip, mapInstanceRef,
}) {
  const { geojson, loading } = useGeoJSON(url)
  const geoJsonRef = useRef(null)

  /* ── Effective values: dynamic when a port is selected ─────────── */
  const effectiveValues = useMemo(() => {
    if (selection?.type === 'port' && portToStateValues) {
      // Show per-port trade values for this layer's states
      return data
        .filter((d) => portToStateValues.has(d.name))
        .map((d) => ({ name: d.name, value: portToStateValues.get(d.name) || 0 }))
    }
    return data
  }, [data, selection, portToStateValues])

  const valueMap = useMemo(() => {
    const m = new Map()
    for (const d of effectiveValues) if (d.name && d.value != null) m.set(d.name, d.value)
    return m
  }, [effectiveValues])

  const colorScale = useMemo(() => {
    const values = effectiveValues.map((d) => d.value).filter((v) => v != null && v > 0)
    if (!values.length) return () => emptyColor
    return d3.scaleSequential()
      .domain(d3.extent(values))
      .interpolator(d3.interpolateRgb(colorRange[0], colorRange[1]))
  }, [effectiveValues, colorRange, emptyColor])

  const style = useCallback((feature) => {
    const name = feature.properties?.[nameProperty]
    const value = valueMap.get(name)
    const fill = value != null && value > 0 ? colorScale(value) : emptyColor
    const isOrigin = selection?.type === 'state' && name === selection.name
    return makeStateStyle(name, fill, emptyColor, highlightedStates, isOrigin)
  }, [nameProperty, valueMap, colorScale, emptyColor, highlightedStates, selection])

  const onEachFeature = useCallback((feature, layer) => {
    const name = feature.properties?.[nameProperty]
    layer.on({
      mouseover: (e) => {
        // Skip tooltip and hover highlight for dimmed (non-highlighted) states
        if (highlightedStates && !highlightedStates.has(name)) return
        const value = valueMap.get(name)
        e.target.setStyle({ weight: 2.5, color: '#333', fillOpacity: 0.85 })
        e.target.bringToFront()
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
                <><br /><span style={{ fontSize: 11, color: '#666' }}>{connCount} port{connCount > 1 ? 's' : ''} — click to explore</span></>
              )}
            </>
          ),
          x: rect.left + pt.x, y: rect.top + pt.y - 12,
          latLng: [e.latlng.lat, e.latlng.lng], offsetY: -12,
        })
      },
      mouseout: (e) => { geoJsonRef.current?.resetStyle(e.target); setTooltip(null) },
      mousemove: (e) => {
        const map = mapInstanceRef.current
        if (!map) return
        const pt = map.latLngToContainerPoint(e.latlng)
        const rect = map.getContainer().getBoundingClientRect()
        setTooltip((prev) => prev ? { ...prev, x: rect.left + pt.x, y: rect.top + pt.y - 12, latLng: [e.latlng.lat, e.latlng.lng] } : null)
      },
      click: (e) => {
        e.originalEvent._stopped = true
        if (selection?.type === 'state' && selection.name === name) {
          setSelection(null)
        } else {
          setSelection({ type: 'state', name, id: name })
        }
      },
    })
  }, [nameProperty, valueMap, connections, formatValue, metricLabel, highlightedStates, selection, mapInstanceRef, setSelection, setTooltip])

  const geoKey = useMemo(() => {
    const sel = selection ? `${selection.type}-${selection.id}` : 'none'
    return `${url}-${data.length}-${data.reduce((s, d) => s + (d.value || 0), 0)}-${sel}`
  }, [url, data, selection])

  if (loading || !geojson) return null

  return (
    <GeoJSON
      key={geoKey}
      ref={geoJsonRef}
      data={geojson}
      style={style}
      onEachFeature={onEachFeature}
    />
  )
}

/* ── Main component ─────────────────────────────────────────────────── */
export default function ChoroplethPortMap({
  layers = [],
  ports = [],
  connections = { stateToPort: new Map(), portToState: new Map() },
  formatValue = formatCurrencyDefault,
  metricLabel = 'Trade Value',
  emptyColor = '#f0f0f0',
  center = [42.0, -97.0],
  zoom = 4,
  height = '520px',
  groupColors = null,
  legendGroups = null,
}) {
  const mapInstanceRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)
  const [mapActive, setMapActive] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const hintTimer = useRef(null)
  const [selection, setSelection] = useState(null)
  const [arcSelection, setArcSelection] = useState(null) // { originName, destName, srcState, dstState } | null

  // Wrapper: clears arc selection whenever the main selection changes
  const handleSetSelection = useCallback((sel) => {
    setSelection(sel)
    setArcSelection(null)
  }, [])

  const portMax = useMemo(() => Math.max(1, ...ports.map((p) => p.value || 0)), [ports])

  /* ── Derived highlights ────────────────────────────────────────────── */
  const { highlightedStates, highlightedPorts } = useMemo(() => {
    if (!selection) return { highlightedStates: null, highlightedPorts: null }
    if (selection.type === 'state') {
      const connPorts = connections.stateToPort.get(selection.name) || new Map()

      // When an arc is clicked, narrow highlight to just that arc's state endpoints
      if (arcSelection) {
        const stateNames = new Set()
        if (arcSelection.srcState) stateNames.add(arcSelection.srcState)
        if (arcSelection.dstState) stateNames.add(arcSelection.dstState)
        return {
          highlightedStates: stateNames.size ? stateNames : null,
          highlightedPorts: new Set(connPorts.keys()),
        }
      }

      // Full connection highlight (no arc selected)
      const foreignStates = new Map()
      for (const portCode of connPorts.keys()) {
        const portStates = connections.portToState.get(portCode) || new Map()
        for (const [stateName, value] of portStates) {
          if (stateName === selection.name) continue
          foreignStates.set(stateName, (foreignStates.get(stateName) || 0) + value)
        }
      }
      const topDests = [...foreignStates.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
      const highlighted = new Set(topDests.map(([name]) => name))
      highlighted.add(selection.name)
      return {
        highlightedStates: highlighted,
        highlightedPorts: new Set(connPorts.keys()),
      }
    } else {
      const connStates = connections.portToState.get(selection.id) || new Map()
      return {
        highlightedStates: new Set(connStates.keys()),
        highlightedPorts: new Set([selection.id]),
      }
    }
  }, [selection, arcSelection, connections])

  /* ── Port-to-state values for dynamic choropleth when a port is clicked */
  const portToStateValues = useMemo(() => {
    if (selection?.type !== 'port') return null
    return connections.portToState.get(selection.id) || new Map()
  }, [selection, connections])

  /* ── Effective port values when a state is selected ────────────────── */
  const stateToPortValues = useMemo(() => {
    if (selection?.type !== 'state') return null
    return connections.stateToPort.get(selection.name) || new Map()
  }, [selection, connections])

  /* ── Scroll hint ───────────────────────────────────────────────────── */
  const handleWheel = useCallback(() => {
    if (!mapActive) {
      setShowHint(true)
      clearTimeout(hintTimer.current)
      hintTimer.current = setTimeout(() => setShowHint(false), 1500)
    }
  }, [mapActive])

  useEffect(() => () => clearTimeout(hintTimer.current), [])

  /* ── Legend stops per layer ────────────────────────────────────────── */
  const layerLegends = useMemo(() => {
    return layers.map((layer) => {
      const values = layer.data.map((d) => d.value).filter((v) => v != null && v > 0)
      if (!values.length) return null
      const [min, max] = d3.extent(values)
      return { min, max, colorRange: layer.colorRange, title: layer.title }
    }).filter(Boolean)
  }, [layers])

  /* ── Centroids from cached GeoJSON layers (for arc endpoints) ────────
       GeoJSON data is already fetched by ChoroplethLayer components and
       stored in geoCache. We read from the cache directly to avoid
       calling hooks in a dynamic loop.                                    */
  const [centroidVersion, setCentroidVersion] = useState(0)
  // Bump version when layers finish loading so centroids recompute
  useEffect(() => {
    const urls = layers.map((l) => l.url).filter(Boolean)
    const allCached = urls.every((u) => geoCache[u])
    if (allCached && urls.length) setCentroidVersion((v) => v + 1)
    else {
      // Poll briefly until ChoroplethLayer components populate the cache
      const timer = setInterval(() => {
        if (urls.every((u) => geoCache[u])) {
          setCentroidVersion((v) => v + 1)
          clearInterval(timer)
        }
      }, 500)
      return () => clearInterval(timer)
    }
  }, [layers])

  const allCentroids = useMemo(() => {
    void centroidVersion // dependency trigger
    const merged = {}
    for (const layer of layers) {
      const geo = layer.url ? geoCache[layer.url] : null
      if (geo) Object.assign(merged, computeCentroids(geo, layer.nameProperty || 'name'))
    }
    return merged
  }, [layers, centroidVersion])

  /* ── Port coordinate lookup ────────────────────────────────────────── */
  const portCoordLookup = useMemo(() => {
    const m = {}
    for (const p of ports) {
      if (p.lat != null && p.lng != null) m[p.portCode] = [p.lat, p.lng]
    }
    return m
  }, [ports])

  /* ── Flow mode toggle ─────────────────────────────────────────────── */
  const [flowMode, setFlowMode] = useState('via-ports') // 'direct' | 'via-ports'

  /* ── Flow arcs ─────────────────────────────────────────────────────── */
  const flowArcs = useMemo(() => {
    if (!selection) return []
    const arcs = []

    if (selection.type === 'state') {
      const startCoord = allCentroids[selection.name]
      if (!startCoord) return []
      const connPorts = connections.stateToPort.get(selection.name) || new Map()

      // Step 1: Aggregate ALL destination states through all ports (single source of truth)
      const foreignStates = new Map()          // destName → total value
      const destViaPort = new Map()            // destName → Map<portCode, value>
      for (const portCode of connPorts.keys()) {
        const portStates = connections.portToState.get(portCode) || new Map()
        for (const [stateName, value] of portStates) {
          if (stateName === selection.name) continue
          foreignStates.set(stateName, (foreignStates.get(stateName) || 0) + value)
          if (!destViaPort.has(stateName)) destViaPort.set(stateName, new Map())
          destViaPort.get(stateName).set(portCode, (destViaPort.get(stateName).get(portCode) || 0) + value)
        }
      }
      const topDests = [...foreignStates.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)

      // Step 2: Present arcs based on flow mode
      if (flowMode === 'via-ports') {
        // State → Port → Destination (two-hop arcs through ports)
        const usedPorts = new Set()
        for (const [destName, _totalVal] of topDests) {
          const destCoord = allCentroids[destName]
          if (!destCoord) continue
          const portBreakdown = destViaPort.get(destName) || new Map()
          // Show the top port for this destination
          const topPort = [...portBreakdown.entries()].sort((a, b) => b[1] - a[1])[0]
          if (!topPort) continue
          const [portCode, portVal] = topPort
          const portCoord = portCoordLookup[portCode]
          if (!portCoord) continue
          const port = ports.find((p) => p.portCode === portCode)
          const portName = port?.name || portCode
          // State → Port arc (only add once per port)
          if (!usedPorts.has(portCode)) {
            usedPorts.add(portCode)
            const portTotal = connPorts.get(portCode) || 0
            arcs.push({ start: startCoord, end: portCoord, value: portTotal, group: port?.group, originName: selection.name, destName: portName, srcState: selection.name, dstState: null })
          }
          // Port → Destination arc
          arcs.push({ start: portCoord, end: destCoord, value: portVal, group: null, originName: portName, destName, srcState: selection.name, dstState: destName })
        }
      } else {
        // Direct: State → Destination (single arc, aggregated)
        for (const [stateName, value] of topDests) {
          const endCoord = allCentroids[stateName]
          if (!endCoord) continue
          arcs.push({ start: startCoord, end: endCoord, value, group: null, originName: selection.name, destName: stateName, srcState: selection.name, dstState: stateName })
        }
      }
    } else if (selection.type === 'port') {
      // Port selected → draw arcs from port to each connected state/province
      const startCoord = portCoordLookup[selection.id]
      if (!startCoord) return []
      const connStates = connections.portToState.get(selection.id) || new Map()
      const sorted = [...connStates.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)
      for (const [stateName, value] of sorted) {
        const endCoord = allCentroids[stateName]
        if (!endCoord) continue
        arcs.push({ start: startCoord, end: endCoord, value, group: null, originName: selection.name, destName: stateName, srcState: null, dstState: stateName })
      }
    }

    if (!arcs.length) return []

    // Sort by value ascending so thicker arcs render on top
    arcs.sort((a, b) => a.value - b.value)
    const maxVal = Math.max(1, ...arcs.map((a) => a.value))

    return arcs.map((arc, i) => ({
      ...arc,
      points: computeArc(arc.start, arc.end, 0.12 + i * 0.008),
      weight: Math.max(2.5, Math.min(7, 2.5 + 4.5 * Math.sqrt(arc.value / maxVal))),
      opacity: 0.8,
    }))
  }, [selection, flowMode, connections, allCentroids, portCoordLookup, ports])

  /* ── Arc colors by group ───────────────────────────────────────────── */
  const ARC_COLORS = {
    texas:  '#d97706',  // amber-500
    mexico: '#2563eb',  // blue-600
    canada: '#16a34a',  // green-600
    default: '#7c3aed', // violet-600 for direct/port arcs
  }

  return (
    <>
      <div
        style={{ minHeight: height, width: '100%' }}
        className="port-map-container h-full flex flex-col rounded-lg overflow-hidden border border-border-light isolate"
        role="region"
        aria-label={`Interactive map showing ${metricLabel} by state and border ports`}
      >
        <div className="flex-1 relative" style={{ minHeight: 0 }} onWheel={handleWheel}>
          {showHint && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)', pointerEvents: 'none', transition: 'opacity 0.3s' }}>
              <span style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '8px 16px', borderRadius: 6, fontSize: 16 }}>
                Click the map to enable zooming
              </span>
            </div>
          )}

          {/* Side panel — overlaid on right side of map */}
          {selection && (
            <SelectionPanel
              selection={selection}
              connections={connections}
              ports={ports}
              formatValue={formatValue}
              arcSelection={arcSelection}
              metricLabel={metricLabel}
            />
          )}

          {selection && (
            <div className="absolute top-[130px] left-[10px] z-[1000] flex flex-col gap-1.5">
              <button
                onClick={() => { setSelection(null); setArcSelection(null) }}
                className="bg-white/95 border border-border-light rounded-lg shadow-lg px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Clear selection
              </button>
              {selection.type === 'state' && (
                <button
                  onClick={() => setFlowMode((m) => (m === 'direct' ? 'via-ports' : 'direct'))}
                  className="bg-white/95 border border-border-light rounded-lg shadow-lg px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  {flowMode === 'via-ports' ? 'Show direct flows' : 'Show via ports'}
                </button>
              )}
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
            <ArcPane />
            <PortPane />
            <MapClickReset onReset={() => { setSelection(null); setArcSelection(null) }} />

            {/* Choropleth layers */}
            {layers.map((layer, i) => (
              <ChoroplethLayer
                key={layer.url || i}
                url={layer.url}
                data={layer.data}
                nameProperty={layer.nameProperty || 'name'}
                colorRange={layer.colorRange}
                emptyColor={emptyColor}
                selection={selection}
                highlightedStates={highlightedStates}
                connections={connections}
                portToStateValues={portToStateValues}
                formatValue={formatValue}
                metricLabel={metricLabel}
                setSelection={handleSetSelection}
                setTooltip={setTooltip}
                mapInstanceRef={mapInstanceRef}
              />
            ))}

            {/* Port markers (above choropleth) */}
            {ports
              .filter((p) => p.lat != null && p.lng != null)
              .map((p) => {
                const isDimmed = highlightedPorts && !highlightedPorts.has(p.portCode)
                const isSelected = selection?.type === 'port' && selection.id === p.portCode
                const displayValue = stateToPortValues ? (stateToPortValues.get(p.portCode) || 0) : p.value
                // Dynamic sizing: when a state is selected, size ports by per-pair value
                const dynamicMax = stateToPortValues
                  ? Math.max(1, ...Array.from(stateToPortValues.values()))
                  : portMax
                const r = radiusScale(displayValue, dynamicMax)
                const gc = groupColors && p.group ? groupColors[p.group] : null
                const defaultFill = gc?.fill || DEFAULT_PORT_COLOR.fill
                const defaultStroke = gc?.stroke || DEFAULT_PORT_COLOR.stroke
                const selKey = selection ? `${selection.type}-${selection.id}` : 'none'

                return (
                  <CircleMarker
                    key={`port-${p.portCode}-${selKey}`}
                    center={[p.lat, p.lng]}
                    radius={isDimmed ? r * 0.7 : r}
                    bubblingMouseEvents={false}
                    pane="portMarkers"
                    pathOptions={{
                      fillColor: isDimmed ? '#ccc' : isSelected ? '#ff6600' : defaultFill,
                      color: isSelected ? '#cc5200' : isDimmed ? '#aaa' : defaultStroke,
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
                                <><br /><span style={{ fontSize: 11, color: '#666' }}>{connCount} state{connCount > 1 ? 's' : ''} — click to explore</span></>
                              )}
                            </>
                          ),
                          x: rect.left + pt.x, y: rect.top + pt.y - r - 8,
                          latLng: [p.lat, p.lng], offsetY: -r - 8,
                        })
                      },
                      mouseout: () => setTooltip(null),
                      click: (e) => {
                        e.originalEvent._stopped = true
                        if (selection?.type === 'port' && selection.id === p.portCode) {
                          handleSetSelection(null)
                        } else {
                          handleSetSelection({ type: 'port', name: p.name, id: p.portCode })
                        }
                      },
                    }}
                  />
                )
              })}

            {/* Flow arcs */}
            {flowArcs.map((arc, i) => {
              const isArcSelected = arcSelection &&
                arcSelection.originName === arc.originName &&
                arcSelection.destName === arc.destName
              return (
                <Polyline
                  key={`arc-${i}`}
                  positions={arc.points}
                  pathOptions={{
                    color: ARC_COLORS[arc.group] || ARC_COLORS.default,
                    weight: isArcSelected ? arc.weight + 2.5 : arc.weight,
                    opacity: isArcSelected ? 1 : arc.opacity,
                    lineCap: 'round',
                    dashArray: selection?.type === 'port' ? '6 4' : null,
                    pane: 'flowArcs',
                  }}
                  bubblingMouseEvents={false}
                  eventHandlers={{
                    mouseover: (e) => {
                      e.target.setStyle({ weight: arc.weight + 2, opacity: 1 })
                      const map = mapInstanceRef.current
                      if (!map) return
                      const pt = map.latLngToContainerPoint(e.latlng)
                      const rect = map.getContainer().getBoundingClientRect()
                      setTooltip({
                        content: (
                          <>
                            <strong>{arc.originName}</strong> &rarr; <strong>{arc.destName}</strong><br />
                            {formatValue(arc.value)} {metricLabel}
                            {!isArcSelected && <><br /><span style={{ fontSize: 11, color: '#666' }}>Click to focus this flow</span></>}
                          </>
                        ),
                        x: rect.left + pt.x, y: rect.top + pt.y - 12,
                        latLng: [e.latlng.lat, e.latlng.lng], offsetY: -12,
                      })
                    },
                    mousemove: (e) => {
                      const map = mapInstanceRef.current
                      if (!map) return
                      const pt = map.latLngToContainerPoint(e.latlng)
                      const rect = map.getContainer().getBoundingClientRect()
                      setTooltip((prev) => prev ? { ...prev, x: rect.left + pt.x, y: rect.top + pt.y - 12, latLng: [e.latlng.lat, e.latlng.lng] } : null)
                    },
                    mouseout: (e) => {
                      if (!isArcSelected) e.target.setStyle({ weight: arc.weight, opacity: arc.opacity })
                      setTooltip(null)
                    },
                    click: (e) => {
                      e.originalEvent._stopped = true
                      setArcSelection(isArcSelected ? null : { originName: arc.originName, destName: arc.destName, srcState: arc.srcState, dstState: arc.dstState, value: arc.value })
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
          {/* Per-layer choropleth legends */}
          {layerLegends.map((leg, i) => (
            <span key={i} className="flex items-center gap-2">
              <span className="font-medium text-text-primary text-xs">{leg.title}</span>
              <span className="text-xs">{formatValue(leg.min)}</span>
              <span
                style={{
                  display: 'inline-block', width: 70, height: 10, borderRadius: 3,
                  background: `linear-gradient(to right, ${leg.colorRange[0]}, ${leg.colorRange[1]})`,
                  border: '1px solid #ccc',
                }}
              />
              <span className="text-xs">{formatValue(leg.max)}</span>
            </span>
          ))}

          {/* Port legend */}
          <span className="border-l border-border-light pl-3 flex items-center gap-3">
            {legendGroups
              ? legendGroups.map((g) => (
                  <span key={g.label} className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded-full" style={{ background: g.color }} />
                    <span className="text-xs">{g.label}</span>
                  </span>
                ))
              : (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ background: DEFAULT_PORT_COLOR.fill }} />
                  <span className="text-xs">Border Port</span>
                </span>
              )
            }
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="24" height="16" aria-hidden="true" className="flex-shrink-0">
              <circle cx="7" cy="11" r="3" fill="#999" opacity="0.5" />
              <circle cx="17" cy="8" r="6" fill="#999" opacity="0.5" />
            </svg>
            <span className="text-xs">Size = {metricLabel}</span>
          </span>

          {/* Flow arc legend — only when arcs are visible */}
          {flowArcs.length > 0 && (
            <span className="border-l border-border-light pl-3 flex items-center gap-3">
              {(() => {
                const groups = new Set(flowArcs.map((a) => a.group))
                const items = []
                if (groups.has('texas')) items.push({ color: ARC_COLORS.texas, label: 'Via TX Port' })
                if (groups.has('mexico')) items.push({ color: ARC_COLORS.mexico, label: 'Via Other MX Port' })
                if (groups.has('canada')) items.push({ color: ARC_COLORS.canada, label: 'Via CA Port' })
                if (groups.has(null) || groups.has(undefined)) items.push({ color: ARC_COLORS.default, label: 'Trade Flow' })
                return items.map((item) => (
                  <span key={item.label} className="flex items-center gap-1">
                    <span style={{ display: 'inline-block', width: 16, height: 3, borderRadius: 2, background: item.color }} />
                    <span className="text-xs">{item.label}</span>
                  </span>
                ))
              })()}
            </span>
          )}

          <span className="ml-auto text-xs text-text-secondary italic">
            Click a state or port to explore connections
          </span>
        </div>
      </div>

      <MapTooltip tooltip={tooltip} />
    </>
  )
}
