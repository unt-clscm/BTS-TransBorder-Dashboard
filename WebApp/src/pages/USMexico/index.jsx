/**
 * USMexico/index.jsx — U.S.-Mexico Trade (3-tab dashboard)
 * ----------------------------------------------------------------
 * Tabs: Ports | Commodities | States
 * Story: National US-Mexico trade with Texas's share highlighted.
 * Lazy-loads datasets per active tab.
 */
import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MapPin, ShoppingCart, Map as MapIcon, ArrowRightLeft, DollarSign, ArrowUpRight, ArrowDownLeft, Award, TrendingUp } from 'lucide-react'
import { useTransborderStore } from '@/stores/transborderStore'
import { formatCurrency, buildFilterOptions, applyStandardFilters } from '@/lib/transborderHelpers'
import DashboardLayout from '@/components/layout/DashboardLayout'
import FilterMultiSelect from '@/components/filters/FilterMultiSelect'
import FilterSelect from '@/components/filters/FilterSelect'
import HeroStardust from '@/components/ui/HeroStardust'
import StatCard from '@/components/ui/StatCard'
import SectionBlock from '@/components/ui/SectionBlock'
import TabBar from '@/components/ui/TabBar'
import DatasetError from '@/components/ui/DatasetError'

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

export default function USMexicoPage() {
  const {
    usTransborder, usMexicoPorts, commodityDetail,
    usStateTrade, mexicanStateTrade, odStateFlows,
    loading, datasetErrors, loadDataset,
  } = useTransborderStore()

  /* ── tab state (synced to URL) ─────────────────────────────────────── */
  const [searchParams, setSearchParams] = useSearchParams()
  const VALID_TABS = useMemo(() => new Set(TAB_CONFIG.map((t) => t.key)), [])
  const rawTab = searchParams.get('tab')
  const activeTab = VALID_TABS.has(rawTab) ? rawTab : 'ports'
  const handleTabChange = useCallback((key) => {
    setSearchParams({ tab: key }, { replace: true })
  }, [setSearchParams])
  const tabBarRef = useRef(null)

  /* ── lazy dataset loading ──────────────────────────────────────────── */
  useEffect(() => { loadDataset('usMexicoPorts') }, [loadDataset])

  useEffect(() => {
    if (activeTab === 'commodities') loadDataset('commodityDetail')
    if (activeTab === 'states') {
      loadDataset('usStateTrade')
      loadDataset('mexicanStateTrade')
    }
    if (activeTab === 'flows') loadDataset('odStateFlows')
  }, [activeTab, loadDataset])

  /* ── local filter state ────────────────────────────────────────────── */
  const [yearFilter, setYearFilter] = useState([])
  const [tradeTypeFilter, setTradeTypeFilter] = useState('')
  const [modeFilter, setModeFilter] = useState([])
  const [stateFilter, setStateFilter] = useState([])

  /* ── base datasets: Mexico only ────────────────────────────────────── */
  const usMexicoData = useMemo(() => {
    if (!usTransborder?.length) return []
    return usTransborder.filter((d) => d.Country === 'Mexico')
  }, [usTransborder])

  const portsData = useMemo(() => usMexicoPorts || [], [usMexicoPorts])

  /* ── filter options ────────────────────────────────────────────────── */
  const filterOptions = useMemo(() => {
    const opts = buildFilterOptions(portsData, ['Year', 'TradeType', 'Mode', 'State'])
    return {
      year: (opts.Year || []).map(String),
      tradeType: opts.TradeType || [],
      mode: opts.Mode || [],
      state: opts.State || [],
    }
  }, [portsData])

  /* ── apply filters ─────────────────────────────────────────────────── */
  const filteredPorts = useMemo(
    () => applyStandardFilters(portsData, { Year: yearFilter, TradeType: tradeTypeFilter, Mode: modeFilter, State: stateFilter }),
    [portsData, yearFilter, tradeTypeFilter, modeFilter, stateFilter],
  )
  const filteredPortsNoYear = useMemo(
    () => applyStandardFilters(portsData, { TradeType: tradeTypeFilter, Mode: modeFilter, State: stateFilter }),
    [portsData, tradeTypeFilter, modeFilter, stateFilter],
  )
  const filteredSummary = useMemo(
    () => applyStandardFilters(usMexicoData, { Year: yearFilter, TradeType: tradeTypeFilter, Mode: modeFilter }),
    [usMexicoData, yearFilter, tradeTypeFilter, modeFilter],
  )
  const filteredSummaryNoYear = useMemo(
    () => applyStandardFilters(usMexicoData, { TradeType: tradeTypeFilter, Mode: modeFilter }),
    [usMexicoData, tradeTypeFilter, modeFilter],
  )

  /* ── filtered commodities (Mexico only) ────────────────────────────── */
  const filteredCommodities = useMemo(() => {
    if (!commodityDetail) return null
    let data = commodityDetail.filter((d) => d.Country === 'Mexico')
    if (yearFilter.length) data = data.filter((d) => yearFilter.includes(String(d.Year)))
    if (tradeTypeFilter) data = data.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter.length) data = data.filter((d) => modeFilter.includes(d.Mode))
    return data
  }, [commodityDetail, yearFilter, tradeTypeFilter, modeFilter])

  /* ── latest year ───────────────────────────────────────────────────── */
  const latestYear = useMemo(() => {
    if (!filteredSummary.length) return null
    return Math.max(...filteredSummary.map((d) => d.Year).filter(Number.isFinite))
  }, [filteredSummary])
  const prevYear = latestYear ? latestYear - 1 : null

  /* ── KPI StatCards ─────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    if (!filteredSummary.length || !latestYear) return null
    const latest = filteredSummary.filter((d) => d.Year === latestYear)
    const prev = prevYear ? filteredSummary.filter((d) => d.Year === prevYear) : []

    const totalTrade = latest.reduce((s, d) => s + (d.TradeValue || 0), 0)
    const prevTrade = prev.reduce((s, d) => s + (d.TradeValue || 0), 0)
    const tradeChange = prevTrade ? (totalTrade - prevTrade) / prevTrade : 0

    const exports = latest.filter((d) => d.TradeType === 'Export').reduce((s, d) => s + (d.TradeValue || 0), 0)
    const imports = latest.filter((d) => d.TradeType === 'Import').reduce((s, d) => s + (d.TradeValue || 0), 0)

    // Texas share (from port data)
    const latestPorts = filteredPorts.filter((d) => d.Year === latestYear)
    const txPorts = latestPorts.filter((d) => d.State === 'Texas')
    const txTrade = txPorts.reduce((s, d) => s + (d.TradeValue || 0), 0)
    const txShare = totalTrade > 0 ? txTrade / totalTrade : 0

    const portCount = new Set(latestPorts.map((d) => d.Port).filter(Boolean)).size

    return { totalTrade, tradeChange, exports, imports, txTrade, txShare, portCount }
  }, [filteredSummary, filteredPorts, latestYear, prevYear])

  /* ── active filter tags ────────────────────────────────────────────── */
  const activeCount = yearFilter.length + (tradeTypeFilter ? 1 : 0) + modeFilter.length + stateFilter.length
  const activeTags = useMemo(() => {
    const tags = []
    yearFilter.forEach((v) => tags.push({ group: 'Year', label: v, onRemove: () => setYearFilter((p) => p.filter((x) => x !== v)) }))
    if (tradeTypeFilter) tags.push({ group: 'Trade Type', label: tradeTypeFilter, onRemove: () => setTradeTypeFilter('') })
    modeFilter.forEach((v) => tags.push({ group: 'Mode', label: v, onRemove: () => setModeFilter((p) => p.filter((x) => x !== v)) }))
    stateFilter.forEach((v) => tags.push({ group: 'State', label: v, onRemove: () => setStateFilter((p) => p.filter((x) => x !== v)) }))
    return tags
  }, [yearFilter, tradeTypeFilter, modeFilter, stateFilter])

  const resetFilters = useCallback(() => {
    setYearFilter([]); setTradeTypeFilter(''); setModeFilter([]); setStateFilter([])
  }, [])

  /* ── render: loading/error ─────────────────────────────────────────── */
  if (datasetErrors.usMexicoPorts) {
    return <DatasetError datasetName="US-Mexico Ports" error={datasetErrors.usMexicoPorts} onRetry={() => loadDataset('usMexicoPorts')} />
  }
  if (loading || usMexicoPorts === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-base text-text-secondary">Loading U.S.-Mexico trade data...</p>
        </div>
      </div>
    )
  }

  /* ── filter controls ───────────────────────────────────────────────── */
  const filterControls = (
    <>
      <FilterMultiSelect label="Year" value={yearFilter} options={filterOptions.year} onChange={setYearFilter} />
      <FilterSelect label="Trade Type" value={tradeTypeFilter} options={filterOptions.tradeType} onChange={setTradeTypeFilter} />
      <FilterMultiSelect label="Mode" value={modeFilter} options={filterOptions.mode} onChange={setModeFilter} />
      {activeTab === 'ports' && (
        <FilterMultiSelect label="State" value={stateFilter} options={filterOptions.state} onChange={setStateFilter} searchable />
      )}
    </>
  )

  /* ── hero ───────────────────────────────────────────────────────────── */
  const heroSection = (
    <div className="gradient-blue text-white relative overflow-visible">
      <HeroStardust seed={52} animate />
      <div className="container-chrome py-10 md:py-14 relative">
        <h2 className="text-2xl md:text-3xl font-bold text-balance text-white">
          U.S.&ndash;Mexico TransBorder Freight
        </h2>
        <p className="text-white/70 mt-2 text-base">
          Surface trade between the United States and Mexico through border ports of entry
          (2007&ndash;{latestYear || '...'}).
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
      filteredEmpty={!filteredSummary.length && !filteredPorts.length}
    >
      {/* KPI StatCards — always visible above tabs */}
      <SectionBlock>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-7xl mx-auto">
          <StatCard
            label={`Total Trade (${latestYear || '---'})`}
            value={stats ? formatCurrency(stats.totalTrade) : '---'}
            trend={stats?.tradeChange > 0 ? 'up' : stats?.tradeChange < 0 ? 'down' : undefined}
            trendLabel={stats ? `${(stats.tradeChange * 100).toFixed(1)}% vs ${prevYear}` : ''}
            highlight variant="primary" icon={DollarSign} delay={0}
          />
          <StatCard
            label={`Exports (${latestYear || '---'})`}
            value={stats ? formatCurrency(stats.exports) : '---'}
            highlight icon={ArrowUpRight} delay={100}
          />
          <StatCard
            label={`Imports (${latestYear || '---'})`}
            value={stats ? formatCurrency(stats.imports) : '---'}
            highlight icon={ArrowDownLeft} delay={200}
          />
          <StatCard
            label={`Texas Share (${latestYear || '---'})`}
            value={stats ? `${(stats.txShare * 100).toFixed(1)}%` : '---'}
            highlight icon={TrendingUp} delay={300}
          />
          <StatCard
            label={`Active Ports (${latestYear || '---'})`}
            value={stats ? String(stats.portCount) : '---'}
            highlight icon={Award} delay={400}
          />
        </div>
      </SectionBlock>

      {/* Tab Bar */}
      <div ref={tabBarRef} className="sticky top-0 z-40 shadow-sm">
        <TabBar
          tabs={TAB_CONFIG}
          activeTab={activeTab}
          onChange={handleTabChange}
          idPrefix="usmx-trade-tab"
        />
      </div>

      {/* Tab Content */}
      {activeTab === 'ports' && (
        <div role="tabpanel" id="usmx-trade-tab-panel-ports" aria-labelledby="usmx-trade-tab-ports">
          <PortsTab
            filteredPorts={filteredPorts}
            filteredPortsNoYear={filteredPortsNoYear}
            filteredSummary={filteredSummary}
            filteredSummaryNoYear={filteredSummaryNoYear}
            latestYear={latestYear}
          />
        </div>
      )}
      {activeTab === 'commodities' && (
        <div role="tabpanel" id="usmx-trade-tab-panel-commodities" aria-labelledby="usmx-trade-tab-commodities">
          <CommoditiesTab
            filteredCommodities={filteredCommodities}
            loadDataset={loadDataset}
            latestYear={latestYear}
            datasetError={datasetErrors.commodityDetail}
          />
        </div>
      )}
      {activeTab === 'flows' && (
        <div role="tabpanel" id="usmx-trade-tab-panel-flows" aria-labelledby="usmx-trade-tab-flows">
          <TradeFlowsTab
            odStateFlows={odStateFlows}
            loadDataset={loadDataset}
            yearFilter={yearFilter}
            tradeTypeFilter={tradeTypeFilter}
            modeFilter={modeFilter}
            datasetError={datasetErrors.odStateFlows}
          />
        </div>
      )}
      {activeTab === 'states' && (
        <div role="tabpanel" id="usmx-trade-tab-panel-states" aria-labelledby="usmx-trade-tab-states">
          <StatesTab
            usStateTrade={usStateTrade}
            mexicanStateTrade={mexicanStateTrade}
            loadDataset={loadDataset}
            latestYear={latestYear}
            yearFilter={yearFilter}
            tradeTypeFilter={tradeTypeFilter}
            modeFilter={modeFilter}
            datasetErrors={datasetErrors}
          />
        </div>
      )}
    </DashboardLayout>
  )
}
