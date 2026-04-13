import { useMemo, useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, DollarSign, ArrowRight, Database, Layers,
  ArrowRightLeft, MapPin, BarChart3, Truck, Package, Award, PieChart,
  Globe, Map as MapIcon, Scale, ArrowUpDown, Lightbulb,
} from 'lucide-react'
import { useTransborderStore } from '@/stores/transborderStore'
import { CHART_COLORS, getMetricField, getMetricFormatter, getMetricLabel, hasSurfaceExports, isAllSurfaceExports } from '@/lib/chartColors'
import { generateInsights } from '@/lib/insightEngine'
import MetricToggle from '@/components/filters/MetricToggle'
import YearRangeFilter from '@/components/filters/YearRangeFilter'
import TopNSelector from '@/components/filters/TopNSelector'
import { PORT_REGION_MAP } from '@/lib/portUtils'
import { usePortCoordinates, useCanadianPortCoordinates, buildMapPorts } from '@/hooks/usePortMapData'
import HeroStardust from '@/components/ui/HeroStardust'
import InsightCallout from '@/components/ui/InsightCallout'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import StatCard from '@/components/ui/StatCard'
import LineChart from '@/components/charts/LineChart'
import BarChart from '@/components/charts/BarChart'
import StackedBarChart from '@/components/charts/StackedBarChart'
import ChoroplethPortMap from '@/components/maps/ChoroplethPortMap'
import { DL, PAGE_TRANSBORDER_COLS } from '@/lib/downloadColumns'

import { ANNOTATIONS_FULL as HISTORICAL_ANNOTATIONS } from '@/lib/annotations'

/* ── Icon lookup for insightEngine string → component ────────────────── */
const ICON_MAP = {
  TrendingUp, TrendingDown, DollarSign, ArrowRight, Database, Layers,
  ArrowRightLeft, MapPin, BarChart3, Truck, Package, Award, PieChart,
  Globe, Map: MapIcon, Scale, ArrowUpDown, Lightbulb,
}

/* ── Country filter options ──────────────────────────────────────────── */
const COUNTRY_OPTIONS = [
  { value: '', label: 'All (Mexico + Canada)' },
  { value: 'Mexico', label: 'Mexico' },
  { value: 'Canada', label: 'Canada' },
]

/* ── Inline country select for chart headers ───────────────────────── */
function CountrySelect({ value, onChange, id }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-border-light bg-white px-2 py-1 text-sm text-text-primary
                 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue"
      aria-label="Filter by trading partner"
    >
      {COUNTRY_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

/* ── Map color scheme ────────────────────────────────────────────────── */
const MAP_GROUP_COLORS = {
  texas:  { fill: '#d97706', stroke: '#92400e' },  // amber — TX-Mexico ports (focus)
  mexico: { fill: '#0056a9', stroke: '#003d75' },  // blue — other Mexico border ports
  canada: { fill: '#16a34a', stroke: '#166534' },  // green — Canada border ports
}
const MAP_LEGEND = [
  { label: 'Texas-Mexico Port', color: '#d97706' },
  { label: 'Other Mexico Border Port', color: '#0056a9' },
  { label: 'Canada Border Port', color: '#16a34a' },
]

export default function OverviewPage() {
  const { usTransborder, usMexicoPorts, usCanadaPorts, usStateTrade, odStateFlows, odCanadaProvFlows, loading, loadDataset } = useTransborderStore()

  /* ── metric toggle state ──────────────────────────────────────── */
  const [metric, setMetric] = useState('value')
  const valueField = getMetricField(metric)
  const fmtValue = getMetricFormatter(metric)
  const metricLabel = getMetricLabel(metric)

  /* ── global filters ────────────────────────────────────────────── */
  const [tradeTypeFilter, setTradeTypeFilter] = useState('')   // Export/Import
  const [modeFilterArr, setModeFilterArr] = useState([])       // multi-select mode

  /* ── country filter state (per-section) ───────────────────────── */
  const [countryFilter, setCountryFilter] = useState('')      // stat cards
  const [trendCountry, setTrendCountry] = useState('')         // line chart
  const [modeCountry, setModeCountry] = useState('')           // donut chart

  /* ── chart-level controls ────────────────────────────────────── */
  const [trendYearRange, setTrendYearRange] = useState(null)   // { startYear, endYear }
  const [stackYearRange, setStackYearRange] = useState(null)   // { startYear, endYear }

  /* ── map-local year selector (independent of page filters) ──── */
  const [mapYear, setMapYear] = useState('')
  const mapYears = useMemo(() => {
    if (!usStateTrade?.length) return []
    return [...new Set(usStateTrade.map((d) => d.Year).filter(Number.isFinite))].sort((a, b) => a - b)
  }, [usStateTrade])
  useEffect(() => {
    if (mapYears.length && !mapYear) setMapYear(String(mapYears[mapYears.length - 1]))
  }, [mapYears])

  /* ── lazy-load port + state data for map ───────────────────────── */
  useEffect(() => {
    loadDataset('usMexicoPorts')
    loadDataset('usCanadaPorts')
    loadDataset('usStateTrade')
    loadDataset('odStateFlows')
    loadDataset('odCanadaProvFlows')
  }, [loadDataset])

  const { portCoords: mxCoords } = usePortCoordinates()
  const { portCoords: caCoords } = useCanadianPortCoordinates()

  /* ── Build map markers with group labels ───────────────────────── */
  const mapPorts = useMemo(() => {
    const mx = usMexicoPorts?.length ? buildMapPorts(usMexicoPorts, mxCoords) : []
    const ca = usCanadaPorts?.length ? buildMapPorts(usCanadaPorts, caCoords) : []

    // Tag Mexico ports: Texas ones get 'texas', others get 'mexico'
    for (const p of mx) {
      p.group = PORT_REGION_MAP[p.name] ? 'texas' : 'mexico'
    }
    for (const p of ca) {
      p.group = 'canada'
    }
    return [...mx, ...ca]
  }, [usMexicoPorts, usCanadaPorts, mxCoords, caCoords])

  /* ── Choropleth: US states by trade (map-year, metric-aware) ────── */
  const stateMapData = useMemo(() => {
    if (!usStateTrade?.length) return []
    const yr = Number(mapYear)
    const byState = new Map()
    for (const d of usStateTrade) {
      if (yr && d.Year !== yr) continue
      const st = d.State
      if (!st || st === 'Unknown') continue
      byState.set(st, (byState.get(st) || 0) + (d[valueField] || 0))
    }
    return Array.from(byState, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [usStateTrade, mapYear, valueField])

  /* ── Choropleth: Mexican states by trade (map-year, metric-aware) ── */
  const mexStateMapData = useMemo(() => {
    if (!odStateFlows?.length) return []
    const yr = Number(mapYear)
    const byState = new Map()
    for (const d of odStateFlows) {
      if (yr && d.Year !== yr) continue
      const st = d.MexState
      if (!st || st === 'Unknown') continue
      byState.set(st, (byState.get(st) || 0) + (d[valueField] || 0))
    }
    return Array.from(byState, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [odStateFlows, mapYear, valueField])

  /* ── Choropleth: Canadian provinces by trade (map-year, metric-aware) */
  const canProvMapData = useMemo(() => {
    if (!odCanadaProvFlows?.length) return []
    const yr = Number(mapYear)
    const byProv = new Map()
    for (const d of odCanadaProvFlows) {
      if (yr && d.Year !== yr) continue
      const prov = d.CanProv
      if (!prov || prov === 'Unknown') continue
      byProv.set(prov, (byProv.get(prov) || 0) + (d[valueField] || 0))
    }
    return Array.from(byProv, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [odCanadaProvFlows, mapYear, valueField])

  /* ── Map layers config ─────────────────────────────────────────── */
  const mapLayers = useMemo(() => {
    const base = import.meta.env.BASE_URL
    const result = []
    if (stateMapData.length) {
      result.push({ url: `${base}data/us_states.geojson`, data: stateMapData, nameProperty: 'name', colorRange: ['#deebf7', '#08519c'], title: 'U.S. States' })
    }
    if (mexStateMapData.length) {
      result.push({ url: `${base}data/mexican_states.geojson`, data: mexStateMapData, nameProperty: 'name', colorRange: ['#fee0d2', '#de2d26'], title: 'Mexican States' })
    }
    result.push({ url: `${base}data/canadian_provinces.geojson`, data: canProvMapData, nameProperty: 'name', colorRange: ['#e5f5e0', '#31a354'], title: 'Canadian Provinces' })
    return result
  }, [stateMapData, mexStateMapData, canProvMapData])

  /* ── Connections: US state ↔ port, MX/CA state ↔ port (map-year, metric-aware) */
  const mapConnections = useMemo(() => {
    const yr = Number(mapYear)
    const stateToPort = new Map()   // stateName → Map<portCode, value>
    const portToState = new Map()   // portCode → Map<stateName, value>

    const addConnection = (name, code, val) => {
      if (!stateToPort.has(name)) stateToPort.set(name, new Map())
      const sp = stateToPort.get(name)
      sp.set(code, (sp.get(code) || 0) + val)
      if (!portToState.has(code)) portToState.set(code, new Map())
      const ps = portToState.get(code)
      ps.set(name, (ps.get(name) || 0) + val)
    }

    if (odStateFlows?.length) {
      for (const d of odStateFlows) {
        if (yr && d.Year !== yr) continue
        if (!d.PortCode) continue
        const code = d.PortCode.replace(/\D/g, '')
        const val = d[valueField] || 0
        if (d.State && d.State !== 'Unknown') addConnection(d.State, code, val)
        if (d.MexState && d.MexState !== 'Unknown') addConnection(d.MexState, code, val)
      }
    }

    if (odCanadaProvFlows?.length) {
      for (const d of odCanadaProvFlows) {
        if (yr && d.Year !== yr) continue
        if (!d.PortCode) continue
        const code = d.PortCode.replace(/\D/g, '')
        const val = d[valueField] || 0
        if (d.State && d.State !== 'Unknown') addConnection(d.State, code, val)
        if (d.CanProv && d.CanProv !== 'Unknown') addConnection(d.CanProv, code, val)
      }
    }

    return { stateToPort, portToState }
  }, [odStateFlows, odCanadaProvFlows, mapYear, valueField])

  /* ── filtered data based on country + mode + trade type selection ── */
  const filteredData = useMemo(() => {
    if (!usTransborder?.length) return []
    let data = usTransborder
    if (countryFilter) data = data.filter((d) => d.Country === countryFilter)
    if (tradeTypeFilter) data = data.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilterArr.length) data = data.filter((d) => modeFilterArr.includes(d.Mode))
    return data
  }, [usTransborder, countryFilter, tradeTypeFilter, modeFilterArr])

  /* ── Derived year bounds (always from full dataset) ──────────────── */
  const latestYear = useMemo(() => {
    if (!usTransborder?.length) return null
    return Math.max(...usTransborder.map((d) => d.Year).filter(Number.isFinite))
  }, [usTransborder])

  const minYear = useMemo(() => {
    if (!usTransborder?.length) return null
    return Math.min(...usTransborder.map((d) => d.Year).filter(Number.isFinite))
  }, [usTransborder])

  /* ── Insight cards ───────────────────────────────────────────────── */
  const insights = useMemo(() => {
    if (!usTransborder?.length || !latestYear) return []
    try {
      return generateInsights(usTransborder, { scope: 'overview', latestYear })
    } catch {
      return []
    }
  }, [usTransborder, latestYear])

  /* ── StatCard computations ───────────────────────────────────────── */
  const stats = useMemo(() => {
    if (!filteredData.length || !latestYear) return null
    const latestRows = filteredData.filter((d) => d.Year === latestYear)

    const sum = (rows) => rows.reduce((s, d) => s + (d[valueField] || 0), 0)

    const totalLatest = sum(latestRows)
    const exportRows = latestRows.filter((d) => /export/i.test(d.TradeType))
    const exports = sum(exportRows)
    const imports = sum(latestRows.filter((d) => /import/i.test(d.TradeType)))
    const tradeBalance = exports - imports
    const exportWeightNA = metric === 'weight' && hasSurfaceExports(exportRows)
    const totalWeightNA = metric === 'weight' && isAllSurfaceExports(latestRows)

    return { totalLatest, exports, imports, tradeBalance, exportWeightNA, totalWeightNA }
  }, [filteredData, latestYear, valueField])

  /* ── Per-chart filtered data (apply global mode/tradeType + chart-level country) ── */
  const applyGlobalFilters = useCallback((data) => {
    let d = data
    if (tradeTypeFilter) d = d.filter((r) => r.TradeType === tradeTypeFilter)
    if (modeFilterArr.length) d = d.filter((r) => modeFilterArr.includes(r.Mode))
    return d
  }, [tradeTypeFilter, modeFilterArr])

  const trendFiltered = useMemo(() => {
    if (!usTransborder?.length) return []
    let data = usTransborder
    if (trendCountry) data = data.filter((d) => d.Country === trendCountry)
    return applyGlobalFilters(data)
  }, [usTransborder, trendCountry, applyGlobalFilters])

  const modeFiltered = useMemo(() => {
    if (!usTransborder?.length) return []
    let data = usTransborder
    if (modeCountry) data = data.filter((d) => d.Country === modeCountry)
    return applyGlobalFilters(data)
  }, [usTransborder, modeCountry, applyGlobalFilters])

  /* ── Available years for year-range selectors ─────────────────── */
  const availableYears = useMemo(() => {
    if (!usTransborder?.length) return []
    const yrs = [...new Set(usTransborder.map((d) => d.Year).filter(Number.isFinite))].sort((a, b) => a - b)
    return yrs
  }, [usTransborder])

  /* ── Mode + Trade Type options for filters ─────────────────────── */
  const modeOptions = useMemo(() => {
    if (!usTransborder?.length) return []
    return [...new Set(usTransborder.map((d) => d.Mode).filter(Boolean))].sort()
  }, [usTransborder])

  const tradeTypeOptions = useMemo(() => {
    if (!usTransborder?.length) return []
    return [...new Set(usTransborder.map((d) => d.TradeType).filter(Boolean))].sort()
  }, [usTransborder])

  /* ── LineChart: Annual trade trends (Exports vs Imports) ─────────── */
  const trendData = useMemo(() => {
    if (!trendFiltered.length) return []
    const startYr = trendYearRange?.startYear ?? minYear
    const endYr = trendYearRange?.endYear ?? latestYear
    const map = {}
    for (const d of trendFiltered) {
      const yr = d.Year
      if (yr < startYr || yr > endYr) continue
      const type = /export/i.test(d.TradeType) ? 'Exports' : /import/i.test(d.TradeType) ? 'Imports' : null
      if (!yr || !type) continue
      const key = `${yr}_${type}`
      if (!map[key]) map[key] = { year: yr, value: 0, series: type }
      map[key].value += d[valueField] || 0
    }
    return Object.values(map).sort((a, b) => a.year - b.year || a.series.localeCompare(b.series))
  }, [trendFiltered, valueField, trendYearRange, minYear, latestYear])

  /* ── DonutChart: Trade by Mode (latest year) ─────────────────────── */
  const modeData = useMemo(() => {
    if (!modeFiltered.length || !latestYear) return []
    const map = {}
    for (const d of modeFiltered) {
      if (d.Year !== latestYear || !d.Mode) continue
      map[d.Mode] = (map[d.Mode] || 0) + (d[valueField] || 0)
    }
    return Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [modeFiltered, latestYear, valueField])

  /* ── StackedBarChart: Canada vs Mexico trade by year ─────────────── */
  const countryStackData = useMemo(() => {
    if (!usTransborder?.length) return { data: [], keys: [] }
    const startYr = stackYearRange?.startYear ?? minYear
    const endYr = stackYearRange?.endYear ?? latestYear
    const map = {}
    const countries = new Set()
    for (const d of usTransborder) {
      if (!d.Year || !d.Country) continue
      if (d.Year < startYr || d.Year > endYr) continue
      countries.add(d.Country)
      if (!map[d.Year]) map[d.Year] = { year: d.Year }
      map[d.Year][d.Country] = (map[d.Year][d.Country] || 0) + (d[valueField] || 0)
    }
    const keys = [...countries].sort()
    const data = Object.values(map).sort((a, b) => a.year - b.year)
    // Ensure every row has every key
    for (const row of data) {
      for (const k of keys) {
        if (!(k in row)) row[k] = 0
      }
    }
    return { data, keys }
  }, [usTransborder, valueField, stackYearRange, minYear, latestYear])

  /* ── Loading state ───────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-base text-text-secondary">Loading TransBorder freight data...</p>
        </div>
      </div>
    )
  }

  /* ── Navigation page cards ───────────────────────────────────────── */
  const navPages = [
    {
      path: '/us-mexico',
      title: 'U.S.--Mexico Trade',
      desc: 'All U.S. ports of entry on the Mexican border — trade totals, port rankings, mode breakdown, and trends. Covers Arizona, California, New Mexico, and Texas.',
      Icon: ArrowRightLeft,
    },
    {
      path: '/texas-mexico',
      title: 'Texas--Mexico Trade',
      desc: 'Deep dive into Texas border ports: port analysis, commodity flows, transportation modes, monthly patterns, and Mexican state trading partners.',
      Icon: MapPin,
    },
  ]

  return (
    <>
      {/* ── Hero with embedded map ──────────────────────────────────── */}
      <div className="gradient-blue text-white relative overflow-visible">
        <HeroStardust seed={42} animate tall />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          {/* Intro text — title + subtitle stacked */}
          <div className="pt-7 pb-3 md:pt-9 md:pb-4">
            <h2 className="text-2xl md:text-3xl font-bold text-white text-balance">
              U.S. TransBorder Freight Data ({minYear || 1993}--{latestYear || 2025})
            </h2>
            <p className="text-white/70 mt-2 text-sm md:text-base leading-relaxed">
              U.S. border trade has grown 5&times; since NAFTA began — and Texas handles two-thirds of the Mexico side.
              This dashboard covers surface, air, vessel, and pipeline freight flows using the only public data source
              with port-level detail on North American trade.
            </p>
          </div>
          {/* Map — large, full-width within hero */}
          <div className="pb-4 md:pb-5">
            {/* Year selector for map */}
            <div className="flex items-center gap-2 mb-2">
              <label htmlFor="overview-map-year" className="text-white/70 text-sm font-medium">Year</label>
              <div className="relative">
                <select
                  id="overview-map-year"
                  value={mapYear}
                  onChange={(e) => setMapYear(e.target.value)}
                  className="appearance-none px-2 py-1 pr-7 rounded border border-white/20 bg-white/10 text-white text-sm
                             focus:outline-none focus:ring-1 focus:ring-white/30 cursor-pointer backdrop-blur-sm"
                >
                  {mapYears.map((y) => (
                    <option key={y} value={y} className="text-gray-900">{y}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/70" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden shadow-lg ring-1 ring-white/10" style={{ height: 572 }}>
              {mapPorts.length > 0 ? (
                <ChoroplethPortMap
                  layers={mapLayers}
                  ports={mapPorts}
                  connections={mapConnections}
                  center={[33.5, -82.0]}
                  zoom={4}
                  height="572px"
                  groupColors={MAP_GROUP_COLORS}
                  legendGroups={MAP_LEGEND}
                />
              ) : (
                <div className="w-full h-full bg-white/5 flex items-center justify-center">
                  <p className="text-white/40 text-sm">Loading map data...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat Cards + Country Filter (grouped) ────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-2">
        <section className="rounded-xl border border-border-light bg-surface-alt/50 p-5">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-3">
              <label htmlFor="country-filter" className="text-base font-semibold text-text-primary">
                Trading Partner
              </label>
              <select
                id="country-filter"
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="rounded-lg border border-border-light bg-white px-3 py-1.5 text-base text-text-primary
                           shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue"
              >
                {COUNTRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="tradetype-filter" className="text-base font-semibold text-text-primary">
                Trade Type
              </label>
              <select
                id="tradetype-filter"
                value={tradeTypeFilter}
                onChange={(e) => setTradeTypeFilter(e.target.value)}
                className="rounded-lg border border-border-light bg-white px-3 py-1.5 text-base text-text-primary
                           shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue"
              >
                <option value="">All</option>
                {tradeTypeOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="mode-filter" className="text-base font-semibold text-text-primary">
                Mode
              </label>
              <select
                id="mode-filter"
                value={modeFilterArr.length === 0 ? '' : modeFilterArr[0]}
                onChange={(e) => {
                  if (e.target.value === '') {
                    setModeFilterArr([])
                  } else {
                    setModeFilterArr([e.target.value])
                  }
                }}
                className="rounded-lg border border-border-light bg-white px-3 py-1.5 text-base text-text-primary
                           shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue"
              >
                <option value="">All</option>
                {modeOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <MetricToggle value={metric} onChange={setMetric} />
            <div className="flex items-center gap-3">
              <label htmlFor="quick-view-select" className="text-base font-semibold text-text-primary whitespace-nowrap">
                Quick View
              </label>
              <select
                id="quick-view-select"
                value=""
                onChange={(e) => {
                  const val = e.target.value
                  if (val === 'mexico')  { setCountryFilter('Mexico'); setTradeTypeFilter(''); setModeFilterArr([]) }
                  if (val === 'canada')  { setCountryFilter('Canada'); setTradeTypeFilter(''); setModeFilterArr([]) }
                  if (val === 'truck')   { setCountryFilter(''); setTradeTypeFilter(''); setModeFilterArr(['Truck']) }
                  if (val === 'exports') { setCountryFilter(''); setTradeTypeFilter('Export'); setModeFilterArr([]) }
                  if (val === 'reset')   { setCountryFilter(''); setTradeTypeFilter(''); setModeFilterArr([]); setMetric('value') }
                }}
                className="rounded-lg border border-border-light bg-white px-3 py-1.5 text-base text-text-primary
                           shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue"
              >
                <option value="" disabled>— apply preset —</option>
                <option value="mexico">Mexico only</option>
                <option value="canada">Canada only</option>
                <option value="truck">Truck only</option>
                <option value="exports">Exports only</option>
                <option value="reset">Reset all</option>
              </select>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                label={`Total Trade (${latestYear})`}
                value={stats.totalWeightNA ? 'N/A' : fmtValue(stats.totalLatest)}
                icon={DollarSign}
                highlight
                variant="primary"
                delay={0}
              />
              <StatCard
                label={`Exports (${latestYear})`}
                value={stats.exportWeightNA ? 'N/A' : fmtValue(stats.exports)}
                icon={ArrowRight}
                delay={100}
              />
              <StatCard
                label={`Imports (${latestYear})`}
                value={fmtValue(stats.imports)}
                icon={ArrowRight}
                delay={200}
              />
              <StatCard
                label={`Trade Balance (${latestYear})`}
                value={fmtValue(Math.abs(stats.tradeBalance))}
                trend={stats.tradeBalance >= 0 ? 'up' : 'down'}
                trendLabel={stats.tradeBalance >= 0 ? 'Surplus (Exports > Imports)' : 'Deficit (Imports > Exports)'}
                icon={Scale}
                delay={300}
              />
            </div>
          )}
        </section>
      </div>

      {/* ── Key Insights (always visible, independent of filter) ──── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {insights.length > 0 && (
          <section className="py-6">
            <div className="flex items-center gap-2.5 mb-5">
              <TrendingUp size={20} className="text-brand-blue" />
              <h3 className="text-xl font-bold text-text-primary">Key Insights</h3>
              <span className="text-xs font-medium text-text-tertiary bg-surface-alt px-2 py-0.5 rounded-full">Based on full dataset</span>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {insights.map((ins, i) => {
                const IconComp = ICON_MAP[ins.icon] || Lightbulb
                return (
                  <InsightCallout
                    key={i}
                    finding={ins.text}
                    variant={ins.variant || 'default'}
                    icon={IconComp}
                  />
                )
              })}
            </div>
          </section>
        )}
      </div>


      {/* ── Contextual Comparison ────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-2">
        <InsightCallout
          finding="Texas-Mexico trade alone exceeded $600 billion in 2025 — larger than the GDP of Sweden, Poland, or Thailand. Laredo processes roughly $900 million per day, more than the annual city budget of Houston."
          context="Context — This is a fixed reference point for scale and does not change with filters."
          variant="highlight"
          icon={Globe}
        />
      </div>

      {/* ── Annual Trade Trends ────────────────────────────────────── */}
      <SectionBlock>
        <div className="flex items-center gap-2.5 mb-5">
          <TrendingUp size={20} className="text-brand-blue" />
          <h3 className="text-xl font-bold text-text-primary">Annual Trade Trends</h3>
        </div>
        <div className="grid grid-cols-1 gap-6">
          <ChartCard
            title={`${trendCountry || 'U.S. TransBorder'} Exports vs Imports`}
            subtitle={`Annual ${metricLabel.toLowerCase()}, ${trendYearRange?.startYear ?? minYear ?? 1993}\u2013${trendYearRange?.endYear ?? latestYear ?? 2025}`}
            headerRight={
              <div className="flex items-center gap-3">
                <YearRangeFilter
                  years={availableYears}
                  startYear={trendYearRange?.startYear ?? minYear ?? 1993}
                  endYear={trendYearRange?.endYear ?? latestYear ?? 2025}
                  onChange={setTrendYearRange}
                />
                <CountrySelect value={trendCountry} onChange={setTrendCountry} id="trend-country" />
              </div>
            }
            downloadData={{
              summary: { data: trendData, filename: 'us-transborder-exports-vs-imports', columns: DL.tradeTrendSeries },
              detail:  { data: trendFiltered, filename: 'us-transborder-detail', columns: PAGE_TRANSBORDER_COLS },
            }}
          >
            <LineChart
              data={trendData}
              xKey="year"
              yKey="value"
              seriesKey="series"
              formatValue={fmtValue}
              annotations={HISTORICAL_ANNOTATIONS}
            />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* ── Trade by Mode + Country Share ──────────────────────────── */}
      <SectionBlock alt>
        <div className="flex items-center gap-2.5 mb-5">
          <Layers size={20} className="text-brand-blue" />
          <h3 className="text-xl font-bold text-text-primary">Trade Composition</h3>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ChartCard
            title={`${modeCountry || 'All'} Trade by Mode (${latestYear || ''})`}
            subtitle={`Share of total ${metricLabel.toLowerCase()} by transportation mode`}
            headerRight={<CountrySelect value={modeCountry} onChange={setModeCountry} id="mode-country" />}
            downloadData={{
              summary: { data: modeData, filename: 'trade-by-mode', columns: DL.modeRank },
            }}
          >
            <BarChart
              data={modeData}
              xKey="label"
              yKey="value"
              horizontal
              formatValue={fmtValue}
              colorAccessor={(d) => CHART_COLORS[modeData.indexOf(d) % CHART_COLORS.length]}
            />
          </ChartCard>

          <ChartCard
            title="Canada vs Mexico Trade Share"
            subtitle={`Annual ${metricLabel.toLowerCase()} by country, ${stackYearRange?.startYear ?? minYear ?? 1993}\u2013${stackYearRange?.endYear ?? latestYear ?? 2025}`}
            headerRight={
              <YearRangeFilter
                years={availableYears}
                startYear={stackYearRange?.startYear ?? minYear ?? 1993}
                endYear={stackYearRange?.endYear ?? latestYear ?? 2025}
                onChange={setStackYearRange}
              />
            }
            downloadData={{
              summary: { data: countryStackData.data, filename: 'canada-vs-mexico-trade-share' },
            }}
          >
            <StackedBarChart
              data={countryStackData.data}
              xKey="year"
              stackKeys={countryStackData.keys}
              formatValue={fmtValue}
            />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* ── Navigation Cards ──────────────────────────────────────── */}
      <SectionBlock>
        <div className="flex items-center gap-2.5 mb-2">
          <Database size={20} className="text-brand-blue" />
          <h3 className="text-xl font-bold text-text-primary">Explore the Data</h3>
        </div>
        <p className="text-lg text-text-secondary leading-relaxed mb-5">
          Each page below offers a focused lens on U.S. TransBorder freight data.
          Use the filter bar on any page to slice the data by year, country, mode, or trade type.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {navPages.map((p) => (
            <Link
              key={p.path}
              to={p.path}
              className="text-left relative rounded-xl border border-border-light bg-white p-6 flex flex-col
                         hover:shadow-md hover:-translate-y-0.5 hover:border-brand-blue/30
                         transition-all duration-200 group"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <p.Icon size={18} className="text-brand-blue" />
                <span className="text-base font-bold text-text-primary">{p.title}</span>
                <ArrowRight size={14} className="ml-auto text-text-secondary group-hover:text-brand-blue transition-colors" />
              </div>
              <p className="text-lg text-text-secondary leading-relaxed">{p.desc}</p>
            </Link>
          ))}
        </div>
      </SectionBlock>

      {/* ── Data Source (pre-footer) ──────────────────────────────── */}
      <section className="bg-surface-alt border-t border-border-light mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-2.5 mb-4">
            <Database size={20} className="text-text-secondary" />
            <h3 className="text-xl font-bold text-text-primary">Data Source</h3>
          </div>
          <p className="text-lg text-text-secondary leading-relaxed mb-3">
            All data in this dashboard comes from the{' '}
            <strong className="text-text-primary">Bureau of Transportation Statistics (BTS) TransBorder Freight Data</strong> program.
            TransBorder is the only public data source that provides port-level detail on U.S. trade
            with Canada and Mexico by surface mode (truck, rail, pipeline) as well as air and vessel.
            Data is collected from U.S. Customs declarations and covers all commercial freight shipments
            crossing U.S. borders with its NAFTA/USMCA partners.
          </p>
          <p className="text-lg text-text-secondary leading-relaxed mb-3">
            The dataset spans {minYear || 1993} to {latestYear || 2025} and is released monthly by BTS.
            Raw data files are available at{' '}
            <a
              href="https://www.bts.gov/topics/transborder-raw-data"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-blue hover:underline"
            >
              bts.gov/topics/transborder-raw-data
            </a>.
          </p>
          <Link
            to="/about"
            className="inline-flex items-center gap-1.5 text-base font-semibold text-brand-blue hover:underline mt-2"
          >
            Data details, methodology & limitations
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </>
  )
}
