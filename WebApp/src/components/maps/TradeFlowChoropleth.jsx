/**
 * TradeFlowChoropleth.jsx
 *
 * Interactive dual-choropleth map (US states + Mexican states) with border port
 * bubbles, animated flow-arc lines on click, and a year-animation timeline.
 *
 * Click a US state   → arc lines to its top MX trading partners
 * Click a MX state   → arc lines to its top US trading partners
 * Click a port       → arcs to connected US & MX states
 * Toggle "Via Ports" → routes state→port→state instead of direct arcs
 * Year animation     → play/scrub through years to see trade evolution
 *
 * Props:
 *   data         — OD rows filtered by tradeType/mode but NOT by year
 *                   [{ Year, State, MexState, PortCode, Port, TradeValue, WeightLb }]
 *   yearFilter   — external year filter array from parent (used when not animating)
 *   valueField   — which field to aggregate ('TradeValue' or 'WeightLb')
 *   formatValue  — value formatter (currency or weight)
 *   center, zoom — map positioning
 *   height       — CSS height
 */
import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import {
  MapContainer, TileLayer, GeoJSON, CircleMarker, Polyline,
} from 'react-leaflet'
import * as d3 from 'd3'
import 'leaflet/dist/leaflet.css'

import { usePortCoordinates, useStateCoordinates, buildMapPorts } from '@/hooks/usePortMapData'
import {
  ScrollWheelGuard, MapResizeHandler, ResetZoomButton, TooltipSync,
  formatCurrencyDefault,
} from './mapHelpers'
import {
  useGeoJSON,
  computeArc,
  computeCentroids,
  radiusScale as _radiusScaleBase,
  makeStateStyle,
  ArcPane,
  PortPane,
  MapClickReset,
  MapTooltip,
} from './mapShared'

const BASE = import.meta.env.BASE_URL

/* Port bubble radius — local defaults differ from shared: max=18, mult=14 */
const radiusScale = (value, maxValue) => _radiusScaleBase(value, maxValue, 4, 18, 14)

/* ═══════════════════════════════════════════════════════════════════
   Selection info panel (top-right overlay)
   ═══════════════════════════════════════════════════════════════════ */

function SelectionPanel({ selection, stateFlows, portFlows, formatValue }) {
  if (!selection) return null

  let title, subtitle, items
  if (selection.type === 'us-state') {
    title = selection.name
    subtitle = 'MX Partners'
    const p = stateFlows.usToMx.get(selection.name)
    items = p
      ? [...p.entries()].map(([n, v]) => ({ name: n, value: v })).sort((a, b) => b.value - a.value).slice(0, 10)
      : []
  } else if (selection.type === 'mx-state') {
    title = selection.name
    subtitle = 'US Partners'
    const p = stateFlows.mxToUs.get(selection.name)
    items = p
      ? [...p.entries()].map(([n, v]) => ({ name: n, value: v })).sort((a, b) => b.value - a.value).slice(0, 10)
      : []
  } else {
    title = selection.name
    subtitle = 'Connected'
    const us = portFlows.portToUs.get(selection.id) || new Map()
    const mx = portFlows.portToMx.get(selection.id) || new Map()
    items = [
      ...[...us.entries()].map(([n, v]) => ({ name: `${n} (US)`, value: v })),
      ...[...mx.entries()].map(([n, v]) => ({ name: `${n} (MX)`, value: v })),
    ].sort((a, b) => b.value - a.value).slice(0, 12)
  }

  return (
    <div className="absolute top-3 right-3 z-[1000] bg-white/95 border border-border-light rounded-lg shadow-lg px-3 py-2 max-w-[240px] max-h-[300px] overflow-y-auto text-sm">
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

/* ═══════════════════════════════════════════════════════════════════
   Year animation bar (below legend)
   ═══════════════════════════════════════════════════════════════════ */

function YearAnimationBar({ years, animYear, isPlaying, onYearChange, onPlayPause, onStop }) {
  if (!years.length) return null
  const minY = years[0]
  const maxY = years[years.length - 1]
  const curY = animYear ?? maxY

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-white/95 border-t border-border-light flex-shrink-0">
      {/* play / pause */}
      <button
        onClick={onPlayPause}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-blue text-white hover:bg-brand-blue/80 transition-colors cursor-pointer flex-shrink-0"
        title={isPlaying ? 'Pause' : 'Play year animation'}
      >
        {isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="2" y="1" width="3.5" height="12" rx="1" /><rect x="8.5" y="1" width="3.5" height="12" rx="1" /></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><polygon points="3,1 12,7 3,13" /></svg>
        )}
      </button>

      {/* stop */}
      {(isPlaying || animYear != null) && (
        <button
          onClick={onStop}
          className="flex items-center justify-center w-7 h-7 rounded bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors cursor-pointer flex-shrink-0"
          title="Reset to filter view"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><rect x="1" y="1" width="10" height="10" rx="1" /></svg>
        </button>
      )}

      <span className="font-bold text-brand-blue text-lg min-w-[3.5rem] text-center tabular-nums">
        {curY}
      </span>

      <input
        type="range"
        min={minY}
        max={maxY}
        step={1}
        value={curY}
        onChange={(e) => onYearChange(Number(e.target.value))}
        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-blue"
      />

      <span className="text-xs text-text-secondary flex-shrink-0 tabular-nums">
        {minY}&ndash;{maxY}
      </span>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Choropleth layer (reusable for US or MX)
   ═══════════════════════════════════════════════════════════════════ */

function ChoroplethLayer({
  geojsonUrl, data, nameProperty = 'name', colorRange, emptyColor,
  selection, highlightedStates, dynamicValues,
  formatValue, metricLabel, selectionType,
  setSelection, setTooltip, mapInstanceRef,
  highlightFeature = null, highlightColor = '#bf5700',
  arcSelection = null,
}) {
  const { geojson, loading } = useGeoJSON(geojsonUrl)
  const geoJsonRef = useRef(null)

  const effectiveValues = useMemo(
    () => dynamicValues || data,
    [data, dynamicValues],
  )

  const valueMap = useMemo(() => {
    const m = new Map()
    for (const d of effectiveValues) if (d.name && d.value != null) m.set(d.name, d.value)
    return m
  }, [effectiveValues])

  const colorScale = useMemo(() => {
    const vals = effectiveValues.map((d) => d.value).filter((v) => v != null && v > 0)
    if (!vals.length) return () => emptyColor
    return d3.scaleSequential().domain(d3.extent(vals)).interpolator(d3.interpolateRgb(colorRange[0], colorRange[1]))
  }, [effectiveValues, colorRange, emptyColor])

  const style = useCallback(
    (feature) => {
      const name = feature.properties?.[nameProperty]
      const value = valueMap.get(name)
      const fill = value != null && value > 0 ? colorScale(value) : emptyColor
      const isOrigin = selection?.type === selectionType && name === selection?.name
      if (highlightedStates) {
        return makeStateStyle(name, fill, emptyColor, highlightedStates, isOrigin)
      }
      // No active selection: apply optional highlight feature marker
      const isHL = highlightFeature && name === highlightFeature
      return {
        fillColor: fill,
        weight: isHL ? 3.5 : 1, opacity: isHL ? 1 : 0.7, color: isHL ? highlightColor : '#888', fillOpacity: 0.6,
      }
    },
    [nameProperty, valueMap, colorScale, emptyColor, highlightedStates, selection, selectionType, highlightFeature, highlightColor],
  )

  const onEachFeature = useCallback(
    (feature, layer) => {
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
          setTooltip({
            content: (
              <>
                <strong>{name || 'Unknown'}</strong><br />
                {value != null ? `${formatValue(value)} ${metricLabel}` : 'No data'}
                {!selection && (
                  <><br /><span style={{ fontSize: 11, color: '#666' }}>Click to explore trade flows</span></>
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
          setTooltip((prev) =>
            prev ? { ...prev, x: rect.left + pt.x, y: rect.top + pt.y - 12, latLng: [e.latlng.lat, e.latlng.lng] } : null,
          )
        },
        click: (e) => {
          e.originalEvent._stopped = true
          if (selection?.type === selectionType && selection.name === name) setSelection(null)
          else setSelection({ type: selectionType, name, id: name })
        },
      })
    },
    [nameProperty, valueMap, formatValue, metricLabel, highlightedStates, selection, selectionType, mapInstanceRef, setSelection, setTooltip],
  )

  const geoKey = useMemo(() => {
    const sel = selection ? `${selection.type}-${selection.id}` : 'none'
    const arc = arcSelection ? `${arcSelection.originName}|${arcSelection.destName}` : 'no-arc'
    return `${geojsonUrl}-${data.length}-${data.reduce((s, d) => s + (d.value || 0), 0).toFixed(0)}-${sel}-${arc}`
  }, [geojsonUrl, data, selection, arcSelection])

  if (loading || !geojson) return null

  return <GeoJSON key={geoKey} ref={geoJsonRef} data={geojson} style={style} onEachFeature={onEachFeature} />
}

/* ═══════════════════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════════════════ */

export default function TradeFlowChoropleth({
  data = [],
  yearFilter = [],
  valueField = 'TradeValue',
  formatValue = formatCurrencyDefault,
  center = [30, -100],
  zoom = 4,
  height = '580px',
  highlightFeature = null,
}) {
  const mapInstanceRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)
  const [mapActive, setMapActive] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const hintTimer = useRef(null)
  const [selection, setSelection] = useState(null)
  const [arcSelection, setArcSelection] = useState(null) // { originName, destName, usEndpoint, mxEndpoint } | null
  const arcSelectionRef = useRef(null)
  useEffect(() => { arcSelectionRef.current = arcSelection }, [arcSelection])

  const handleSetSelection = useCallback((sel) => {
    setSelection(sel)
    setArcSelection(null)
  }, [])

  /* ── flow mode toggle ──────────────────────────────────────────── */
  const [flowMode, setFlowMode] = useState('direct') // 'direct' | 'via-ports'

  /* ── animation state ───────────────────────────────────────────── */
  const [animYear, setAnimYear] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)

  /* ── year pop overlay state ─────────────────────────────────────── */
  const [popYear, setPopYear] = useState(null)
  const popTimerRef = useRef(null)
  const prevAnimYearRef = useRef(animYear)

  /* ── coordinate sources ────────────────────────────────────────── */
  const { portCoords } = usePortCoordinates()
  const { portCoords: stateCoords } = useStateCoordinates()
  const { geojson: mxGeojson } = useGeoJSON(`${BASE}data/mexican_states.geojson`)

  const mxCentroids = useMemo(() => (mxGeojson ? computeCentroids(mxGeojson) : {}), [mxGeojson])

  const usCentroids = useMemo(() => {
    if (!stateCoords) return {}
    const r = {}
    for (const [n, c] of Object.entries(stateCoords)) r[n] = [c.lat, c.lon]
    return r
  }, [stateCoords])

  const portCentroidLookup = useMemo(() => {
    if (!portCoords) return {}
    const r = {}
    for (const [code, c] of Object.entries(portCoords)) {
      if (c.lat != null && c.lon != null) r[code] = [c.lat, c.lon]
    }
    return r
  }, [portCoords])

  /* ── available years ───────────────────────────────────────────── */
  const years = useMemo(() => {
    const s = new Set(data.map((d) => d.Year).filter(Boolean))
    return [...s].sort((a, b) => a - b)
  }, [data])

  /* ── effective year (animation or parent filter) ───────────────── */
  const effectiveYears = useMemo(() => {
    if (animYear != null) return [String(animYear)]
    if (yearFilter?.length) return yearFilter
    return []
  }, [animYear, yearFilter])

  const filtered = useMemo(() => {
    if (!effectiveYears.length) return data
    return data.filter((d) => effectiveYears.includes(String(d.Year)))
  }, [data, effectiveYears])

  /* ── animation controls ────────────────────────────────────────── */
  useEffect(() => {
    if (!isPlaying || !years.length) return
    const timer = setInterval(() => {
      setAnimYear((y) => {
        const idx = years.indexOf(y ?? years[0])
        if (idx + 1 >= years.length) { setIsPlaying(false); return years[years.length - 1] }
        return years[idx + 1]
      })
    }, 1200)
    return () => clearInterval(timer)
  }, [isPlaying, years])

  const handlePlayPause = useCallback(() => {
    if (isPlaying) { setIsPlaying(false); return }
    if (animYear == null || animYear === years[years.length - 1]) setAnimYear(years[0])
    setIsPlaying(true)
  }, [isPlaying, animYear, years])

  const handleStop = useCallback(() => { setIsPlaying(false); setAnimYear(null) }, [])
  const handleYearChange = useCallback((y) => { setIsPlaying(false); setAnimYear(y) }, [])

  // Year pop overlay effect
  useEffect(() => {
    if (animYear != null && animYear !== prevAnimYearRef.current) {
      prevAnimYearRef.current = animYear
      setPopYear(animYear)
      clearTimeout(popTimerRef.current)
      popTimerRef.current = setTimeout(() => setPopYear(null), 800)
    }
    return () => clearTimeout(popTimerRef.current)
  }, [animYear])

  /* ── aggregate: US state totals ────────────────────────────────── */
  const usStateData = useMemo(() => {
    const m = new Map()
    filtered.forEach((d) => { if (d.State) m.set(d.State, (m.get(d.State) || 0) + (d[valueField] || 0)) })
    return Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [filtered, valueField])

  /* ── aggregate: MX state totals ────────────────────────────────── */
  const mxStateData = useMemo(() => {
    const m = new Map()
    filtered.forEach((d) => { if (d.MexState) m.set(d.MexState, (m.get(d.MexState) || 0) + (d[valueField] || 0)) })
    return Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [filtered, valueField])

  /* ── port bubble data ──────────────────────────────────────────── */
  const portData = useMemo(() => {
    if (!portCoords) return []
    return buildMapPorts(filtered, portCoords)
  }, [filtered, portCoords])
  const portMax = useMemo(() => Math.max(1, ...portData.map((p) => p.value || 0)), [portData])

  /* ── state-to-state flows ──────────────────────────────────────── */
  const stateFlows = useMemo(() => {
    const usToMx = new Map()
    const mxToUs = new Map()
    filtered.forEach((d) => {
      if (!d.State || !d.MexState) return
      const v = d[valueField] || 0
      if (!usToMx.has(d.State)) usToMx.set(d.State, new Map())
      const um = usToMx.get(d.State); um.set(d.MexState, (um.get(d.MexState) || 0) + v)
      if (!mxToUs.has(d.MexState)) mxToUs.set(d.MexState, new Map())
      const mu = mxToUs.get(d.MexState); mu.set(d.State, (mu.get(d.State) || 0) + v)
    })
    return { usToMx, mxToUs }
  }, [filtered, valueField])

  /* ── port flows ────────────────────────────────────────────────── */
  const portFlows = useMemo(() => {
    const portToUs = new Map()
    const portToMx = new Map()
    filtered.forEach((d) => {
      if (!d.PortCode) return
      const code = d.PortCode.replace(/\D/g, '')
      const v = d[valueField] || 0
      if (d.State) { if (!portToUs.has(code)) portToUs.set(code, new Map()); const m = portToUs.get(code); m.set(d.State, (m.get(d.State) || 0) + v) }
      if (d.MexState) { if (!portToMx.has(code)) portToMx.set(code, new Map()); const m = portToMx.get(code); m.set(d.MexState, (m.get(d.MexState) || 0) + v) }
    })
    return { portToUs, portToMx }
  }, [filtered, valueField])

  /* ── state-to-port-to-state flows (for "via ports" mode) ───────── */
  const statePortFlows = useMemo(() => {
    // US state → Map<portCode, { total, mxPartners: Map<mxState, value> }>
    const usVia = new Map()
    // MX state → Map<portCode, { total, usPartners: Map<usState, value> }>
    const mxVia = new Map()
    filtered.forEach((d) => {
      if (!d.State || !d.MexState || !d.PortCode) return
      const code = d.PortCode.replace(/\D/g, '')
      const v = d[valueField] || 0

      if (!usVia.has(d.State)) usVia.set(d.State, new Map())
      const up = usVia.get(d.State)
      if (!up.has(code)) up.set(code, { total: 0, mxPartners: new Map() })
      const upEntry = up.get(code)
      upEntry.total += v
      upEntry.mxPartners.set(d.MexState, (upEntry.mxPartners.get(d.MexState) || 0) + v)

      if (!mxVia.has(d.MexState)) mxVia.set(d.MexState, new Map())
      const mp = mxVia.get(d.MexState)
      if (!mp.has(code)) mp.set(code, { total: 0, usPartners: new Map() })
      const mpEntry = mp.get(code)
      mpEntry.total += v
      mpEntry.usPartners.set(d.State, (mpEntry.usPartners.get(d.State) || 0) + v)
    })
    return { usVia, mxVia }
  }, [filtered, valueField])

  /* ── selection-based highlighting ──────────────────────────────── */
  const { highlightedUS, highlightedMX, highlightedPorts, dynamicUSValues, dynamicMXValues } = useMemo(() => {
    const none = { highlightedUS: null, highlightedMX: null, highlightedPorts: null, dynamicUSValues: null, dynamicMXValues: null }
    if (!selection) return none

    let baseUS, baseMX, basePorts, baseDynUS, baseDynMX

    if (selection.type === 'us-state') {
      const mxP = stateFlows.usToMx.get(selection.name) || new Map()
      const ports = new Set()
      filtered.forEach((d) => { if (d.State === selection.name && d.PortCode) ports.add(d.PortCode.replace(/\D/g, '')) })
      baseUS = new Set([selection.name])
      baseMX = new Set(mxP.keys())
      basePorts = ports
      baseDynUS = null
      baseDynMX = [...mxP.entries()].map(([name, value]) => ({ name, value }))
    } else if (selection.type === 'mx-state') {
      const usP = stateFlows.mxToUs.get(selection.name) || new Map()
      const ports = new Set()
      filtered.forEach((d) => { if (d.MexState === selection.name && d.PortCode) ports.add(d.PortCode.replace(/\D/g, '')) })
      baseUS = new Set(usP.keys())
      baseMX = new Set([selection.name])
      basePorts = ports
      baseDynUS = [...usP.entries()].map(([name, value]) => ({ name, value }))
      baseDynMX = null
    } else if (selection.type === 'port') {
      const us = portFlows.portToUs.get(selection.id) || new Map()
      const mx = portFlows.portToMx.get(selection.id) || new Map()
      baseUS = new Set(us.keys())
      baseMX = new Set(mx.keys())
      basePorts = new Set([selection.id])
      baseDynUS = [...us.entries()].map(([name, value]) => ({ name, value }))
      baseDynMX = [...mx.entries()].map(([name, value]) => ({ name, value }))
    } else {
      return none
    }

    // When an arc is clicked, narrow the highlight to just that arc's state endpoints
    if (arcSelection) {
      const narrowUS = arcSelection.usEndpoint ? new Set([arcSelection.usEndpoint]) : baseUS
      const narrowMX = arcSelection.mxEndpoint ? new Set([arcSelection.mxEndpoint]) : baseMX
      return { highlightedUS: narrowUS, highlightedMX: narrowMX, highlightedPorts: basePorts, dynamicUSValues: baseDynUS, dynamicMXValues: baseDynMX }
    }

    return { highlightedUS: baseUS, highlightedMX: baseMX, highlightedPorts: basePorts, dynamicUSValues: baseDynUS, dynamicMXValues: baseDynMX }
  }, [selection, arcSelection, stateFlows, portFlows, filtered])

  /* ── flow arc lines ────────────────────────────────────────────── */
  const flowArcs = useMemo(() => {
    if (!selection) return []
    const arcs = []
    let maxVal = 0

    if (selection.type === 'us-state') {
      const startCoord = usCentroids[selection.name]
      if (!startCoord) return []

      if (flowMode === 'via-ports') {
        // State → Port → MX State
        const portMap = statePortFlows.usVia.get(selection.name)
        if (!portMap) return []
        const topPorts = [...portMap.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 5)
        topPorts.forEach(([code, info]) => {
          const portCoord = portCentroidLookup[code]
          if (!portCoord) return
          // State → Port arc
          arcs.push({ start: startCoord, end: portCoord, value: info.total, label: code, color: '#08519c', originName: selection.name, destName: code, usEndpoint: selection.name, mxEndpoint: null })
          if (info.total > maxVal) maxVal = info.total
          // Port → top MX states
          const topMx = [...info.mxPartners.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
          topMx.forEach(([mxState, val]) => {
            const mxCoord = mxCentroids[mxState]
            if (!mxCoord) return
            arcs.push({ start: portCoord, end: mxCoord, value: val, label: mxState, color: '#de2d26', originName: code, destName: mxState, usEndpoint: selection.name, mxEndpoint: mxState })
            if (val > maxVal) maxVal = val
          })
        })
      } else {
        // Direct: State → MX State
        const partners = stateFlows.usToMx.get(selection.name) || new Map()
        const sorted = [...partners.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
        sorted.forEach(([mxState, value]) => {
          const endCoord = mxCentroids[mxState]
          if (!endCoord) return
          arcs.push({ start: startCoord, end: endCoord, value, label: mxState, color: '#6b46c1', originName: selection.name, destName: mxState, usEndpoint: selection.name, mxEndpoint: mxState })
          if (value > maxVal) maxVal = value
        })
      }
    } else if (selection.type === 'mx-state') {
      const startCoord = mxCentroids[selection.name]
      if (!startCoord) return []

      if (flowMode === 'via-ports') {
        const portMap = statePortFlows.mxVia.get(selection.name)
        if (!portMap) return []
        const topPorts = [...portMap.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 5)
        topPorts.forEach(([code, info]) => {
          const portCoord = portCentroidLookup[code]
          if (!portCoord) return
          arcs.push({ start: startCoord, end: portCoord, value: info.total, label: code, color: '#de2d26', originName: selection.name, destName: code, usEndpoint: null, mxEndpoint: selection.name })
          if (info.total > maxVal) maxVal = info.total
          const topUs = [...info.usPartners.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
          topUs.forEach(([usState, val]) => {
            const usCoord = usCentroids[usState]
            if (!usCoord) return
            arcs.push({ start: portCoord, end: usCoord, value: val, label: usState, color: '#08519c', originName: code, destName: usState, usEndpoint: usState, mxEndpoint: selection.name })
            if (val > maxVal) maxVal = val
          })
        })
      } else {
        const partners = stateFlows.mxToUs.get(selection.name) || new Map()
        const sorted = [...partners.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
        sorted.forEach(([usState, value]) => {
          const endCoord = usCentroids[usState]
          if (!endCoord) return
          arcs.push({ start: startCoord, end: endCoord, value, label: usState, color: '#6b46c1', originName: selection.name, destName: usState, usEndpoint: usState, mxEndpoint: selection.name })
          if (value > maxVal) maxVal = value
        })
      }
    } else if (selection.type === 'port') {
      const pCoord = portCentroidLookup[selection.id]
      if (!pCoord) return []
      const us = portFlows.portToUs.get(selection.id) || new Map()
      const mx = portFlows.portToMx.get(selection.id) || new Map()
      ;[...us.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).forEach(([state, value]) => {
        const c = usCentroids[state]
        if (!c) return
        arcs.push({ start: pCoord, end: c, value, label: state, color: '#08519c', originName: selection.name, destName: state, usEndpoint: state, mxEndpoint: null })
        if (value > maxVal) maxVal = value
      })
      ;[...mx.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).forEach(([state, value]) => {
        const c = mxCentroids[state]
        if (!c) return
        arcs.push({ start: pCoord, end: c, value, label: state, color: '#de2d26', originName: selection.name, destName: state, usEndpoint: null, mxEndpoint: state })
        if (value > maxVal) maxVal = value
      })
    }

    return arcs.map((arc, i) => ({
      ...arc,
      points: computeArc(arc.start, arc.end, 0.15 + i * 0.015),
      weight: Math.max(1.5, Math.min(6, 1.5 + 4.5 * Math.sqrt(arc.value / (maxVal || 1)))),
      opacity: 0.8,
    }))
  }, [selection, flowMode, stateFlows, statePortFlows, portFlows, usCentroids, mxCentroids, portCentroidLookup])

  /* ── scroll hint ───────────────────────────────────────────────── */
  const handleWheel = useCallback(() => {
    if (!mapActive) {
      setShowHint(true)
      clearTimeout(hintTimer.current)
      hintTimer.current = setTimeout(() => setShowHint(false), 1500)
    }
  }, [mapActive])
  useEffect(() => () => clearTimeout(hintTimer.current), [])

  /* ── legend data ───────────────────────────────────────────────── */
  const usLegend = useMemo(() => {
    const v = usStateData.map((d) => d.value).filter((x) => x > 0)
    return v.length ? d3.extent(v) : null
  }, [usStateData])
  const mxLegend = useMemo(() => {
    const v = mxStateData.map((d) => d.value).filter((x) => x > 0)
    return v.length ? d3.extent(v) : null
  }, [mxStateData])

  /* ── empty state ───────────────────────────────────────────────── */
  if (!data.length) {
    return (
      <div style={{ minHeight: height }} className="flex items-center justify-center text-text-secondary">
        No trade flow data available.
      </div>
    )
  }

  /* ── render ────────────────────────────────────────────────────── */
  return (
    <>
      <div
        style={{ minHeight: height, width: '100%' }}
        className="port-map-container h-full flex flex-col rounded-lg overflow-hidden border border-border-light isolate"
        role="region"
        aria-label="Interactive trade flow map with year animation"
      >
        <div className="flex-1 relative" style={{ minHeight: 0 }} onWheel={handleWheel}>
          {/* Scroll hint overlay */}
          {showHint && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)', pointerEvents: 'none' }}>
              <span style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '8px 16px', borderRadius: 6, fontSize: 16 }}>
                Click the map to enable zooming
              </span>
            </div>
          )}

          {/* Year badge (during animation) */}
          {animYear != null && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[999] bg-brand-blue text-white px-5 py-1.5 rounded-full text-xl font-bold shadow-lg tabular-nums pointer-events-none">
              {animYear}
            </div>
          )}

          {/* Year pop overlay */}
          {popYear != null && (
            <div
              key={popYear}
              className="pointer-events-none absolute inset-0 z-[998] flex items-center justify-center"
            >
              <span
                className="text-brand-blue font-extrabold tabular-nums select-none"
                style={{
                  fontSize: 'clamp(60px, 10vw, 120px)',
                  opacity: 0,
                  animation: 'yearPop 0.8s ease-out forwards',
                }}
              >
                {popYear}
              </span>
            </div>
          )}

          {/* Selection panel */}
          <SelectionPanel selection={selection} stateFlows={stateFlows} portFlows={portFlows} formatValue={formatValue} />

          {/* Clear selection + flow-mode toggle — positioned below zoom controls */}
          {selection && (
            <div className="absolute left-2.5 z-[1000] flex flex-col gap-1.5" style={{ top: 130 }}>
              <button
                onClick={() => { setSelection(null); setArcSelection(null) }}
                className="bg-white/95 border border-border-light rounded-lg shadow-lg px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Clear selection
              </button>
              {(selection.type === 'us-state' || selection.type === 'mx-state') && (
                <button
                  onClick={() => setFlowMode((m) => (m === 'direct' ? 'via-ports' : 'direct'))}
                  className="bg-white/95 border border-border-light rounded-lg shadow-lg px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  {flowMode === 'direct' ? 'Show via ports' : 'Show direct flows'}
                </button>
              )}
            </div>
          )}

          <MapContainer center={center} zoom={zoom} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} scrollWheelZoom={false} zoomControl>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <ScrollWheelGuard onActiveChange={setMapActive} />
            <ResetZoomButton center={center} zoom={zoom} />
            <MapResizeHandler />
            <TooltipSync mapRef={mapInstanceRef} tooltip={tooltip} setTooltip={setTooltip} />
            <ArcPane />
            <PortPane />
            <MapClickReset onReset={() => { setSelection(null); setArcSelection(null) }} />

            {/* US states choropleth */}
            <ChoroplethLayer
              geojsonUrl={`${BASE}data/us_states.geojson`}
              data={usStateData}
              colorRange={['#deebf7', '#08519c']}
              emptyColor="#f0f0f0"
              selection={selection}
              highlightedStates={highlightedUS}
              dynamicValues={dynamicUSValues}
              formatValue={formatValue}
              metricLabel="Trade Value"
              selectionType="us-state"
              setSelection={handleSetSelection}
              setTooltip={setTooltip}
              mapInstanceRef={mapInstanceRef}
              highlightFeature={highlightFeature}
              arcSelection={arcSelection}
            />

            {/* Mexican states choropleth */}
            <ChoroplethLayer
              geojsonUrl={`${BASE}data/mexican_states.geojson`}
              data={mxStateData}
              colorRange={['#fee0d2', '#de2d26']}
              emptyColor="#f0f0f0"
              selection={selection}
              highlightedStates={highlightedMX}
              dynamicValues={dynamicMXValues}
              formatValue={formatValue}
              metricLabel="Trade Value"
              selectionType="mx-state"
              setSelection={handleSetSelection}
              setTooltip={setTooltip}
              mapInstanceRef={mapInstanceRef}
              arcSelection={arcSelection}
            />

            {/* Flow arc polylines */}
            {flowArcs.map((arc, i) => {
              const isArcSelected = arcSelection &&
                arcSelection.originName === arc.originName &&
                arcSelection.destName === arc.destName
              return (
                <Polyline
                  key={`arc-${i}-${arc.label}`}
                  positions={arc.points}
                  pathOptions={{
                    color: arc.color,
                    weight: isArcSelected ? arc.weight + 2.5 : arc.weight,
                    opacity: isArcSelected ? 1 : arc.opacity,
                    lineCap: 'round',
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
                            {formatValue(arc.value)} Trade Value
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
                      const cur = arcSelectionRef.current
                      const stillSelected = cur && cur.originName === arc.originName && cur.destName === arc.destName
                      if (!stillSelected) e.target.setStyle({ weight: arc.weight, opacity: arc.opacity })
                      setTooltip(null)
                    },
                    click: (e) => {
                      e.originalEvent._stopped = true
                      setArcSelection(isArcSelected ? null : { originName: arc.originName, destName: arc.destName, usEndpoint: arc.usEndpoint, mxEndpoint: arc.mxEndpoint, value: arc.value })
                    },
                  }}
                />
              )
            })}

            {/* Port bubbles */}
            {portData.filter((p) => p.lat != null && p.lng != null).map((p) => {
              const code = p.portCode?.replace(/\D/g, '')
              const isDimmed = highlightedPorts && !highlightedPorts.has(code)
              const isSelected = selection?.type === 'port' && selection.id === code
              const r = radiusScale(p.value, portMax)

              return (
                <CircleMarker
                  key={`port-${code}`}
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
                      setTooltip({
                        content: (
                          <>
                            <strong>{p.name}</strong> ({code})<br />
                            {formatValue(p.value)} Trade Value
                            {!selection && <><br /><span style={{ fontSize: 11, color: '#666' }}>Click to see port connections</span></>}
                          </>
                        ),
                        x: rect.left + pt.x, y: rect.top + pt.y - r - 8,
                        latLng: [p.lat, p.lng], offsetY: -r - 8,
                      })
                    },
                    mouseout: () => setTooltip(null),
                    click: (e) => {
                      e.originalEvent._stopped = true
                      if (selection?.type === 'port' && selection.id === code) handleSetSelection(null)
                      else handleSetSelection({ type: 'port', name: p.name, id: code })
                    },
                  }}
                />
              )
            })}
          </MapContainer>
        </div>

        {/* Legend bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 bg-white/90 text-base text-text-secondary border-t border-border-light flex-shrink-0" style={{ height: 'auto' }}>
          {usLegend && (
            <span className="flex items-center gap-2">
              <span className="font-medium text-text-primary text-xs">U.S. States</span>
              <span className="text-xs">{formatValue(usLegend[0])}</span>
              <span style={{ display: 'inline-block', width: 60, height: 10, borderRadius: 3, background: 'linear-gradient(to right, #deebf7, #08519c)', border: '1px solid #ccc' }} />
              <span className="text-xs">{formatValue(usLegend[1])}</span>
            </span>
          )}
          {mxLegend && (
            <span className="flex items-center gap-2">
              <span className="font-medium text-text-primary text-xs">Mexican States</span>
              <span className="text-xs">{formatValue(mxLegend[0])}</span>
              <span style={{ display: 'inline-block', width: 60, height: 10, borderRadius: 3, background: 'linear-gradient(to right, #fee0d2, #de2d26)', border: '1px solid #ccc' }} />
              <span className="text-xs">{formatValue(mxLegend[1])}</span>
            </span>
          )}
          <span className="border-l border-border-light pl-3 flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: '#0056a9' }} />
            <span className="text-xs">Border Port</span>
          </span>
          {flowArcs.length > 0 && (
            <span className="border-l border-border-light pl-3 flex items-center gap-3">
              {(() => {
                const colors = new Set(flowArcs.map((a) => a.color))
                const items = []
                if (colors.has('#08519c')) items.push({ color: '#08519c', label: 'U.S. State Flow' })
                if (colors.has('#de2d26')) items.push({ color: '#de2d26', label: 'MX State Flow' })
                if (colors.has('#6b46c1')) items.push({ color: '#6b46c1', label: 'Direct Flow' })
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
            Click a state or port to explore flows
          </span>
        </div>

        {/* Year animation timeline */}
        <YearAnimationBar
          years={years}
          animYear={animYear}
          isPlaying={isPlaying}
          onYearChange={handleYearChange}
          onPlayPause={handlePlayPause}
          onStop={handleStop}
        />
      </div>

      <MapTooltip tooltip={tooltip} />
    </>
  )
}
