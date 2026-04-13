/**
 * mapShared.jsx
 *
 * Single source of truth for utilities and components shared across all
 * Leaflet map components (ChoroplethPortMap, TradeFlowChoropleth,
 * InteractiveFlowMap).
 *
 * Exports
 * ───────
 *  Hooks        : useGeoJSON
 *  Utilities    : computeArc, computeCentroids, radiusScale, makeStateStyle
 *  Components   : ArcPane, PortPane, MapClickReset, MapTooltip
 */
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useMap, useMapEvents } from 'react-leaflet'

/* ── GeoJSON fetch + cache ────────────────────────────────────────────── */

export const geoCache = {}

export function useGeoJSON(url) {
  const [geojson, setGeojson] = useState(geoCache[url] || null)
  const [loading, setLoading] = useState(!geoCache[url])
  useEffect(() => {
    if (!url) { setLoading(false); return }
    if (geoCache[url]) { setGeojson(geoCache[url]); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetch(url)
      .then((r) => r.json())
      .then((data) => { geoCache[url] = data; if (!cancelled) { setGeojson(data); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [url])
  return { geojson, loading }
}

/* ── Geometry utilities ───────────────────────────────────────────────── */

/** Quadratic Bézier arc between two [lat, lng] points. */
export function computeArc(start, end, curveOffset = 0.18, numPoints = 24) {
  const dx = end[1] - start[1]
  const dy = end[0] - start[0]
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 0.01) return [start, end]
  const midLat = (start[0] + end[0]) / 2 + (dx / dist) * dist * curveOffset
  const midLng = (start[1] + end[1]) / 2 - (dy / dist) * dist * curveOffset
  const pts = []
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints
    const u = 1 - t
    pts.push([
      u * u * start[0] + 2 * u * t * midLat + t * t * end[0],
      u * u * start[1] + 2 * u * t * midLng + t * t * end[1],
    ])
  }
  return pts
}

/** Compute polygon centroids from a GeoJSON FeatureCollection. */
export function computeCentroids(geojson, nameProperty = 'name') {
  if (!geojson?.features) return {}
  const out = {}
  for (const f of geojson.features) {
    const name = f.properties?.[nameProperty]
    if (!name) continue
    const coords = []
    const g = f.geometry
    if (g?.type === 'Polygon') g.coordinates[0].forEach((c) => coords.push(c))
    else if (g?.type === 'MultiPolygon') g.coordinates.forEach((p) => p[0].forEach((c) => coords.push(c)))
    if (coords.length) {
      out[name] = [
        coords.reduce((s, c) => s + c[1], 0) / coords.length,
        coords.reduce((s, c) => s + c[0], 0) / coords.length,
      ]
    }
  }
  return out
}

/**
 * Scale a port bubble radius.
 * @param {number} value
 * @param {number} maxValue
 * @param {number} [min=4]  minimum radius
 * @param {number} [max=20] maximum radius
 * @param {number} [mult=16] scaling multiplier
 */
export function radiusScale(value, maxValue, min = 4, max = 20, mult = 16) {
  if (!maxValue || !value) return min
  return Math.max(min, Math.min(max, min + mult * Math.sqrt(value / maxValue)))
}

/* ── State feature style helper ───────────────────────────────────────── */

/**
 * Build a Leaflet path style for a state feature.
 *
 * When a selection is active:
 *  - Origin (selected) state → thick amber border (#d97706)
 *  - Destination (partner) states → standard dark border (#333)
 *  - All other states → dimmed (grey, low opacity)
 *
 * @param {string}    name              GeoJSON feature name
 * @param {string}    fill              Computed fill colour from the colour scale
 * @param {string}    emptyColor        Fallback fill when no data
 * @param {Set|null}  highlightedStates Active highlight set (null = no selection active)
 * @param {boolean}   isOrigin          True if this feature is the selected origin
 */
export function makeStateStyle(name, fill, emptyColor, highlightedStates, isOrigin) {
  if (highlightedStates) {
    if (!highlightedStates.has(name))
      return { fillColor: emptyColor, weight: 0.8, opacity: 0.4, color: '#aaa', fillOpacity: 0.25 }
    if (isOrigin)
      return { fillColor: fill || emptyColor, weight: 4, opacity: 1, color: '#d97706', fillOpacity: 0.9 }
    return { fillColor: fill || emptyColor, weight: 2.5, opacity: 1, color: '#333', fillOpacity: 0.85 }
  }
  return { fillColor: fill || emptyColor, weight: 1, opacity: 0.7, color: '#888', fillOpacity: 0.6 }
}

/* ── Custom Leaflet panes ─────────────────────────────────────────────── */

/** Custom pane for flow arc lines — sits above state polygons (620) but below port circles (650). */
export function ArcPane() {
  const map = useMap()
  useEffect(() => {
    if (!map.getPane('flowArcs')) {
      const pane = map.createPane('flowArcs')
      pane.style.zIndex = '620'
    }
  }, [map])
  return null
}

/** Custom pane for port marker circles — always on top of states and arcs. */
export function PortPane() {
  const map = useMap()
  useEffect(() => {
    if (!map.getPane('portMarkers')) {
      const pane = map.createPane('portMarkers')
      pane.style.zIndex = '650'
    }
  }, [map])
  return null
}

/* ── Click-away reset ─────────────────────────────────────────────────── */

/**
 * Resets selection when the user clicks empty map space.
 * Skips reset when the click was already consumed by a feature
 * (GeoJSON polygon, port circle, or arc line) which marks
 * e.originalEvent._stopped = true.
 */
export function MapClickReset({ onReset }) {
  useMapEvents({
    click: (e) => {
      if (e.originalEvent?._stopped) return
      onReset()
    },
  })
  return null
}

/* ── Portal tooltip ───────────────────────────────────────────────────── */

/** Fixed-position tooltip rendered via a portal to document.body. */
export function MapTooltip({ tooltip }) {
  if (!tooltip) return null
  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: tooltip.x,
        top: tooltip.y,
        transform: 'translate(-50%, -100%)',
        background: 'rgba(255,255,255,0.97)',
        border: '1px solid #ddd',
        borderRadius: 6,
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        padding: '6px 10px',
        fontSize: 13,
        fontFamily: 'inherit',
        pointerEvents: 'none',
        zIndex: 10000,
        whiteSpace: 'nowrap',
        maxWidth: 260,
      }}
    >
      {tooltip.content}
    </div>,
    document.body,
  )
}
