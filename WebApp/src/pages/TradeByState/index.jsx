import { useMemo, useState, useEffect } from 'react'
import { useTransborderStore } from '@/stores/transborderStore'
import { formatCurrency } from '@/lib/chartColors'
import { buildFilterOptions, applyStandardFilters } from '@/lib/transborderHelpers'
import { usePortCoordinates, buildMapPorts } from '@/hooks/usePortMapData'
import DashboardLayout from '@/components/layout/DashboardLayout'
import FilterMultiSelect from '@/components/filters/FilterMultiSelect'
import FilterSelect from '@/components/filters/FilterSelect'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import StatCard from '@/components/ui/StatCard'
import DataTable from '@/components/ui/DataTable'
import BarChart from '@/components/charts/BarChart'
import LineChart from '@/components/charts/LineChart'
import PortMap from '@/components/maps/PortMap'
import HeroStardust from '@/components/ui/HeroStardust'
import { DollarSign, MapPin, Award, TrendingUp } from 'lucide-react'
import DatasetError from '@/components/ui/DatasetError'
import { DL, PAGE_STATE_COLS } from '@/lib/downloadColumns'

export default function TradeByStatePage() {
  const { usStateTrade, datasetErrors, loadDataset } = useTransborderStore()

  /* ── lazy-load datasets on mount ────────────────────────────────── */
  useEffect(() => { loadDataset('usStateTrade'); loadDataset('usMexicoPorts') }, [loadDataset])

  /* ── loading / error ───────────────────────────────────────────── */
  if (datasetErrors.usStateTrade) {
    return <DatasetError datasetName="State Trade" error={datasetErrors.usStateTrade} onRetry={() => loadDataset('usStateTrade')} />
  }
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
  const { usMexicoPorts } = useTransborderStore()

  /* ── port coordinates for map ──────────────────────────────────── */
  const { portCoords } = usePortCoordinates()

  /* ── local filters ──────────────────────────────────────────────── */
  const [selectedYears, setSelectedYears] = useState([])
  const [tradeType, setTradeType] = useState('')
  const [selectedModes, setSelectedModes] = useState([])
  const [country, setCountry] = useState('')

  /* ── derived filter options ─────────────────────────────────────── */
  const filterOpts = useMemo(
    () => buildFilterOptions(data, ['Year', 'TradeType', 'Mode', 'Country']),
    [data],
  )
  const yearOptions = useMemo(() => (filterOpts.Year || []).map(String).reverse(), [filterOpts])
  const tradeTypeOptions = filterOpts.TradeType || []
  const modeOptions = filterOpts.Mode || []
  const countryOptions = filterOpts.Country || []

  /* ── latest year ────────────────────────────────────────────────── */
  const latestYear = useMemo(() => {
    if (selectedYears.length) return Math.max(...selectedYears.map(Number))
    return Math.max(...data.map((d) => d.Year).filter(Number.isFinite))
  }, [selectedYears, data])

  /* ── filtered data (all filters applied) ────────────────────────── */
  const filtered = useMemo(
    () => applyStandardFilters(data, { Year: selectedYears, TradeType: tradeType, Mode: selectedModes, Country: country }),
    [data, selectedYears, tradeType, selectedModes, country],
  )

  /* ── filtered without year (for trend charts) ───────────────────── */
  const filteredNoYear = useMemo(
    () => applyStandardFilters(data, { TradeType: tradeType, Mode: selectedModes, Country: country }),
    [data, tradeType, selectedModes, country],
  )

  /* ── latest-year filtered data ──────────────────────────────────── */
  const latestFiltered = useMemo(() => {
    if (!latestYear) return []
    return filtered.filter((d) => d.Year === latestYear)
  }, [filtered, latestYear])

  /* ── map: filter port data by current filters, build markers ───── */
  const filteredPortsForMap = useMemo(() => {
    if (!usMexicoPorts?.length) return []
    return applyStandardFilters(usMexicoPorts, { Year: selectedYears, TradeType: tradeType, Mode: selectedModes, Country: country })
  }, [usMexicoPorts, selectedYears, tradeType, selectedModes, country])

  const mapPorts = useMemo(
    () => buildMapPorts(filteredPortsForMap, portCoords),
    [filteredPortsForMap, portCoords],
  )

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

      {/* Border Ports Map */}
      {mapPorts.length > 0 && (
        <SectionBlock alt>
          <ChartCard title="Border Ports of Entry" subtitle="Ports sized by trade value across the U.S.-Mexico border">
            <PortMap
              ports={mapPorts}
              formatValue={formatCurrency}
              center={[29.5, -104.0]}
              zoom={5}
              height="480px"
            />
          </ChartCard>
        </SectionBlock>
      )}

      {/* Bar: States Ranked by Trade Value (horizontal, top 15) */}
      <SectionBlock>
        <ChartCard title={`Top 15 States by Trade Value (${latestYear || '—'})`} subtitle="States ranked by total cross-border trade value"
          downloadData={{ summary: { data: barData, filename: 'top-15-states', columns: { State: 'State', TradeValue: 'Trade Value ($)' } } }}
        >
          <BarChart data={barData} xKey="State" yKey="TradeValue" horizontal formatValue={formatCurrency} />
        </ChartCard>
      </SectionBlock>

      {/* Line: Top 5 State Trends */}
      <SectionBlock alt>
        <ChartCard title="Top 5 State Trends" subtitle="Annual trade value for the five largest trading states"
          downloadData={{
            summary: { data: trendData, filename: 'state-trends', columns: { Year: 'Year', TradeValue: 'Trade Value ($)', State: 'State' } },
            detail: { data: filteredNoYear, filename: 'state-trends-detail', columns: PAGE_STATE_COLS },
          }}
        >
          <LineChart data={trendData} xKey="Year" yKey="TradeValue" seriesKey="State" formatValue={formatCurrency} />
        </ChartCard>
      </SectionBlock>

      {/* Data Table */}
      <SectionBlock>
        <ChartCard title={`State Detail (${latestYear || '—'})`}
          downloadData={{
            summary: { data: stateAgg, filename: 'state-detail', columns: DL.stateDetail },
            detail: { data: filtered, filename: 'state-detail-full', columns: PAGE_STATE_COLS },
          }}
        >
          <DataTable data={stateAgg} columns={tableColumns} pageSize={15} />
        </ChartCard>
      </SectionBlock>
    </DashboardLayout>
  )
}
