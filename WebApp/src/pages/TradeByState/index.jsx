import { useMemo, useState, useEffect } from 'react'
import { useTransborderStore } from '@/stores/transborderStore'
import { formatCurrency, formatCompact } from '@/lib/chartColors'
import DashboardLayout from '@/components/layout/DashboardLayout'
import FilterSidebar from '@/components/filters/FilterSidebar'
import FilterMultiSelect from '@/components/filters/FilterMultiSelect'
import FilterSelect from '@/components/filters/FilterSelect'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import StatCard from '@/components/ui/StatCard'
import DataTable from '@/components/ui/DataTable'
import BarChart from '@/components/charts/BarChart'
import LineChart from '@/components/charts/LineChart'
import HeroStardust from '@/components/ui/HeroStardust'
import { DollarSign, MapPin, Award, TrendingUp } from 'lucide-react'

export default function TradeByStatePage() {
  const { usStateTrade, loadDataset } = useTransborderStore()

  /* ── lazy-load dataset on mount ─────────────────────────────────── */
  useEffect(() => { loadDataset('usStateTrade') }, [loadDataset])

  /* ── loading spinner ────────────────────────────────────────────── */
  if (!usStateTrade) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-base text-text-secondary">Loading state trade data...</p>
        </div>
      </div>
    )
  }

  return <TradeByStateInner data={usStateTrade} />
}

/* ── Inner component (renders once data is loaded) ────────────────── */
function TradeByStateInner({ data }) {
  /* ── local filters ──────────────────────────────────────────────── */
  const [selectedYears, setSelectedYears] = useState([])
  const [tradeType, setTradeType] = useState('')
  const [selectedModes, setSelectedModes] = useState([])
  const [country, setCountry] = useState('')

  /* ── derived filter options ─────────────────────────────────────── */
  const yearOptions = useMemo(() => {
    const years = [...new Set(data.map((d) => d.Year).filter(Number.isFinite))]
    return years.sort((a, b) => b - a).map(String)
  }, [data])

  const tradeTypeOptions = useMemo(() => {
    return [...new Set(data.map((d) => d.TradeType).filter(Boolean))].sort()
  }, [data])

  const modeOptions = useMemo(() => {
    return [...new Set(data.map((d) => d.Mode).filter(Boolean))].sort()
  }, [data])

  const countryOptions = useMemo(() => {
    return [...new Set(data.map((d) => d.Country).filter(Boolean))].sort()
  }, [data])

  /* ── latest year ────────────────────────────────────────────────── */
  const latestYear = useMemo(() => {
    if (selectedYears.length) return Math.max(...selectedYears.map(Number))
    return Math.max(...data.map((d) => d.Year).filter(Number.isFinite))
  }, [selectedYears, data])

  /* ── filtered data (all filters applied) ────────────────────────── */
  const filtered = useMemo(() => {
    let rows = data
    if (selectedYears.length) rows = rows.filter((d) => selectedYears.includes(String(d.Year)))
    if (tradeType) rows = rows.filter((d) => d.TradeType === tradeType)
    if (selectedModes.length) rows = rows.filter((d) => selectedModes.includes(d.Mode))
    if (country) rows = rows.filter((d) => d.Country === country)
    return rows
  }, [data, selectedYears, tradeType, selectedModes, country])

  /* ── filtered without year (for trend charts) ───────────────────── */
  const filteredNoYear = useMemo(() => {
    let rows = data
    if (tradeType) rows = rows.filter((d) => d.TradeType === tradeType)
    if (selectedModes.length) rows = rows.filter((d) => selectedModes.includes(d.Mode))
    if (country) rows = rows.filter((d) => d.Country === country)
    return rows
  }, [data, tradeType, selectedModes, country])

  /* ── latest-year filtered data ──────────────────────────────────── */
  const latestFiltered = useMemo(() => {
    if (!latestYear) return []
    return filtered.filter((d) => d.Year === latestYear)
  }, [filtered, latestYear])

  /* ── state aggregation (latest year) ────────────────────────────── */
  const stateAgg = useMemo(() => {
    const map = new Map()
    for (const d of latestFiltered) {
      const state = d.State || 'Unknown'
      if (!map.has(state)) map.set(state, { State: state, Total: 0, Exports: 0, Imports: 0 })
      const entry = map.get(state)
      entry.Total += d.TradeValue || 0
      if (d.TradeType === 'Export') entry.Exports += d.TradeValue || 0
      if (d.TradeType === 'Import') entry.Imports += d.TradeValue || 0
    }
    return [...map.values()].sort((a, b) => b.Total - a.Total)
  }, [latestFiltered])

  /* ── stat cards ─────────────────────────────────────────────────── */
  const totalTrade = useMemo(() => stateAgg.reduce((s, d) => s + d.Total, 0), [stateAgg])
  const stateCount = stateAgg.length
  const topState = stateAgg[0] || null

  /* ── bar: top 15 states (horizontal) ────────────────────────────── */
  const barData = useMemo(() => {
    return stateAgg.slice(0, 15).map((d) => ({ State: d.State, TradeValue: d.Total }))
  }, [stateAgg])

  /* ── line: top 5 state trends ───────────────────────────────────── */
  const trendData = useMemo(() => {
    // Find top 5 states by total across all years
    const totals = new Map()
    for (const d of filteredNoYear) {
      const state = d.State || 'Unknown'
      totals.set(state, (totals.get(state) || 0) + (d.TradeValue || 0))
    }
    const top5 = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([s]) => s)
    const top5Set = new Set(top5)

    // Aggregate by year + state
    const map = new Map()
    for (const d of filteredNoYear) {
      const state = d.State || 'Unknown'
      if (!top5Set.has(state)) continue
      const key = `${d.Year}-${state}`
      if (!map.has(key)) map.set(key, { Year: d.Year, State: state, TradeValue: 0 })
      map.get(key).TradeValue += d.TradeValue || 0
    }
    return [...map.values()].sort((a, b) => a.Year - b.Year)
  }, [filteredNoYear])

  /* ── data table ─────────────────────────────────────────────────── */
  const tableColumns = [
    { key: 'State', label: 'State' },
    { key: 'Total', label: 'Total', format: formatCurrency },
    { key: 'Exports', label: 'Exports', format: formatCurrency },
    { key: 'Imports', label: 'Imports', format: formatCurrency },
  ]

  /* ── active filter tracking ─────────────────────────────────────── */
  const activeCount =
    (selectedYears.length > 0 ? 1 : 0) +
    (tradeType ? 1 : 0) +
    (selectedModes.length > 0 ? 1 : 0) +
    (country ? 1 : 0)

  const activeTags = useMemo(() => {
    const tags = []
    if (selectedYears.length) {
      selectedYears.forEach((y) => tags.push({
        group: 'Year', label: y,
        onRemove: () => setSelectedYears((prev) => prev.filter((v) => v !== y)),
      }))
    }
    if (tradeType) tags.push({ group: 'Trade Type', label: tradeType, onRemove: () => setTradeType('') })
    if (selectedModes.length) {
      selectedModes.forEach((m) => tags.push({
        group: 'Mode', label: m,
        onRemove: () => setSelectedModes((prev) => prev.filter((v) => v !== m)),
      }))
    }
    if (country) tags.push({ group: 'Country', label: country, onRemove: () => setCountry('') })
    return tags
  }, [selectedYears, tradeType, selectedModes, country])

  const resetFilters = () => {
    setSelectedYears([])
    setTradeType('')
    setSelectedModes([])
    setCountry('')
  }

  /* ── render ─────────────────────────────────────────────────────── */
  const hero = (
    <div className="gradient-blue text-white relative overflow-hidden">
      <HeroStardust seed={99} animate />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-14 relative">
        <h2 className="text-3xl md:text-4xl font-bold text-white text-balance">
          TransBorder Trade by U.S. State
        </h2>
        <p className="text-white/80 mt-3 text-base md:text-lg max-w-3xl">
          State-level breakdown of U.S. cross-border surface trade (2007+)
          {latestYear ? ` — data through ${latestYear}` : ''}.
        </p>
      </div>
    </div>
  )

  const filterControls = (
    <>
      <FilterMultiSelect
        label="Year"
        value={selectedYears}
        options={yearOptions}
        onChange={setSelectedYears}
        searchable
      />
      <FilterSelect
        label="Trade Type"
        value={tradeType}
        options={tradeTypeOptions}
        onChange={setTradeType}
      />
      <FilterMultiSelect
        label="Mode"
        value={selectedModes}
        options={modeOptions}
        onChange={setSelectedModes}
      />
      <FilterSelect
        label="Country"
        value={country}
        options={countryOptions}
        onChange={setCountry}
      />
    </>
  )

  return (
    <DashboardLayout
      hero={hero}
      filters={filterControls}
      onResetAll={resetFilters}
      activeCount={activeCount}
      activeTags={activeTags}
      filteredEmpty={filtered.length === 0 && data.length > 0}
    >
      {/* Stat Cards */}
      <SectionBlock>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 grid-rows-[auto] items-start">
          <StatCard
            label={`Total Trade (${latestYear || '—'})`}
            value={formatCurrency(totalTrade)}
            icon={DollarSign}
            highlight
            variant="primary"
            delay={0}
          />
          <StatCard
            label="States"
            value={String(stateCount)}
            icon={MapPin}
            delay={80}
          />
          <StatCard
            label="Top State"
            value={topState ? topState.State : '—'}
            icon={Award}
            delay={160}
          />
          <StatCard
            label="Top State Value"
            value={topState ? formatCurrency(topState.Total) : '$0'}
            trendLabel={topState?.State || '—'}
            icon={TrendingUp}
            delay={240}
          />
        </div>
      </SectionBlock>

      {/* Bar: States Ranked by Trade Value (horizontal, top 15) */}
      <SectionBlock alt>
        <ChartCard title={`Top 15 States by Trade Value (${latestYear || '—'})`} subtitle="States ranked by total cross-border trade value">
          <BarChart data={barData} xKey="State" yKey="TradeValue" horizontal formatValue={formatCurrency} />
        </ChartCard>
      </SectionBlock>

      {/* Line: Top 5 State Trends */}
      <SectionBlock>
        <ChartCard title="Top 5 State Trends" subtitle="Annual trade value for the five largest trading states">
          <LineChart data={trendData} xKey="Year" yKey="TradeValue" seriesKey="State" formatValue={formatCurrency} />
        </ChartCard>
      </SectionBlock>

      {/* Data Table */}
      <SectionBlock alt>
        <ChartCard title={`State Detail (${latestYear || '—'})`}>
          <DataTable data={stateAgg} columns={tableColumns} pageSize={15} />
        </ChartCard>
      </SectionBlock>
    </DashboardLayout>
  )
}
