/**
 * ── ChoroplethMap.jsx ───────────────────────────────────────────────────
 * Leaflet choropleth map that fills state/region polygons with color
 * intensity based on a numeric value (e.g., trade value).
 *
 * Props:
 *   geojsonUrl    — URL to fetch GeoJSON FeatureCollection
 *   data          — Array of { name, value } where name matches a GeoJSON feature property
 *   nameProperty  — GeoJSON feature.properties key to match against data[].name (default "name")
 *   formatValue   — Formatter function (default formatCurrency)
 *   metricLabel   — String for legend/tooltip (default "Trade Value")
 *   colorRange    — [lowColor, highColor] for interpolation (default blue scale)
 *   emptyColor    — Fill for features with no data (default "#f0f0f0")
 *   center        — [lat, lng]
 *   zoom          — Number
 *   height        — CSS height string (default "500px")
 *   title         — Label shown in the legend (e.g., "U.S. States", "Mexican States")
 */
import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import * as d3 from 'd3'
import 'leaflet/dist/leaflet.css'

import {
  ScrollWheelGuard,
  MapResizeHandler,
  ResetZoomButton,
  TooltipSync,
  formatCurrencyDefault,
} from './mapHelpers'

// Cache fetched GeoJSON to avoid re-fetching on re-renders
const geoCache = {}

function useGeoJSON(url) {
  const [geojson, setGeojson] = useState(geoCache[url] || null)
  const [loading, setLoading] = useState(!geoCache[url])

  useEffect(() => {
    if (geoCache[url]) { setGeojson(geoCache[url]); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        geoCache[url] = data
        if (!cancelled) { setGeojson(data); setLoading(false) }
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [url])

  return { geojson, loading }
}

/** Fits map bounds to GeoJSON extent on first load */
function FitBounds({ geojson }) {
  const map = useMap()
  useEffect(() => {
    if (!geojson) return
    const L = window.L || map.options?.L
    if (!L) return
    try {
      const layer = L.geoJSON(geojson)
      const bounds = layer.getBounds()
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] })
    } catch { /* ignore invalid geojson */ }
  }, [geojson, map])
  return null
}

export default function ChoroplethMap({
  geojsonUrl,
  data = [],
  nameProperty = 'name',
  formatValue = formatCurrencyDefault,
  metricLabel = 'Trade Value',
  colorRange = ['#deebf7', '#08519c'],
  emptyColor = '#f0f0f0',
  center = [39.5, -98.0],
  zoom = 4,
  height = '500px',
  title = 'States',
  highlightFeature = null,   // Name of a feature to highlight with a bold border
  highlightColor = '#bf5700', // Border color for the highlighted feature
}) {
  const mapInstanceRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)
  const [mapActive, setMapActive] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const hintTimer = useRef(null)
  const geoJsonRef = useRef(null)

  const { geojson, loading } = useGeoJSON(geojsonUrl)

  // Build lookup: name -> value
  const valueMap = useMemo(() => {
    const m = new Map()
    for (const d of data) {
      if (d.name && d.value != null) m.set(d.name, d.value)
    }
    return m
  }, [data])

  // Color scale
  const colorScale = useMemo(() => {
    const values = data.map((d) => d.value).filter((v) => v != null && v > 0)
    if (!values.length) return () => emptyColor
    const extent = d3.extent(values)
    return d3.scaleSequential()
      .domain(extent)
      .interpolator(d3.interpolateRgb(colorRange[0], colorRange[1]))
  }, [data, colorRange, emptyColor])

  // Style function for GeoJSON features
  const style = useCallback((feature) => {
    const name = feature.properties?.[nameProperty]
    const value = valueMap.get(name)
    const isHighlighted = highlightFeature && name === highlightFeature
    return {
      fillColor: value != null && value > 0 ? colorScale(value) : emptyColor,
      weight: isHighlighted ? 3.5 : 1,
      opacity: isHighlighted ? 1 : 0.8,
      color: isHighlighted ? highlightColor : '#666',
      fillOpacity: 0.75,
    }
  }, [nameProperty, valueMap, colorScale, emptyColor, highlightFeature, highlightColor])

  // Interaction handlers for each feature
  const onEachFeature = useCallback((feature, layer) => {
    const name = feature.properties?.[nameProperty]
    const value = valueMap.get(name)
    layer.on({
      mouseover: (e) => {
        const target = e.target
        target.setStyle({ weight: 2, color: '#333', fillOpacity: 0.9 })
        target.bringToFront()

        const map = mapInstanceRef.current
        if (!map) return
        const latlng = e.latlng
        const pt = map.latLngToContainerPoint(latlng)
        const rect = map.getContainer().getBoundingClientRect()
        setTooltip({
          content: (
            <>
              <strong>{name || 'Unknown'}</strong>
              <br />
              {value != null ? `${formatValue(value)} ${metricLabel}` : 'No data'}
            </>
          ),
          x: rect.left + pt.x,
          y: rect.top + pt.y - 12,
          latLng: [latlng.lat, latlng.lng],
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
        setTooltip((prev) =>
          prev ? { ...prev, x: rect.left + pt.x, y: rect.top + pt.y - 12, latLng: [e.latlng.lat, e.latlng.lng] } : null
        )
      },
    })
  }, [nameProperty, valueMap, formatValue, metricLabel])

  const handleWheel = useCallback(() => {
    if (!mapActive) {
      setShowHint(true)
      clearTimeout(hintTimer.current)
      hintTimer.current = setTimeout(() => setShowHint(false), 1500)
    }
  }, [mapActive])

  useEffect(() => () => clearTimeout(hintTimer.current), [])

  // Legend gradient stops
  const legendStops = useMemo(() => {
    const values = data.map((d) => d.value).filter((v) => v != null && v > 0)
    if (!values.length) return null
    const [min, max] = d3.extent(values)
    return { min, max }
  }, [data])

  // Force GeoJSON re-render when data changes by using a key
  const geoKey = useMemo(() => {
    return `${geojsonUrl}-${data.length}-${data.reduce((s, d) => s + (d.value || 0), 0)}`
  }, [geojsonUrl, data])

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
        aria-label={`Choropleth map showing ${metricLabel} by ${title}`}
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

            {geojson && (
              <GeoJSON
                key={geoKey}
                ref={geoJsonRef}
                data={geojson}
                style={style}
                onEachFeature={onEachFeature}
              />
            )}
          </MapContainer>
        </div>

        {/* Gradient legend */}
        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 bg-white/90 text-base text-text-secondary border-t border-border-light flex-shrink-0"
          style={{ height: 'auto' }}
        >
          <span className="font-medium text-text-primary">{title}</span>
          {legendStops && (
            <span className="flex items-center gap-2">
              <span className="text-xs">{formatValue(legendStops.min)}</span>
              <span
                style={{
                  display: 'inline-block',
                  width: 100,
                  height: 12,
                  borderRadius: 3,
                  background: `linear-gradient(to right, ${colorRange[0]}, ${colorRange[1]})`,
                  border: '1px solid #ccc',
                }}
              />
              <span className="text-xs">{formatValue(legendStops.max)}</span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: emptyColor, border: '1px solid #ccc' }}
            />
            <span className="text-xs">No data</span>
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
