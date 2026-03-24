import { useMemo, useState } from 'react'
import { useTransborderStore } from '@/stores/transborderStore'
import { formatCurrency } from '@/lib/chartColors'
import DashboardLayout from '@/components/layout/DashboardLayout'
import FilterSidebar from '@/components/filters/FilterSidebar'
import FilterMultiSelect from '@/components/filters/FilterMultiSelect'
import FilterSelect from '@/components/filters/FilterSelect'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import StatCard from '@/components/ui/StatCard'
import DataTable from '@/components/ui/DataTable'
import DonutChart from '@/components/charts/DonutChart'
import BarChart from '@/components/charts/BarChart'
import LineChart from '@/components/charts/LineChart'
import StackedBarChart from '@/components/charts/StackedBarChart'
import DivergingBarChart from '@/components/charts/DivergingBarChart'
import HeroStardust from '@/components/ui/HeroStardust'
import { DollarSign, Truck, TrendingUp, BarChart3 } from 'lucide-react'
import { DL, PAGE_TRANSBORDER_COLS } from '@/lib/downloadColumns'

export default function TradeByModePage() {
  const { usTransborder } = useTransborderStore()

  /* ── local filters ──────────────────────────────────────────────── */
  const [selectedYears, setSelectedYears] = useState([])
  const [tradeType, setTradeType] = useState('')
  const [country, setCountry] = useState('')

  /* ── derived filter options ─────────────────────────────────────── */
  const yearOptions = useMemo(() => {
    if (!usTransborder?.length) return []
    const years = [...new Set(usTransborder.map((d) => d.Year).filter(Number.isFinite))]
    return years.sort((a, b) => b - a).map(String)
  }, [usTransborder])

  const tradeTypeOptions = useMemo(() => {
    if (!usTransborder?.length) return []
    return [...new Set(usTransborder.map((d) => d.TradeType).filter(Boolean))].sort()
  }, [usTransborder])

  const countryOptions = useMemo(() => {
    if (!usTransborder?.length) return []
    return [...new Set(usTransborder.map((d) => d.Country).filter(Boolean))].sort()
  }, [usTransborder])

  /* ── latest year (from selection or data) ───────────────────────── */
  const latestYear = useMemo(() => {
    if (selectedYears.length) return Math.max(...selectedYears.map(Number))
    if (!usTransborder?.length) return null
    return Math.max(...usTransborder.map((d) => d.Year).filter(Number.isFinite))
  }, [selectedYears, usTransborder])

  /* ── filtered data (all filters applied) ────────────────────────── */
  const filtered = useMemo(() => {
    if (!usTransborder?.length) return []
    let data = usTransborder
    if (selectedYears.length) data = data.filter((d) => selectedYears.includes(String(d.Year)))
    if (tradeType) data = data.filter((d) => d.TradeType === tradeType)
    if (country) data = data.filter((d) => d.Country === country)
    return data
  }, [usTransborder, selectedYears, tradeType, country])

  /* ── filtered data without year filter (for trend charts) ───────── */
  const filteredNoYear = useMemo(() => {
    if (!usTransborder?.length) return []
    let data = usTransborder
    if (tradeType) data = data.filter((d) => d.TradeType === tradeType)
    if (country) data = data.filter((d) => d.Country === country)
    return data
  }, [usTransborder, tradeType, country])

  /* ── latest-year filtered data ──────────────────────────────────── */
  const latestFiltered = useMemo(() => {
    if (!latestYear) return []
    return filtered.filter((d) => d.Year === latestYear)
  }, [filtered, latestYear])

  /* ── mode aggregation (latest year) ─────────────────────────────── */
  const modeAgg = useMemo(() => {
    const map = new Map()
    for (const d of latestFiltered) {
      const mode = d.Mode || 'Unknown'
      if (!map.has(mode)) map.set(mode, { Mode: mode, Total: 0, Exports: 0, Imports: 0 })
      const entry = map.get(mode)
      entry.Total += d.TradeValue || 0
      if (d.TradeType === 'Export') entry.Exports += d.TradeValue || 0
      if (d.TradeType === 'Import') entry.Imports += d.TradeValue || 0
    }
    return [...map.values()].sort((a, b) => b.Total - a.Total)
  }, [latestFiltered])

  const totalTrade = useMemo(() => modeAgg.reduce((s, d) => s + d.Total, 0), [modeAgg])

  /* ── stat cards ─────────────────────────────────────────────────── */
  const topModes = modeAgg.slice(0, 3)

  /* ── donut data ─────────────────────────────────────────────────── */
  const donutData = useMemo(() => {
    return modeAgg.map((d) => ({ label: d.Mode, value: d.Total }))
  }, [modeAgg])

  /* ── bar data (vertical, latest year) ───────────────────────────── */
  const barData = useMemo(() => {
    return modeAgg.map((d) => ({ Mode: d.Mode, TradeValue: d.Total }))
  }, [modeAgg])

  /* ── line chart: mode trends over time ──────────────────────────── */
  const trendData = useMemo(() => {
    const map = new Map()
    for (const d of filteredNoYear) {
      const key = `${d.Year}-${d.Mode || 'Unknown'}`
      if (!map.has(key)) map.set(key, { Year: d.Year, Mode: d.Mode || 'Unknown', TradeValue: 0 })
      map.get(key).TradeValue += d.TradeValue || 0
    }
    return [...map.values()].sort((a, b) => a.Year - b.Year)
  }, [filteredNoYear])

  /* ── stacked bar: mode composition by year (wide format) ────────── */
  const stackedByYear = useMemo(() => {
    const modes = new Set()
    const byYear = new Map()
    for (const d of filteredNoYear) {
      if (!d.Year) continue
      const mode = d.Mode || 'Unknown'
      modes.add(mode)
      if (!byYear.has(d.Year)) byYear.set(d.Year, { Year: d.Year })
      byYear.get(d.Year)[mode] = (byYear.get(d.Year)[mode] || 0) + (d.TradeValue || 0)
    }
    // Sort modes by total descending
    const modeTotals = new Map()
    modes.forEach((m) => {
      let total = 0
      byYear.forEach((row) => { total += row[m] || 0 })
      modeTotals.set(m, total)
    })
    const sortedModes = [...modes].sort((a, b) => modeTotals.get(b) - modeTotals.get(a))

    const data = Array.from(byYear.values())
      .map((row) => {
        sortedModes.forEach((m) => { if (!(m in row)) row[m] = 0 })
        return row
      })
      .sort((a, b) => a.Year - b.Year)
    return { data, keys: sortedModes }
  }, [filteredNoYear])

  /* ── diverging bar: import/export balance by mode ───────────────── */
  const divergingData = useMemo(() => {
    const map = new Map()
    for (const d of latestFiltered) {
      const mode = d.Mode || 'Unknown'
      if (!map.has(mode)) map.set(mode, { label: mode, Exports: 0, Imports: 0 })
      const entry = map.get(mode)
      if (d.TradeType === 'Export') entry.Exports += d.TradeValue || 0
      if (d.TradeType === 'Import') entry.Imports += d.TradeValue || 0
    }
    return [...map.values()].sort((a, b) => (b.Exports + Math.abs(b.Imports)) - (a.Exports + Math.abs(a.Imports)))
  }, [latestFiltered])

  /* ── data table ─────────────────────────────────────────────────── */
  const tableData = useMemo(() => {
    return modeAgg.map((d) => ({
      ...d,
      Share: totalTrade ? ((d.Total / totalTrade) * 100).toFixed(1) + '%' : '0%',
    }))
  }, [modeAgg, totalTrade])

  const tableColumns = [
    { key: 'Mode', label: 'Mode' },
    { key: 'Total', label: 'Total', format: formatCurrency },
    { key: 'Exports', label: 'Exports', format: formatCurrency },
    { key: 'Imports', label: 'Imports', format: formatCurrency },
    { key: 'Share', label: 'Share %' },
  ]

  /* ── active filter tracking ─────────────────────────────────────── */
  const activeCount = (selectedYears.length > 0 ? 1 : 0) + (tradeType ? 1 : 0) + (country ? 1 : 0)

  const activeTags = useMemo(() => {
    const tags = []
    if (selectedYears.length) {
      selectedYears.forEach((y) => tags.push({
        group: 'Year', label: y,
        onRemove: () => setSelectedYears((prev) => prev.filter((v) => v !== y)),
      }))
    }
    if (tradeType) tags.push({ group: 'Trade Type', label: tradeType, onRemove: () => setTradeType('') })
    if (country) tags.push({ group: 'Country', label: country, onRemove: () => setCountry('') })
    return tags
  }, [selectedYears, tradeType, country])

  const resetFilters = () => {
    setSelectedYears([])
    setTradeType('')
    setCountry('')
  }

  /* ── render ─────────────────────────────────────────────────────── */
  const hero = (
    <div className="gradient-blue text-white relative overflow-hidden">
      <HeroStardust seed={42} animate />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-14 relative">
        <h2 className="text-3xl md:text-4xl font-bold text-white text-balance">
          TransBorder Trade by Transportation Mode
        </h2>
        <p className="text-white/80 mt-3 text-base md:text-lg max-w-3xl">
          Analyzing U.S.-Canada and U.S.-Mexico surface trade by transportation mode
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
      filteredEmpty={filtered.length === 0 && usTransborder?.length > 0}
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
          {topModes[0] && (
            <StatCard
              label="Top Mode"
              value={formatCurrency(topModes[0].Total)}
              trendLabel={topModes[0].Mode}
              icon={Truck}
              delay={80}
            />
          )}
          {topModes[1] && (
            <StatCard
              label="2nd Mode"
              value={formatCurrency(topModes[1].Total)}
              trendLabel={topModes[1].Mode}
              icon={TrendingUp}
              delay={160}
            />
          )}
          {topModes[2] && (
            <StatCard
              label="3rd Mode"
              value={formatCurrency(topModes[2].Total)}
              trendLabel={topModes[2].Mode}
              icon={BarChart3}
              delay={240}
            />
          )}
        </div>
      </SectionBlock>

      {/* Donut: Mode Share */}
      <SectionBlock alt>
        <ChartCard title={`Mode Share (${latestYear || '—'})`} subtitle="Distribution of trade value by transportation mode"
          downloadData={{ summary: { data: donutData, filename: 'mode-share', columns: DL.modeRank } }}
        >
          <DonutChart data={donutData} labelKey="label" valueKey="value" formatValue={formatCurrency} />
        </ChartCard>
      </SectionBlock>

      {/* Bar: Mode Comparison */}
      <SectionBlock>
        <ChartCard title={`Mode Comparison (${latestYear || '—'})`} subtitle="Trade value by transportation mode"
          downloadData={{ summary: { data: barData, filename: 'mode-comparison', columns: { Mode: 'Mode', TradeValue: 'Trade Value ($)' } } }}
        >
          <BarChart data={barData} xKey="Mode" yKey="TradeValue" formatValue={formatCurrency} />
        </ChartCard>
      </SectionBlock>

      {/* Line: Mode Trends Over Time */}
      <SectionBlock alt>
        <ChartCard title="Mode Trends Over Time" subtitle="Annual trade value by mode across all years"
          downloadData={{
            summary: { data: trendData, filename: 'mode-trends', columns: { Year: 'Year', TradeValue: 'Trade Value ($)', Mode: 'Mode' } },
            detail: { data: filteredNoYear, filename: 'mode-trends-detail', columns: PAGE_TRANSBORDER_COLS },
          }}
        >
          <LineChart data={trendData} xKey="Year" yKey="TradeValue" seriesKey="Mode" formatValue={formatCurrency} />
        </ChartCard>
      </SectionBlock>

      {/* Stacked Bar: Mode Composition by Year */}
      <SectionBlock>
        <ChartCard title="Mode Composition by Year" subtitle="Stacked trade value showing mode mix over time"
          downloadData={{ summary: { data: stackedByYear.data, filename: 'mode-composition-by-year' } }}
        >
          <StackedBarChart data={stackedByYear.data} xKey="Year" stackKeys={stackedByYear.keys} formatValue={formatCurrency} />
        </ChartCard>
      </SectionBlock>

      {/* Diverging Bar: Import/Export Balance by Mode */}
      <SectionBlock alt>
        <ChartCard title={`Import/Export Balance by Mode (${latestYear || '—'})`} subtitle="Exports extend right, imports extend left"
          downloadData={{ summary: { data: divergingData, filename: 'import-export-balance-by-mode', columns: DL.balanceByMode } }}
        >
          <DivergingBarChart data={divergingData} labelKey="label" leftKey="Imports" rightKey="Exports" leftLabel="Imports" rightLabel="Exports" formatValue={formatCurrency} />
        </ChartCard>
      </SectionBlock>

      {/* Data Table */}
      <SectionBlock>
        <ChartCard title={`Mode Detail (${latestYear || '—'})`}
          downloadData={{
            summary: { data: tableData, filename: 'mode-detail', columns: DL.modeDetail },
            detail: { data: filtered, filename: 'mode-detail-full', columns: PAGE_TRANSBORDER_COLS },
          }}
        >
          <DataTable data={tableData} columns={tableColumns} pageSize={15} />
        </ChartCard>
        <p className="text-sm text-text-secondary mt-3 italic">
          Note: Air/vessel modes are only available starting November 2003. Earlier years include surface and pipeline modes only.
        </p>
      </SectionBlock>
    </DashboardLayout>
  )
}
