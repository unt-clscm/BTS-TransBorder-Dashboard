/**
 * TexasMexico/index.jsx — Texas-Mexico Deep-Dive (Surface Freight)
 * ----------------------------------------------------------------
 * Five-tab dashboard for Texas-Mexico border trade data (2007+).
 * Lazy-loads datasets: texasMexicoPorts on mount, texasMexicoCommodities
 * and monthlyTrends when their respective tabs become active.
 */
import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BarChart3, MapPin, ShoppingCart, Truck, CalendarDays, DollarSign, ArrowUpDown, Package, Activity } from 'lucide-react'
import HeroStardust from '@/components/ui/HeroStardust'
import { useTransborderStore } from '@/stores/transborderStore'
import { formatCurrency, formatCompact, formatNumber, CHART_COLORS } from '@/lib/chartColors'
const trackTabSwitch = () => {}
import DashboardLayout from '@/components/layout/DashboardLayout'
import FilterSelect from '@/components/filters/FilterSelect'
import FilterMultiSelect from '@/components/filters/FilterMultiSelect'
import StatCard from '@/components/ui/StatCard'
import SectionBlock from '@/components/ui/SectionBlock'
import TabBar from '@/components/ui/TabBar'

import OverviewTab from './tabs/OverviewTab'
import PortsTab from './tabs/PortsTab'
import CommoditiesTab from './tabs/CommoditiesTab'
import ModesTab from './tabs/ModesTab'
import MonthlyTab from './tabs/MonthlyTab'

/* ── tab configuration ─────────────────────────────────────────────── */
const TAB_CONFIG = [
  { key: 'overview',    label: 'Overview',     icon: BarChart3 },
  { key: 'ports',       label: 'Ports',        icon: MapPin },
  { key: 'commodities', label: 'Commodities',  icon: ShoppingCart },
  { key: 'modes',       label: 'Modes',        icon: Truck },
  { key: 'monthly',     label: 'Monthly',      icon: CalendarDays },
]

const REGION_OPTIONS = [
  { value: 'El Paso', label: 'El Paso' },
  { value: 'Laredo', label: 'Laredo' },
  { value: 'Pharr', label: 'Pharr' },
]

const TRADE_TYPE_OPTIONS = [
  { value: 'Exports', label: 'Exports' },
  { value: 'Imports', label: 'Imports' },
]

export default function TexasMexicoPage() {
  const {
    texasMexicoPorts, texasMexicoCommodities, monthlyTrends,
    loading, loadDataset,
  } = useTransborderStore()

  /* ── local filter state ──────────────────────────────────────────── */
  const [yearFilter, setYearFilter] = useState([])
  const [tradeTypeFilter, setTradeTypeFilter] = useState('')
  const [modeFilter, setModeFilter] = useState([])
  const [regionFilter, setRegionFilter] = useState('')

  /* ── tab state (synced to URL) ───────────────────────────────────── */
  const [searchParams, setSearchParams] = useSearchParams()
  const VALID_TABS = useMemo(() => new Set(TAB_CONFIG.map((t) => t.key)), [])
  const rawTab = searchParams.get('tab')
  const activeTab = VALID_TABS.has(rawTab) ? rawTab : 'overview'
  const handleTabChange = useCallback((key) => {
    const tab = TAB_CONFIG.find((t) => t.key === key)
    trackTabSwitch(key, tab?.label || key, '/texas-mexico-freight')
    setSearchParams({ tab: key }, { replace: true })
  }, [setSearchParams])
  const tabBarRef = useRef(null)

  /* ── lazy dataset loading ────────────────────────────────────────── */
  useEffect(() => {
    loadDataset('texasMexicoPorts')
  }, [loadDataset])

  useEffect(() => {
    if (activeTab === 'commodities') loadDataset('texasMexicoCommodities')
    if (activeTab === 'monthly') loadDataset('monthlyTrends')
  }, [activeTab, loadDataset])

  /* ── derived filter options (from texasMexicoPorts) ──────────────── */
  const yearOptions = useMemo(() => {
    if (!texasMexicoPorts) return []
    return [...new Set(texasMexicoPorts.map((d) => d.Year))].filter(Number.isFinite).sort().map(String)
  }, [texasMexicoPorts])

  const modeOptions = useMemo(() => {
    if (!texasMexicoPorts) return []
    return [...new Set(texasMexicoPorts.map((d) => d.Mode))].filter(Boolean).sort()
  }, [texasMexicoPorts])

  /* ── filtered data ───────────────────────────────────────────────── */
  const applyFilters = useCallback((data) => {
    if (!data) return []
    let result = data
    if (yearFilter.length) result = result.filter((d) => yearFilter.includes(String(d.Year)))
    if (tradeTypeFilter) result = result.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter.length) result = result.filter((d) => modeFilter.includes(d.Mode))
    if (regionFilter) result = result.filter((d) => d.Region === regionFilter)
    return result
  }, [yearFilter, tradeTypeFilter, modeFilter, regionFilter])

  const filteredPorts = useMemo(() => applyFilters(texasMexicoPorts), [texasMexicoPorts, applyFilters])

  const filteredCommodities = useMemo(() => {
    if (!texasMexicoCommodities) return null
    let result = texasMexicoCommodities
    if (yearFilter.length) result = result.filter((d) => yearFilter.includes(String(d.Year)))
    if (tradeTypeFilter) result = result.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter.length) result = result.filter((d) => modeFilter.includes(d.Mode))
    return result
  }, [texasMexicoCommodities, yearFilter, tradeTypeFilter, modeFilter])

  const filteredMonthly = useMemo(() => {
    if (!monthlyTrends) return null
    let result = monthlyTrends.filter((d) => d.Country === 'Mexico')
    if (yearFilter.length) result = result.filter((d) => yearFilter.includes(String(d.Year)))
    if (tradeTypeFilter) result = result.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter.length) result = result.filter((d) => modeFilter.includes(d.Mode))
    return result
  }, [monthlyTrends, yearFilter, tradeTypeFilter, modeFilter])

  /* ── year-agnostic filtered data (for trend charts) ──────────────── */
  const filteredPortsNoYear = useMemo(() => {
    if (!texasMexicoPorts) return []
    let result = texasMexicoPorts
    if (tradeTypeFilter) result = result.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter.length) result = result.filter((d) => modeFilter.includes(d.Mode))
    if (regionFilter) result = result.filter((d) => d.Region === regionFilter)
    return result
  }, [texasMexicoPorts, tradeTypeFilter, modeFilter, regionFilter])

  /* ── KPIs ────────────────────────────────────────────────────────── */
  const latestYear = useMemo(() => {
    if (!filteredPorts.length) return null
    return Math.max(...filteredPorts.map((d) => d.Year).filter(Number.isFinite))
  }, [filteredPorts])

  const stats = useMemo(() => {
    if (!filteredPorts.length || !latestYear) return null
    const latest = filteredPorts.filter((d) => d.Year === latestYear)
    const prevYear = latestYear - 1
    const prev = filteredPorts.filter((d) => d.Year === prevYear)

    const totalTrade = latest.reduce((s, d) => s + (d.TradeValue || 0), 0)
    const prevTrade = prev.reduce((s, d) => s + (d.TradeValue || 0), 0)
    const tradeChange = prevTrade ? (totalTrade - prevTrade) / prevTrade : 0

    const exports = latest.filter((d) => d.TradeType === 'Exports').reduce((s, d) => s + (d.TradeValue || 0), 0)
    const imports = latest.filter((d) => d.TradeType === 'Imports').reduce((s, d) => s + (d.TradeValue || 0), 0)
    const portCount = new Set(latest.map((d) => d.Port)).size

    const modeMap = new Map()
    latest.forEach((d) => {
      if (!d.Mode) return
      modeMap.set(d.Mode, (modeMap.get(d.Mode) || 0) + (d.TradeValue || 0))
    })
    let topMode = '—'
    let topModeVal = 0
    modeMap.forEach((v, k) => { if (v > topModeVal) { topMode = k; topModeVal = v } })

    return { totalTrade, tradeChange, exports, imports, portCount, topMode, latestYear, prevYear }
  }, [filteredPorts, latestYear])

  /* ── active filter count & reset ─────────────────────────────────── */
  const activeCount = yearFilter.length + (tradeTypeFilter ? 1 : 0) + modeFilter.length + (regionFilter ? 1 : 0)

  const activeTags = useMemo(() => {
    const tags = []
    yearFilter.forEach((v) =>
      tags.push({ group: 'Year', label: v, onRemove: () => setYearFilter((prev) => prev.filter((x) => x !== v)) })
    )
    if (tradeTypeFilter) {
      tags.push({ group: 'Trade Type', label: tradeTypeFilter, onRemove: () => setTradeTypeFilter('') })
    }
    modeFilter.forEach((v) =>
      tags.push({ group: 'Mode', label: v, onRemove: () => setModeFilter((prev) => prev.filter((x) => x !== v)) })
    )
    if (regionFilter) {
      tags.push({ group: 'Region', label: regionFilter, onRemove: () => setRegionFilter('') })
    }
    return tags
  }, [yearFilter, tradeTypeFilter, modeFilter, regionFilter])

  const resetFilters = useCallback(() => {
    setYearFilter([])
    setTradeTypeFilter('')
    setModeFilter([])
    setRegionFilter('')
  }, [])

  /* ── render ──────────────────────────────────────────────────────── */
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
      <FilterMultiSelect label="Year" value={yearFilter} options={yearOptions} onChange={setYearFilter} />
      <FilterSelect label="Trade Type" value={tradeTypeFilter} options={TRADE_TYPE_OPTIONS} onChange={setTradeTypeFilter} />
      <FilterMultiSelect label="Mode" value={modeFilter} options={modeOptions} onChange={setModeFilter} />
      <FilterSelect label="Region" value={regionFilter} options={REGION_OPTIONS} onChange={setRegionFilter} />
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
          Deep dive into cross-border freight flows between Texas and Mexico ports of entry (2007&ndash;{latestYear || '…'}).
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
      {/* KPI Cards — always visible above tabs */}
      <SectionBlock>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-7xl mx-auto">
          <StatCard
            label={`Total TX-MX Trade (${latestYear || '—'})`}
            value={stats ? formatCurrency(stats.totalTrade) : '—'}
            trend={stats?.tradeChange > 0 ? 'up' : stats?.tradeChange < 0 ? 'down' : undefined}
            trendLabel={stats ? `${(stats.tradeChange * 100).toFixed(1)}% vs ${stats.prevYear}` : ''}
            highlight variant="primary" icon={DollarSign} delay={0}
          />
          <StatCard
            label={`Exports (${latestYear || '—'})`}
            value={stats ? formatCurrency(stats.exports) : '—'}
            highlight icon={ArrowUpDown} delay={100}
          />
          <StatCard
            label={`Imports (${latestYear || '—'})`}
            value={stats ? formatCurrency(stats.imports) : '—'}
            highlight icon={Package} delay={200}
          />
          <StatCard
            label={`Active Ports (${latestYear || '—'})`}
            value={stats ? String(stats.portCount) : '—'}
            highlight icon={MapPin} delay={300}
          />
          <StatCard
            label={`Top Mode (${latestYear || '—'})`}
            value={stats ? stats.topMode : '—'}
            highlight icon={Truck} delay={400}
          />
        </div>
      </SectionBlock>

      {/* Tab Bar */}
      <div ref={tabBarRef} className="sticky top-0 z-40 shadow-sm">
        <TabBar
          tabs={TAB_CONFIG}
          activeTab={activeTab}
          onChange={handleTabChange}
          idPrefix="txmx-freight-tab"
        />
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div role="tabpanel" id="txmx-freight-tab-panel-overview" aria-labelledby="txmx-freight-tab-overview">
          <OverviewTab
            filteredPorts={filteredPorts}
            filteredPortsNoYear={filteredPortsNoYear}
            latestYear={latestYear}
          />
        </div>
      )}
      {activeTab === 'ports' && (
        <div role="tabpanel" id="txmx-freight-tab-panel-ports" aria-labelledby="txmx-freight-tab-ports">
          <PortsTab
            filteredPorts={filteredPorts}
            filteredPortsNoYear={filteredPortsNoYear}
            latestYear={latestYear}
          />
        </div>
      )}
      {activeTab === 'commodities' && (
        <div role="tabpanel" id="txmx-freight-tab-panel-commodities" aria-labelledby="txmx-freight-tab-commodities">
          <CommoditiesTab
            filteredCommodities={filteredCommodities}
            loadDataset={loadDataset}
            latestYear={latestYear}
          />
        </div>
      )}
      {activeTab === 'modes' && (
        <div role="tabpanel" id="txmx-freight-tab-panel-modes" aria-labelledby="txmx-freight-tab-modes">
          <ModesTab
            filteredPorts={filteredPorts}
            filteredPortsNoYear={filteredPortsNoYear}
            latestYear={latestYear}
          />
        </div>
      )}
      {activeTab === 'monthly' && (
        <div role="tabpanel" id="txmx-freight-tab-panel-monthly" aria-labelledby="txmx-freight-tab-monthly">
          <MonthlyTab
            filteredMonthly={filteredMonthly}
            loadDataset={loadDataset}
            latestYear={latestYear}
          />
        </div>
      )}
    </DashboardLayout>
  )
}
