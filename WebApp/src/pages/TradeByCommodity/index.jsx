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
import TreemapChart from '@/components/charts/TreemapChart'
import HeroStardust from '@/components/ui/HeroStardust'
import { DollarSign, Layers, Award, Package } from 'lucide-react'
import { DL, PAGE_COMMODITY_COLS } from '@/lib/downloadColumns'

export default function TradeByCommodityPage() {
  const { commodityDetail, loadDataset } = useTransborderStore()

  /* ── lazy-load dataset on mount ─────────────────────────────────── */
  useEffect(() => { loadDataset('commodityDetail') }, [loadDataset])

  /* ── loading spinner ────────────────────────────────────────────── */
  if (!commodityDetail) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-base text-text-secondary">Loading commodity data...</p>
        </div>
      </div>
    )
  }

  return <TradeByCommodityInner data={commodityDetail} />
}

/* ── Inner component (renders once data is loaded) ────────────────── */
function TradeByCommodityInner({ data }) {
  /* ── local filters ──────────────────────────────────────────────── */
  const [selectedYears, setSelectedYears] = useState([])
  const [tradeType, setTradeType] = useState('')
  const [selectedModes, setSelectedModes] = useState([])
  const [country, setCountry] = useState('')
  const [treemapDrill, setTreemapDrill] = useState(null)

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

  /* ── stat cards ─────────────────────────────────────────────────── */
  const totalTrade = useMemo(() => latestFiltered.reduce((s, d) => s + (d.TradeValue || 0), 0), [latestFiltered])

  const groupCount = useMemo(() => {
    return new Set(latestFiltered.map((d) => d.CommodityGroup).filter(Boolean)).size
  }, [latestFiltered])

  const topGroup = useMemo(() => {
    const map = new Map()
    for (const d of latestFiltered) {
      const g = d.CommodityGroup || 'Unknown'
      map.set(g, (map.get(g) || 0) + (d.TradeValue || 0))
    }
    let best = null
    for (const [name, val] of map) {
      if (!best || val > best.value) best = { name, value: val }
    }
    return best
  }, [latestFiltered])

  const topCommodity = useMemo(() => {
    const map = new Map()
    for (const d of latestFiltered) {
      const c = d.Commodity || 'Unknown'
      map.set(c, (map.get(c) || 0) + (d.TradeValue || 0))
    }
    let best = null
    for (const [name, val] of map) {
      if (!best || val > best.value) best = { name, value: val }
    }
    return best
  }, [latestFiltered])

  /* ── treemap: top 12 commodity groups, or drilled-down HS codes ── */
  const treemapData = useMemo(() => {
    if (treemapDrill) {
      // Level 2: individual commodities within the selected group
      const map = new Map()
      for (const d of latestFiltered) {
        if (d.CommodityGroup !== treemapDrill) continue
        const label = d.Commodity || d.HSCode || 'Unknown'
        map.set(label, (map.get(label) || 0) + (d.TradeValue || 0))
      }
      return [...map.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
    }
    // Level 1: commodity groups
    const map = new Map()
    for (const d of latestFiltered) {
      const g = d.CommodityGroup || 'Unknown'
      map.set(g, (map.get(g) || 0) + (d.TradeValue || 0))
    }
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12)
  }, [latestFiltered, treemapDrill])

  /* ── bar: top 10 individual commodities (horizontal) ────────────── */
  const topCommoditiesBar = useMemo(() => {
    const map = new Map()
    for (const d of latestFiltered) {
      const c = d.Commodity || 'Unknown'
      map.set(c, (map.get(c) || 0) + (d.TradeValue || 0))
    }
    return [...map.entries()]
      .map(([Commodity, TradeValue]) => ({ Commodity, TradeValue }))
      .sort((a, b) => b.TradeValue - a.TradeValue)
      .slice(0, 10)
  }, [latestFiltered])

  /* ── line: top 5 commodity group trends ─────────────────────────── */
  const trendData = useMemo(() => {
    // Find top 5 groups by total across all years
    const totals = new Map()
    for (const d of filteredNoYear) {
      const g = d.CommodityGroup || 'Unknown'
      totals.set(g, (totals.get(g) || 0) + (d.TradeValue || 0))
    }
    const top5 = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([g]) => g)
    const top5Set = new Set(top5)

    // Aggregate by year + group
    const map = new Map()
    for (const d of filteredNoYear) {
      const g = d.CommodityGroup || 'Unknown'
      if (!top5Set.has(g)) continue
      const key = `${d.Year}-${g}`
      if (!map.has(key)) map.set(key, { Year: d.Year, CommodityGroup: g, TradeValue: 0 })
      map.get(key).TradeValue += d.TradeValue || 0
    }
    return [...map.values()].sort((a, b) => a.Year - b.Year)
  }, [filteredNoYear])

  /* ── data table ─────────────────────────────────────────────────── */
  const tableData = useMemo(() => {
    const map = new Map()
    for (const d of latestFiltered) {
      const key = `${d.CommodityGroup}||${d.Commodity}||${d.HSCode}`
      if (!map.has(key)) {
        map.set(key, {
          Group: d.CommodityGroup || 'Unknown',
          Commodity: d.Commodity || 'Unknown',
          HSCode: d.HSCode || '—',
          Total: 0, Exports: 0, Imports: 0,
        })
      }
      const entry = map.get(key)
      entry.Total += d.TradeValue || 0
      if (d.TradeType === 'Export') entry.Exports += d.TradeValue || 0
      if (d.TradeType === 'Import') entry.Imports += d.TradeValue || 0
    }
    return [...map.values()].sort((a, b) => b.Total - a.Total)
  }, [latestFiltered])

  const tableColumns = [
    { key: 'Group', label: 'Group' },
    { key: 'Commodity', label: 'Commodity' },
    { key: 'HSCode', label: 'HS Code' },
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
      <HeroStardust seed={77} animate />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-14 relative">
        <h2 className="text-3xl md:text-4xl font-bold text-white text-balance">
          TransBorder Trade by Commodity
        </h2>
        <p className="text-white/80 mt-3 text-base md:text-lg max-w-3xl">
          Exploring commodity composition of U.S. cross-border surface trade (2007+)
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
            label="Commodity Groups"
            value={String(groupCount)}
            icon={Layers}
            delay={80}
          />
          <StatCard
            label="Top Group"
            value={topGroup ? formatCurrency(topGroup.value) : '$0'}
            trendLabel={topGroup?.name || '—'}
            icon={Award}
            delay={160}
          />
          <StatCard
            label="Top Commodity"
            value={topCommodity ? formatCurrency(topCommodity.value) : '$0'}
            trendLabel={topCommodity?.name || '—'}
            icon={Package}
            delay={240}
          />
        </div>
      </SectionBlock>

      {/* Treemap: Commodity Groups with drilldown */}
      <SectionBlock alt>
        <ChartCard
          title={treemapDrill
            ? `${treemapDrill} — HS 2-Digit Detail`
            : `Top Commodity Groups (${latestYear || '—'})`}
          subtitle={treemapDrill
            ? 'Click a cell to explore, or use the breadcrumb above to go back'
            : 'Trade value by commodity group — click to drill into HS 2-digit codes'}
          downloadData={{ summary: { data: treemapData, filename: 'commodity-groups', columns: DL.commodityGroupRank } }}
        >
          {treemapDrill && (
            <div className="text-sm text-text-secondary mb-2">
              <button onClick={() => setTreemapDrill(null)} className="text-brand-blue hover:underline font-medium">
                All Groups
              </button>
              <span className="mx-1.5">&gt;</span>
              <span className="text-text-primary font-medium">{treemapDrill}</span>
            </div>
          )}
          <TreemapChart
            data={treemapData}
            labelKey="label"
            valueKey="value"
            formatValue={formatCurrency}
            onCellClick={treemapDrill ? undefined : (name) => setTreemapDrill(name)}
          />
        </ChartCard>
      </SectionBlock>

      {/* Bar: Top 10 Individual Commodities (horizontal) */}
      <SectionBlock>
        <ChartCard title={`Top 10 Commodities (${latestYear || '—'})`} subtitle="Individual commodities ranked by trade value"
          downloadData={{ summary: { data: topCommoditiesBar, filename: 'top-10-commodities', columns: { Commodity: 'Commodity', TradeValue: 'Trade Value ($)' } } }}
        >
          <BarChart data={topCommoditiesBar} xKey="Commodity" yKey="TradeValue" horizontal formatValue={formatCurrency} />
        </ChartCard>
      </SectionBlock>

      {/* Line: Top 5 Commodity Group Trends */}
      <SectionBlock alt>
        <ChartCard title="Top 5 Commodity Group Trends" subtitle="Annual trade value for the five largest commodity groups"
          downloadData={{ summary: { data: trendData, filename: 'commodity-group-trends', columns: { Year: 'Year', TradeValue: 'Trade Value ($)', CommodityGroup: 'Commodity Group' } } }}
        >
          <LineChart data={trendData} xKey="Year" yKey="TradeValue" seriesKey="CommodityGroup" formatValue={formatCurrency} />
        </ChartCard>
      </SectionBlock>

      {/* Data Table */}
      <SectionBlock>
        <ChartCard title={`Commodity Detail (${latestYear || '—'})`}
          downloadData={{
            summary: { data: tableData, filename: 'commodity-detail', columns: DL.commodityDetail },
            detail: { data: filtered, filename: 'commodity-detail-full', columns: PAGE_COMMODITY_COLS },
          }}
        >
          <DataTable data={tableData} columns={tableColumns} pageSize={15} />
        </ChartCard>
      </SectionBlock>
    </DashboardLayout>
  )
}
