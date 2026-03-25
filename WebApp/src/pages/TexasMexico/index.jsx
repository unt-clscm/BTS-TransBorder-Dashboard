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
import { formatCurrency, getMetricField, getMetricFormatter, getMetricLabel, hasSurfaceExports, isAllSurfaceExports } from '@/lib/chartColors'
import { buildCrossFilterOptions, applyStandardFilters } from '@/lib/transborderHelpers'
import DatasetError from '@/components/ui/DatasetError'
import DashboardLayout from '@/components/layout/DashboardLayout'
import FilterSelect from '@/components/filters/FilterSelect'
import FilterMultiSelect from '@/components/filters/FilterMultiSelect'
import MetricToggle from '@/components/filters/MetricToggle'
import StatCard from '@/components/ui/StatCard'
import SectionBlock from '@/components/ui/SectionBlock'
import TabBar from '@/components/ui/TabBar'

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
    texasMexicoPorts, texasMexicoCommodities, monthlyTrends,
    texasMexicanStateTrade, texasOdStateFlows,
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
  const [regionFilter, setRegionFilter] = useState('')
  const [portFilter, setPortFilter] = useState([])
  const [commodityGroupFilter, setCommodityGroupFilter] = useState([])
  const [commodityFilter, setCommodityFilter] = useState([])
  const [mexStateFilter, setMexStateFilter] = useState([])
  const tabBarRef = useRef(null)

  const setMetric = useCallback((v) => {
    updateParams({ metric: v })
    if (v === 'weight' && tradeTypeFilter === 'Export') setTradeTypeFilter('')
  }, [updateParams, tradeTypeFilter])

  /* ── lazy dataset loading ────────────────────────────────────────── */
  useEffect(() => { loadDataset('texasMexicoPorts') }, [loadDataset])

  useEffect(() => {
    if (activeTab === 'commodities') loadDataset('texasMexicoCommodities')
    if (activeTab === 'ports') loadDataset('monthlyTrends')
    if (activeTab === 'states') { loadDataset('texasMexicanStateTrade'); loadDataset('texasOdStateFlows') }
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
    if (activeTab === 'states' && texasMexicanStateTrade) {
      return buildCrossFilterOptions(texasMexicanStateTrade, {
        Year: yearFilter, TradeType: tradeTypeFilter, Mode: modeFilter, MexState: mexStateFilter,
      }, ['Year', 'TradeType', 'Mode', 'MexState'])
    }
    if (activeTab === 'flows' && texasOdStateFlows) {
      return buildCrossFilterOptions(texasOdStateFlows, {
        Year: yearFilter, TradeType: tradeTypeFilter, Mode: modeFilter,
        Port: portFilter, MexState: mexStateFilter,
      }, ['Year', 'TradeType', 'Mode', 'Port', 'MexState'])
    }
    // Ports tab or fallback
    if (!texasMexicoPorts) return {}
    return buildCrossFilterOptions(texasMexicoPorts, {
      Year: yearFilter, TradeType: tradeTypeFilter, Mode: modeFilter,
      Region: regionFilter, Port: portFilter,
    }, ['Year', 'TradeType', 'Mode', 'Region', 'Port'])
  }, [activeTab, texasMexicoPorts, texasMexicoCommodities, texasMexicanStateTrade, texasOdStateFlows,
      yearFilter, tradeTypeFilter, modeFilter, regionFilter, portFilter,
      commodityGroupFilter, commodityFilter, mexStateFilter])

  const yearOptions = useMemo(() => (crossOptions.Year || []).map(String), [crossOptions])
  const tradeTypeOptions = crossOptions.TradeType || []
  const modeOptions = crossOptions.Mode || []
  const portOptions = crossOptions.Port || []
  const regionOptions = crossOptions.Region || []
  const commodityGroupOptions = crossOptions.CommodityGroup || []
  const commodityOptions = crossOptions.Commodity || []
  const mexStateOptions = crossOptions.MexState || []

  /* ── auto-prune stale multi-select values when options narrow ────── */
  useEffect(() => {
    const prune = (opts, setter, asStr) => {
      if (!opts) return
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
    prune(crossOptions.CommodityGroup, setCommodityGroupFilter)
    prune(crossOptions.Commodity, setCommodityFilter)
    prune(crossOptions.MexState, setMexStateFilter)
  }, [crossOptions]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── auto-prune stale single-select values ─────────────────────── */
  useEffect(() => {
    if (tradeTypeFilter && tradeTypeOptions.length && !tradeTypeOptions.includes(tradeTypeFilter)) {
      setTradeTypeFilter('')
    }
    if (regionFilter && regionOptions.length && !regionOptions.includes(regionFilter)) {
      setRegionFilter('')
    }
  }, [tradeTypeOptions, regionOptions, tradeTypeFilter, regionFilter])

  /* ── filtered data ─────────────────────────────────────────────── */
  const applyFilters = useCallback((data) => {
    if (!data) return []
    let result = data
    if (yearFilter.length) result = result.filter((d) => yearFilter.includes(String(d.Year)))
    if (tradeTypeFilter) result = result.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter.length) result = result.filter((d) => modeFilter.includes(d.Mode))
    if (regionFilter) result = result.filter((d) => d.Region === regionFilter)
    if (portFilter.length) result = result.filter((d) => portFilter.includes(d.Port))
    return result
  }, [yearFilter, tradeTypeFilter, modeFilter, regionFilter, portFilter])

  const filteredPorts = useMemo(() => applyFilters(texasMexicoPorts), [texasMexicoPorts, applyFilters])

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
    if (!texasMexicoPorts) return []
    let result = texasMexicoPorts
    if (tradeTypeFilter) result = result.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter.length) result = result.filter((d) => modeFilter.includes(d.Mode))
    if (regionFilter) result = result.filter((d) => d.Region === regionFilter)
    if (portFilter.length) result = result.filter((d) => portFilter.includes(d.Port))
    return result
  }, [texasMexicoPorts, tradeTypeFilter, modeFilter, regionFilter, portFilter])

  /* ── KPIs ──────────────────────────────────────────────────────── */
  const latestYear = useMemo(() => {
    if (!filteredPorts.length) return null
    return Math.max(...filteredPorts.map((d) => d.Year).filter(Number.isFinite))
  }, [filteredPorts])

  const valueField = getMetricField(metric)
  const fmtValue = getMetricFormatter(metric)
  const metricLabel = getMetricLabel(metric)

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
      modeMap.set(d.Mode, (modeMap.get(d.Mode) || 0) + (d.TradeValue || 0))
    })
    let topMode = '—'
    let topModeVal = 0
    modeMap.forEach((v, k) => { if (v > topModeVal) { topMode = k; topModeVal = v } })

    return { totalTrade, tradeChange, exports, imports, portCount, topMode, latestYear, prevYear, exportWeightNA, totalWeightNA }
  }, [filteredPorts, latestYear, valueField])

  /* ── active filter count & reset ───────────────────────────────── */
  const activeCount = yearFilter.length + (tradeTypeFilter ? 1 : 0) + modeFilter.length + (regionFilter ? 1 : 0)
    + portFilter.length + commodityGroupFilter.length + commodityFilter.length + mexStateFilter.length

  const activeTags = useMemo(() => {
    const tags = []
    yearFilter.forEach((v) =>
      tags.push({ group: 'Year', label: v, onRemove: () => setYearFilter((prev) => prev.filter((x) => x !== v)) })
    )
    if (tradeTypeFilter) tags.push({ group: 'Trade Type', label: tradeTypeFilter, onRemove: () => setTradeTypeFilter('') })
    modeFilter.forEach((v) =>
      tags.push({ group: 'Mode', label: v, onRemove: () => setModeFilter((prev) => prev.filter((x) => x !== v)) })
    )
    if (regionFilter) tags.push({ group: 'Region', label: regionFilter, onRemove: () => setRegionFilter('') })
    portFilter.forEach((v) =>
      tags.push({ group: 'Port', label: v, onRemove: () => setPortFilter((prev) => prev.filter((x) => x !== v)) })
    )
    commodityGroupFilter.forEach((v) =>
      tags.push({ group: 'Commodity Group', label: v, onRemove: () => setCommodityGroupFilter((prev) => prev.filter((x) => x !== v)) })
    )
    commodityFilter.forEach((v) =>
      tags.push({ group: 'Commodity', label: v, onRemove: () => setCommodityFilter((prev) => prev.filter((x) => x !== v)) })
    )
    mexStateFilter.forEach((v) =>
      tags.push({ group: 'MX State', label: v, onRemove: () => setMexStateFilter((prev) => prev.filter((x) => x !== v)) })
    )
    return tags
  }, [metric, yearFilter, tradeTypeFilter, modeFilter, regionFilter, portFilter, commodityGroupFilter, commodityFilter, mexStateFilter])

  const resetFilters = useCallback(() => {
    setMetric('value'); setYearFilter([]); setTradeTypeFilter(''); setModeFilter([])
    setRegionFilter(''); setPortFilter([]); setCommodityGroupFilter([]); setCommodityFilter([]); setMexStateFilter([])
  }, [])

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
      <FilterSelect label="Trade Type" value={tradeTypeFilter} options={tradeTypeOptions} onChange={setTradeTypeFilter} disabledValues={metric === 'weight' ? ['Export'] : []} />
      <FilterMultiSelect label="Mode" value={modeFilter} options={modeOptions} onChange={setModeFilter} />
      {activeTab === 'ports' && (
        <>
          <FilterSelect label="Region" value={regionFilter} options={regionOptions} onChange={setRegionFilter} />
          <FilterMultiSelect label="Port" value={portFilter} options={portOptions} onChange={setPortFilter} searchable />
        </>
      )}
      {activeTab === 'commodities' && (
        <>
          <FilterMultiSelect label="Commodity Group" value={commodityGroupFilter} options={commodityGroupOptions} onChange={setCommodityGroupFilter} searchable />
          {commodityOptions.length > 0 && (
            <FilterMultiSelect label="Commodity" value={commodityFilter} options={commodityOptions} onChange={setCommodityFilter} searchable />
          )}
          <FilterMultiSelect label="Port" value={portFilter} options={portOptions} onChange={setPortFilter} searchable />
        </>
      )}
      {activeTab === 'flows' && portOptions.length > 0 && (
        <FilterMultiSelect label="Port" value={portFilter} options={portOptions} onChange={setPortFilter} searchable />
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
          Deep dive into cross-border freight flows between Texas and Mexico (2007&ndash;{latestYear || '...'}).
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-7xl mx-auto">
          <StatCard
            label={`Total TX-MX Trade (${latestYear || '—'})`}
            value={stats ? (stats.totalWeightNA ? 'N/A' : fmtValue(stats.totalTrade)) : '—'}
            trend={stats && !stats.totalWeightNA && stats.tradeChange > 0 ? 'up' : stats && !stats.totalWeightNA && stats.tradeChange < 0 ? 'down' : undefined}
            trendLabel={stats && !stats.totalWeightNA ? `${(stats.tradeChange * 100).toFixed(1)}% vs ${stats.prevYear}` : ''}
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
            loadDataset={loadDataset}
            latestYear={latestYear}
            yearFilter={yearFilter}
            tradeTypeFilter={tradeTypeFilter}
            modeFilter={modeFilter}
            mexStateFilter={mexStateFilter}
            datasetError={datasetErrors.texasMexicanStateTrade}
            metric={metric}
          />
        </div>
      )}
    </DashboardLayout>
  )
}
