/**
 * TexasMexico/index.jsx — Texas-Mexico Deep-Dive (Surface Freight)
 * ----------------------------------------------------------------
 * Three-tab dashboard: Ports | Commodities | States
 * Ports tab includes mode breakdown and monthly patterns.
 * States tab shows Mexican states trading through Texas ports.
 */
import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MapPin, ShoppingCart, Map as MapIcon, ArrowRightLeft, DollarSign, ArrowUpDown, Package, Truck } from 'lucide-react'
import HeroStardust from '@/components/ui/HeroStardust'
import { useTransborderStore } from '@/stores/transborderStore'
import { getMetricField, getMetricFormatter, getMetricLabel, hasSurfaceExports, isAllSurfaceExports } from '@/lib/chartColors'
import { buildCrossFilterOptions } from '@/lib/transborderHelpers'
import DatasetError from '@/components/ui/DatasetError'
import DashboardLayout from '@/components/layout/DashboardLayout'
import FilterSelect from '@/components/filters/FilterSelect'
import FilterMultiSelect from '@/components/filters/FilterMultiSelect'
import MetricToggle from '@/components/filters/MetricToggle'
import StatCard from '@/components/ui/StatCard'
import SectionBlock from '@/components/ui/SectionBlock'
import TabBar from '@/components/ui/TabBar'
import { PORT_REGION_MAP } from '@/lib/portUtils'

/* ── Region convenience: derive region options from PORT_REGION_MAP ── */
const REGIONS = [...new Set(Object.values(PORT_REGION_MAP))].sort()
const REGION_TO_PORTS = {}
for (const [port, region] of Object.entries(PORT_REGION_MAP)) {
  if (!REGION_TO_PORTS[region]) REGION_TO_PORTS[region] = []
  REGION_TO_PORTS[region].push(port)
}

import PortsTab from './tabs/PortsTab'
import CommoditiesTab from './tabs/CommoditiesTab'
import StatesTab from './tabs/StatesTab'
import TradeFlowsTab from './tabs/TradeFlowsTab'

/* ── tab configuration ─────────────────────────────────────────────── */
const TAB_CONFIG = [
  { key: 'ports',       label: 'Ports',        icon: MapPin },
  { key: 'commodities', label: 'Commodities',  icon: ShoppingCart },
  { key: 'states',      label: 'States',       icon: MapIcon },
  { key: 'flows',       label: 'Trade Flows',  icon: ArrowRightLeft },
]


export default function TexasMexicoPage() {
  const {
    texasMexicoPorts, texasMexicoPortStates, texasMexicoCommodities, monthlyTrends, monthlyCommodityTrends, texasMonthlyPortCommodity,
    texasMexicanStateTrade, texasOdStateFlows, commodityMexstateTrade,
    loading, datasetErrors, loadDataset,
  } = useTransborderStore()

  /* ── URL-synced state (tab + metric) ────────────────────────────── */
  const [searchParams, setSearchParams] = useSearchParams()
  const VALID_TABS = useMemo(() => new Set(TAB_CONFIG.map((t) => t.key)), [])
  const rawTab = searchParams.get('tab')
  const activeTab = VALID_TABS.has(rawTab) ? rawTab : 'ports'
  const metric = searchParams.get('metric') === 'weight' ? 'weight' : 'value'

  const updateParams = useCallback((updates) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      Object.entries(updates).forEach(([k, v]) => {
        if (v === null || v === undefined || v === '' || v === 'value' && k === 'metric') next.delete(k)
        else next.set(k, v)
      })
      return next
    }, { replace: true })
  }, [setSearchParams])

  const handleTabChange = useCallback((key) => updateParams({ tab: key }), [updateParams])

  /* ── local filter state ──────────────────────────────────────────── */
  const [yearFilter, setYearFilter] = useState([])
  const [tradeTypeFilter, setTradeTypeFilter] = useState('')
  const [modeFilter, setModeFilter] = useState([])
  const [regionFilter, setRegionFilter] = useState([])  // Changed to multi-select array
  const [portFilter, setPortFilter] = useState([])
  const [commodityGroupFilter, setCommodityGroupFilter] = useState([])
  const [commodityFilter, setCommodityFilter] = useState([])
  const [stateFilter, setStateFilter] = useState([])
  const [mexStateFilter, setMexStateFilter] = useState([])
  const tabBarRef = useRef(null)

  const setMetric = useCallback((v) => {
    updateParams({ metric: v })
    if (v === 'weight' && tradeTypeFilter === 'Export') setTradeTypeFilter('')
  }, [updateParams, tradeTypeFilter])

  /* ── lazy dataset loading ────────────────────────────────────────── */
  useEffect(() => { loadDataset('texasMexicoPorts') }, [loadDataset])

  useEffect(() => {
    if (activeTab === 'commodities') {
      loadDataset('texasMexicoCommodities')
      loadDataset('monthlyCommodityTrends')
      loadDataset('texasMonthlyPortCommodity')
    }
    if (activeTab === 'ports') {
      loadDataset('monthlyTrends')
      loadDataset('texasMexicoPortStates')
    }
    if (activeTab === 'states') {
      loadDataset('texasMexicanStateTrade')
      loadDataset('texasOdStateFlows')
      loadDataset('commodityMexstateTrade')
    }
    if (activeTab === 'flows') loadDataset('texasOdStateFlows')
  }, [activeTab, loadDataset])

  /* ── cross-filtered options (each filter shows only values that produce results given all other active filters) ── */
  const crossOptions = useMemo(() => {
    if (activeTab === 'commodities' && texasMexicoCommodities) {
      return buildCrossFilterOptions(texasMexicoCommodities, {
        Year: yearFilter, TradeType: tradeTypeFilter, Mode: modeFilter,
        CommodityGroup: commodityGroupFilter, Commodity: commodityFilter, Port: portFilter,
      }, ['Year', 'TradeType', 'Mode', 'CommodityGroup', 'Commodity', 'Port'])
    }
    if (activeTab === 'states') {
      // Use OD flows data if available (has Port + State), fall back to state trade data
      const stateData = texasOdStateFlows || texasMexicanStateTrade
      if (!stateData) return {}
      return buildCrossFilterOptions(stateData, {
        Year: yearFilter, TradeType: tradeTypeFilter, Mode: modeFilter,
        Port: portFilter, State: stateFilter, MexState: mexStateFilter,
      }, ['Year', 'TradeType', 'Mode', 'Port', 'State', 'MexState'])
    }
    if (activeTab === 'flows' && texasOdStateFlows) {
      return buildCrossFilterOptions(texasOdStateFlows, {
        Year: yearFilter, TradeType: tradeTypeFilter, Mode: modeFilter,
        State: stateFilter, Port: portFilter, MexState: mexStateFilter,
      }, ['Year', 'TradeType', 'Mode', 'State', 'Port', 'MexState'])
    }
    // Ports tab or fallback — use port-states dataset (has State column) when available
    const portsSource = texasMexicoPortStates || texasMexicoPorts
    if (!portsSource) return {}
    return buildCrossFilterOptions(portsSource, {
      Year: yearFilter, TradeType: tradeTypeFilter, Mode: modeFilter,
      Region: regionFilter, Port: portFilter, State: stateFilter,
    }, ['Year', 'TradeType', 'Mode', 'Region', 'Port', 'State'])
  }, [activeTab, texasMexicoPorts, texasMexicoPortStates, texasMexicoCommodities, texasMexicanStateTrade, texasOdStateFlows,
      yearFilter, tradeTypeFilter, modeFilter, regionFilter, portFilter,
      commodityGroupFilter, commodityFilter, stateFilter, mexStateFilter])

  const yearOptions = useMemo(() => (crossOptions.Year || []).map(String), [crossOptions])
  const tradeTypeOptions = crossOptions.TradeType || []
  const modeOptions = crossOptions.Mode || []
  const portOptions = crossOptions.Port || []
  const regionOptions = crossOptions.Region || []
  const commodityGroupOptions = crossOptions.CommodityGroup || []
  const commodityOptions = crossOptions.Commodity || []
  const stateOptions = crossOptions.State || []
  const mexStateOptions = crossOptions.MexState || []

  /* ── auto-prune stale multi-select values when options narrow ────── */
  /* Only prune filters the current tab actually exposes — leave others untouched
     so values survive tab switches without being cleared by absent crossOptions keys. */
  useEffect(() => {
    const prune = (opts, setter, asStr) => {
      if (!opts) return            // filter not relevant to this tab — leave it alone
      const valid = new Set(asStr ? opts.map(String) : opts)
      setter(prev => {
        if (!prev.length) return prev
        const next = prev.filter(v => valid.has(v))
        return next.length === prev.length ? prev : next
      })
    }
    prune(crossOptions.Year, setYearFilter, true)
    prune(crossOptions.Mode, setModeFilter)
    prune(crossOptions.Port, setPortFilter)
    if (activeTab === 'commodities') {
      prune(crossOptions.CommodityGroup, setCommodityGroupFilter)
      prune(crossOptions.Commodity, setCommodityFilter)
    }
    if (activeTab === 'ports' || activeTab === 'states') {
      prune(crossOptions.State, setStateFilter)
    }
    if (activeTab === 'states' || activeTab === 'flows') {
      prune(crossOptions.MexState, setMexStateFilter)
    }
  }, [crossOptions, activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── auto-prune stale single-select values ─────────────────────── */
  useEffect(() => {
    if (tradeTypeFilter && tradeTypeOptions.length && !tradeTypeOptions.includes(tradeTypeFilter)) {
      setTradeTypeFilter('')
    }
    // Prune region multi-select
    if (regionFilter.length && regionOptions.length) {
      const valid = new Set(regionOptions)
      setRegionFilter(prev => {
        const next = prev.filter(v => valid.has(v))
        return next.length === prev.length ? prev : next
      })
    }
  }, [tradeTypeOptions, regionOptions, tradeTypeFilter, regionFilter])

  /* ── filtered data ─────────────────────────────────────────────── */
  const applyFilters = useCallback((data) => {
    if (!data) return []
    let result = data
    if (yearFilter.length) result = result.filter((d) => yearFilter.includes(String(d.Year)))
    if (tradeTypeFilter) result = result.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter.length) result = result.filter((d) => modeFilter.includes(d.Mode))
    if (regionFilter.length) result = result.filter((d) => regionFilter.includes(d.Region))
    if (portFilter.length) result = result.filter((d) => portFilter.includes(d.Port))
    if (stateFilter.length) result = result.filter((d) => stateFilter.includes(d.State))
    return result
  }, [yearFilter, tradeTypeFilter, modeFilter, regionFilter, portFilter, stateFilter])

  const filteredPorts = useMemo(() => {
    // Use port-states dataset (has State column) when state filter is active
    const source = stateFilter.length && texasMexicoPortStates ? texasMexicoPortStates : texasMexicoPorts
    return applyFilters(source)
  }, [texasMexicoPorts, texasMexicoPortStates, stateFilter, applyFilters])

  const filteredCommodities = useMemo(() => {
    if (!texasMexicoCommodities) return null
    let result = texasMexicoCommodities
    if (yearFilter.length) result = result.filter((d) => yearFilter.includes(String(d.Year)))
    if (tradeTypeFilter) result = result.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter.length) result = result.filter((d) => modeFilter.includes(d.Mode))
    if (commodityGroupFilter.length) result = result.filter((d) => commodityGroupFilter.includes(d.CommodityGroup))
    if (commodityFilter.length) result = result.filter((d) => commodityFilter.includes(d.Commodity))
    if (portFilter.length) result = result.filter((d) => portFilter.includes(d.Port))
    return result
  }, [texasMexicoCommodities, yearFilter, tradeTypeFilter, modeFilter, commodityGroupFilter, commodityFilter, portFilter])

  const filteredMonthly = useMemo(() => {
    if (!monthlyTrends) return null
    let result = monthlyTrends.filter((d) => d.Country === 'Mexico')
    if (yearFilter.length) result = result.filter((d) => yearFilter.includes(String(d.Year)))
    if (tradeTypeFilter) result = result.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter.length) result = result.filter((d) => modeFilter.includes(d.Mode))
    return result
  }, [monthlyTrends, yearFilter, tradeTypeFilter, modeFilter])

  const filteredPortsNoYear = useMemo(() => {
    const source = stateFilter.length && texasMexicoPortStates ? texasMexicoPortStates : texasMexicoPorts
    if (!source) return []
    let result = source
    if (tradeTypeFilter) result = result.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter.length) result = result.filter((d) => modeFilter.includes(d.Mode))
    if (regionFilter.length) result = result.filter((d) => regionFilter.includes(d.Region))
    if (portFilter.length) result = result.filter((d) => portFilter.includes(d.Port))
    if (stateFilter.length) result = result.filter((d) => stateFilter.includes(d.State))
    return result
  }, [texasMexicoPorts, texasMexicoPortStates, stateFilter, tradeTypeFilter, modeFilter, regionFilter, portFilter])

  /* ── KPIs ──────────────────────────────────────────────────────── */
  const latestYear = useMemo(() => {
    if (!filteredPorts.length) return null
    return Math.max(...filteredPorts.map((d) => d.Year).filter(Number.isFinite))
  }, [filteredPorts])

  const valueField = getMetricField(metric)
  const fmtValue = getMetricFormatter(metric)
  const _metricLabel = getMetricLabel(metric)

  const stats = useMemo(() => {
    if (!filteredPorts.length || !latestYear) return null
    const latest = filteredPorts.filter((d) => d.Year === latestYear)
    const prevYear = latestYear - 1
    const prev = filteredPorts.filter((d) => d.Year === prevYear)

    const totalTrade = latest.reduce((s, d) => s + (d[valueField] || 0), 0)
    const prevTrade = prev.reduce((s, d) => s + (d[valueField] || 0), 0)
    const tradeChange = prevTrade ? (totalTrade - prevTrade) / prevTrade : 0

    const exportRows = latest.filter((d) => d.TradeType === 'Export')
    const exports = exportRows.reduce((s, d) => s + (d[valueField] || 0), 0)
    const imports = latest.filter((d) => d.TradeType === 'Import').reduce((s, d) => s + (d[valueField] || 0), 0)
    const portCount = new Set(latest.map((d) => d.Port)).size
    const exportWeightNA = metric === 'weight' && hasSurfaceExports(exportRows)
    const totalWeightNA = metric === 'weight' && isAllSurfaceExports(latest)

    const modeMap = new Map()
    latest.forEach((d) => {
      if (!d.Mode) return
      modeMap.set(d.Mode, (modeMap.get(d.Mode) || 0) + (d[valueField] || 0))
    })
    let topMode = '—'
    let topModeVal = 0
    modeMap.forEach((v, k) => { if (v > topModeVal) { topMode = k; topModeVal = v } })

    return { totalTrade, tradeChange, exports, imports, portCount, topMode, latestYear, prevYear, exportWeightNA, totalWeightNA }
  }, [filteredPorts, latestYear, valueField])

  /* ── Sparkline data (last 6 years of total trade) ────────────── */
  const sparklineData = useMemo(() => {
    if (!filteredPorts.length || !latestYear) return null
    const byYear = new Map()
    filteredPorts.forEach((d) => {
      if (!d.Year) return
      byYear.set(d.Year, (byYear.get(d.Year) || 0) + (d[valueField] || 0))
    })
    const years = [...byYear.keys()].sort((a, b) => a - b).slice(-6)
    return years.map((y) => byYear.get(y) || 0)
  }, [filteredPorts, latestYear, valueField])

  /* ── dynamic state filter label ─────────────────────────────────── */
  const stateFilterLabel = tradeTypeFilter === 'Export' ? 'State (Origin)'
    : tradeTypeFilter === 'Import' ? 'State (Destination)' : 'State (Origin/Dest)'

  /* ── active filter count & reset ───────────────────────────────── */
  const activeCount = yearFilter.length + (tradeTypeFilter ? 1 : 0) + modeFilter.length + regionFilter.length
    + portFilter.length + commodityGroupFilter.length + commodityFilter.length + stateFilter.length + mexStateFilter.length

  const activeTags = useMemo(() => {
    const tags = []
    yearFilter.forEach((v) =>
      tags.push({ group: 'Year', label: v, onRemove: () => setYearFilter((prev) => prev.filter((x) => x !== v)) })
    )
    if (tradeTypeFilter) tags.push({ group: 'Trade Type', label: tradeTypeFilter, onRemove: () => setTradeTypeFilter('') })
    modeFilter.forEach((v) =>
      tags.push({ group: 'Mode', label: v, onRemove: () => setModeFilter((prev) => prev.filter((x) => x !== v)) })
    )
    regionFilter.forEach((v) =>
      tags.push({ group: 'Region', label: v, onRemove: () => setRegionFilter((prev) => prev.filter((x) => x !== v)) })
    )
    portFilter.forEach((v) =>
      tags.push({ group: 'Port', label: v, onRemove: () => setPortFilter((prev) => prev.filter((x) => x !== v)) })
    )
    commodityGroupFilter.forEach((v) =>
      tags.push({ group: 'Commodity Group', label: v, onRemove: () => setCommodityGroupFilter((prev) => prev.filter((x) => x !== v)) })
    )
    commodityFilter.forEach((v) =>
      tags.push({ group: 'Commodity', label: v, onRemove: () => setCommodityFilter((prev) => prev.filter((x) => x !== v)) })
    )
    stateFilter.forEach((v) =>
      tags.push({ group: stateFilterLabel, label: v, onRemove: () => setStateFilter((prev) => prev.filter((x) => x !== v)) })
    )
    mexStateFilter.forEach((v) =>
      tags.push({ group: 'MX State', label: v, onRemove: () => setMexStateFilter((prev) => prev.filter((x) => x !== v)) })
    )
    return tags
  }, [metric, yearFilter, tradeTypeFilter, modeFilter, regionFilter, portFilter, commodityGroupFilter, commodityFilter, stateFilter, stateFilterLabel, mexStateFilter])

  const resetFilters = useCallback(() => {
    setMetric('value'); setYearFilter([]); setTradeTypeFilter(''); setModeFilter([])
    setRegionFilter([]); setPortFilter([]); setCommodityGroupFilter([]); setCommodityFilter([]); setStateFilter([]); setMexStateFilter([])
  }, [setMetric])

  /* ── render ────────────────────────────────────────────────────── */
  if (datasetErrors.texasMexicoPorts) {
    return <DatasetError datasetName="Texas-Mexico Ports" error={datasetErrors.texasMexicoPorts} onRetry={() => loadDataset('texasMexicoPorts')} />
  }
  if (loading || !texasMexicoPorts) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-base text-text-secondary">Loading Texas-Mexico trade data...</p>
        </div>
      </div>
    )
  }

  const filterControls = (
    <>
      <MetricToggle value={metric} onChange={setMetric} />
      <FilterMultiSelect label="Year" value={yearFilter} options={yearOptions} onChange={setYearFilter} />
      {tradeTypeOptions.length > 1 ? (
        <FilterSelect label="Trade Type" value={tradeTypeFilter} options={tradeTypeOptions} onChange={setTradeTypeFilter} disabledValues={metric === 'weight' ? ['Export'] : []} />
      ) : tradeTypeOptions.length === 1 ? (
        <div className="flex flex-col gap-1 min-w-0 w-full">
          <span className="text-base font-medium text-text-secondary uppercase tracking-wider">Trade Type</span>
          <span className="px-3 py-2 rounded-lg border border-border bg-surface-alt text-base text-text-secondary">
            {tradeTypeOptions[0]}s Only
          </span>
        </div>
      ) : null}
      <FilterMultiSelect label="Mode" value={modeFilter} options={modeOptions} onChange={setModeFilter} />
      {activeTab === 'ports' && (
        <>
          <FilterMultiSelect label="Region" value={regionFilter} options={regionOptions} onChange={setRegionFilter} />
          <FilterMultiSelect label="Port" value={portFilter} options={portOptions} onChange={setPortFilter} searchable />
          {stateOptions.length > 0 && (
            <FilterMultiSelect label={stateFilterLabel} value={stateFilter} options={stateOptions} onChange={setStateFilter} searchable />
          )}
        </>
      )}
      {activeTab === 'commodities' && (
        <>
          <FilterMultiSelect label="Commodity Group" value={commodityGroupFilter} options={commodityGroupOptions} onChange={setCommodityGroupFilter} searchable />
          {commodityOptions.length > 0 && (
            <FilterMultiSelect label="Commodity" value={commodityFilter} options={commodityOptions} onChange={setCommodityFilter} searchable />
          )}
          <FilterMultiSelect label="Region" value={regionFilter} options={regionOptions.length ? regionOptions : REGIONS} onChange={(regions) => {
            setRegionFilter(regions)
            const regionPorts = regions.flatMap(r => REGION_TO_PORTS[r] || []).filter(p => portOptions.includes(p))
            setPortFilter(regions.length ? regionPorts : [])
          }} />
          <FilterMultiSelect label="Port" value={portFilter} options={portOptions} onChange={setPortFilter} searchable />
        </>
      )}
      {activeTab === 'states' && (
        <>
          <FilterMultiSelect label="Region" value={regionFilter} options={regionOptions.length ? regionOptions : REGIONS} onChange={(regions) => {
            setRegionFilter(regions)
            const regionPorts = regions.flatMap(r => REGION_TO_PORTS[r] || []).filter(p => portOptions.includes(p))
            setPortFilter(regions.length ? regionPorts : [])
          }} />
          {portOptions.length > 0 && (
            <FilterMultiSelect label="Port" value={portFilter} options={portOptions} onChange={setPortFilter} searchable />
          )}
          {stateOptions.length > 0 && (
            <FilterMultiSelect label={stateFilterLabel} value={stateFilter} options={stateOptions} onChange={setStateFilter} searchable />
          )}
        </>
      )}
      {activeTab === 'flows' && (
        <>
          {stateOptions.length > 0 && (
            <FilterMultiSelect label={stateFilterLabel} value={stateFilter} options={stateOptions} onChange={setStateFilter} searchable />
          )}
          {portOptions.length > 0 && (
            <FilterMultiSelect label="Port" value={portFilter} options={portOptions} onChange={setPortFilter} searchable />
          )}
        </>
      )}
      {(activeTab === 'states' || activeTab === 'flows') && mexStateOptions.length > 0 && (
        <FilterMultiSelect label="Mexican State" value={mexStateFilter} options={mexStateOptions} onChange={setMexStateFilter} searchable />
      )}
    </>
  )

  const heroSection = (
    <div className="gradient-blue text-white relative overflow-visible">
      <HeroStardust seed={88} animate />
      <div className="container-chrome py-10 md:py-14 relative">
        <h2 className="text-2xl md:text-3xl font-bold text-balance text-white">
          Texas&ndash;Mexico Surface Freight Trade
        </h2>
        <p className="text-white/70 mt-2 text-base">
          Texas handles two-thirds of all U.S.–Mexico trade — over $600 billion in 2025 — making it the single most
          important trade gateway on the continent. Deep dive into cross-border freight flows (2007&ndash;{latestYear || '...'}).
        </p>
      </div>
    </div>
  )

  return (
    <DashboardLayout
      hero={heroSection}
      filters={filterControls}
      onResetAll={resetFilters}
      activeCount={activeCount}
      activeTags={activeTags}
      filteredEmpty={!filteredPorts.length}
    >
      {/* KPI Cards */}
      <SectionBlock>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 max-w-7xl mx-auto">
          <StatCard
            label={`Total TX-MX Trade (${latestYear || '—'})`}
            value={stats ? (stats.totalWeightNA ? 'N/A' : fmtValue(stats.totalTrade)) : '—'}
            trend={stats && !stats.totalWeightNA && stats.tradeChange > 0 ? 'up' : stats && !stats.totalWeightNA && stats.tradeChange < 0 ? 'down' : undefined}
            trendLabel={stats && !stats.totalWeightNA ? `${(stats.tradeChange * 100).toFixed(1)}% vs ${stats.prevYear}` : ''}
            sparkline={sparklineData}
            highlight variant="primary" icon={DollarSign} delay={0}
          />
          <StatCard label={`Exports (${latestYear || '—'})`} value={stats ? (stats.exportWeightNA ? 'N/A' : fmtValue(stats.exports)) : '—'} highlight icon={ArrowUpDown} delay={100} />
          <StatCard label={`Imports (${latestYear || '—'})`} value={stats ? fmtValue(stats.imports) : '—'} highlight icon={Package} delay={200} />
          <StatCard label={`Active Ports (${latestYear || '—'})`} value={stats ? String(stats.portCount) : '—'} highlight icon={MapPin} delay={300} />
          <StatCard label={`Top Mode (${latestYear || '—'})`} value={stats ? stats.topMode : '—'} highlight icon={Truck} delay={400} />
        </div>
      </SectionBlock>

      {/* Tab Bar */}
      <div ref={tabBarRef} className="sticky top-0 z-40 shadow-sm">
        <TabBar tabs={TAB_CONFIG} activeTab={activeTab} onChange={handleTabChange} idPrefix="txmx-freight-tab" />
      </div>

      {/* Tab Content */}
      {activeTab === 'ports' && (
        <div role="tabpanel" id="txmx-freight-tab-panel-ports" aria-labelledby="txmx-freight-tab-ports">
          <PortsTab
            filteredPorts={filteredPorts}
            filteredPortsNoYear={filteredPortsNoYear}
            filteredMonthly={filteredMonthly}
            loadDataset={loadDataset}
            latestYear={latestYear}
            datasetError={datasetErrors.monthlyTrends}
            metric={metric}
            tradeTypeFilter={tradeTypeFilter}
            modeFilter={modeFilter}
          />
        </div>
      )}
      {activeTab === 'commodities' && (
        <div role="tabpanel" id="txmx-freight-tab-panel-commodities" aria-labelledby="txmx-freight-tab-commodities">
          <CommoditiesTab
            filteredCommodities={filteredCommodities}
            monthlyCommodityTrends={monthlyCommodityTrends}
            texasMonthlyPortCommodity={texasMonthlyPortCommodity}
            loadDataset={loadDataset}
            latestYear={latestYear}
            datasetError={datasetErrors.texasMexicoCommodities}
            metric={metric}
            tradeTypeFilter={tradeTypeFilter}
            modeFilter={modeFilter}
          />
        </div>
      )}
      {activeTab === 'flows' && (
        <div role="tabpanel" id="txmx-freight-tab-panel-flows" aria-labelledby="txmx-freight-tab-flows">
          <TradeFlowsTab
            texasOdStateFlows={texasOdStateFlows}
            loadDataset={loadDataset}
            yearFilter={yearFilter}
            tradeTypeFilter={tradeTypeFilter}
            modeFilter={modeFilter}
            stateFilter={stateFilter}
            portFilter={portFilter}
            mexStateFilter={mexStateFilter}
            datasetError={datasetErrors.texasOdStateFlows}
            metric={metric}
          />
        </div>
      )}
      {activeTab === 'states' && (
        <div role="tabpanel" id="txmx-freight-tab-panel-states" aria-labelledby="txmx-freight-tab-states">
          <StatesTab
            texasMexicanStateTrade={texasMexicanStateTrade}
            texasOdStateFlows={texasOdStateFlows}
            commodityMexstateTrade={commodityMexstateTrade}
            loadDataset={loadDataset}
            latestYear={latestYear}
            yearFilter={yearFilter}
            tradeTypeFilter={tradeTypeFilter}
            modeFilter={modeFilter}
            stateFilter={stateFilter}
            portFilter={portFilter}
            mexStateFilter={mexStateFilter}
            datasetError={datasetErrors.texasMexicanStateTrade}
            metric={metric}
          />
        </div>
      )}
    </DashboardLayout>
  )
}
