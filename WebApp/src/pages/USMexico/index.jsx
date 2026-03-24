import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { DollarSign, ArrowUpRight, ArrowDownLeft, MapPin, Truck, TrendingUp } from 'lucide-react'
import { useTransborderStore } from '@/stores/transborderStore'
import { formatCurrency, buildFilterOptions, applyStandardFilters, getAxisFormatter } from '@/lib/transborderHelpers'
import { CHART_COLORS } from '@/lib/chartColors'
import { usePortCoordinates, buildMapPorts } from '@/hooks/usePortMapData'
import DashboardLayout from '@/components/layout/DashboardLayout'
import FilterMultiSelect from '@/components/filters/FilterMultiSelect'
import FilterSelect from '@/components/filters/FilterSelect'
import HeroStardust from '@/components/ui/HeroStardust'
import StatCard from '@/components/ui/StatCard'
import ChartCard from '@/components/ui/ChartCard'
import SectionBlock from '@/components/ui/SectionBlock'
import LineChart from '@/components/charts/LineChart'
import DonutChart from '@/components/charts/DonutChart'
import BarChart from '@/components/charts/BarChart'
import StackedBarChart from '@/components/charts/StackedBarChart'
import DataTable from '@/components/ui/DataTable'
import DatasetError from '@/components/ui/DatasetError'
import PortMap from '@/components/maps/PortMap'
import { DL, PAGE_TRANSBORDER_COLS, PAGE_PORT_COLS } from '@/lib/downloadColumns'

/* ── COVID annotation ─────────────────────────────────────────────── */
const COVID_ANNOTATION = [{ x: 2019.5, x2: 2020.5, label: 'COVID-19', color: 'rgba(217,13,13,0.08)', labelColor: '#d90d0d' }]

export default function USMexicoPage() {
  const { usTransborder, usMexicoPorts, loading, datasetErrors, loadDataset } = useTransborderStore()

  /* ── lazy-load datasets on mount ──────────────────────────────────── */
  useEffect(() => {
    loadDataset('usMexicoPorts')
  }, [loadDataset])

  /* ── local filter state (not in store) ──────────────────────────── */
  const [yearFilter, setYearFilter] = useState([])
  const [tradeTypeFilter, setTradeTypeFilter] = useState('')
  const [modeFilter, setModeFilter] = useState([])

  /* ── base datasets: Mexico only ──────────────────────────────────── */
  const usMexicoData = useMemo(() => {
    if (!usTransborder?.length) return []
    return usTransborder.filter((d) => d.Country === 'Mexico')
  }, [usTransborder])

  const portsData = useMemo(() => usMexicoPorts || [], [usMexicoPorts])

  /* ── port coordinates for map ──────────────────────────────────── */
  const { portCoords, portCoordsError } = usePortCoordinates()

  /* ── filter options (computed from data) ─────────────────────────── */
  const filterOptions = useMemo(() => {
    const opts = buildFilterOptions(portsData, ['Year', 'TradeType', 'Mode'])
    return {
      year: (opts.Year || []).map(String),
      tradeType: opts.TradeType || [],
      mode: opts.Mode || [],
    }
  }, [portsData])

  /* ── apply filters to port data ──────────────────────────────────── */
  const filteredPorts = useMemo(
    () => applyStandardFilters(portsData, { Year: yearFilter, TradeType: tradeTypeFilter, Mode: modeFilter }),
    [portsData, yearFilter, tradeTypeFilter, modeFilter],
  )

  /* ── map markers ────────────────────────────────────────────────── */
  const mapPorts = useMemo(
    () => buildMapPorts(filteredPorts, portCoords),
    [filteredPorts, portCoords],
  )

  /* ── apply filters to summary data ───────────────────────────────── */
  const filteredSummary = useMemo(
    () => applyStandardFilters(usMexicoData, { Year: yearFilter, TradeType: tradeTypeFilter, Mode: modeFilter }),
    [usMexicoData, yearFilter, tradeTypeFilter, modeFilter],
  )

  /* ── filteredNoYear: same filters except year (for trend charts) ── */
  const filteredSummaryNoYear = useMemo(
    () => applyStandardFilters(usMexicoData, { TradeType: tradeTypeFilter, Mode: modeFilter }),
    [usMexicoData, tradeTypeFilter, modeFilter],
  )

  /* ── latest year ─────────────────────────────────────────────────── */
  const latestYear = useMemo(() => {
    if (!filteredSummary.length) return null
    return Math.max(...filteredSummary.map((d) => d.Year).filter(Number.isFinite))
  }, [filteredSummary])

  const prevYear = latestYear ? latestYear - 1 : null

  /* ── KPI StatCards ───────────────────────────────────────────────── */
  const stats = useMemo(() => {
    if (!filteredSummary.length || !latestYear) return null
    const latest = filteredSummary.filter((d) => d.Year === latestYear)
    const prev = prevYear ? filteredSummary.filter((d) => d.Year === prevYear) : []

    const totalTrade = latest.reduce((s, d) => s + (d.TradeValue || 0), 0)
    const prevTrade = prev.reduce((s, d) => s + (d.TradeValue || 0), 0)
    const tradeChange = prevTrade ? (totalTrade - prevTrade) / prevTrade : 0

    const exports = latest.filter((d) => d.TradeType === 'Export').reduce((s, d) => s + (d.TradeValue || 0), 0)
    const imports = latest.filter((d) => d.TradeType === 'Import').reduce((s, d) => s + (d.TradeValue || 0), 0)

    // Active port count from port-level data
    const latestPorts = filteredPorts.filter((d) => d.Year === latestYear)
    const portCount = new Set(latestPorts.map((d) => d.Port).filter(Boolean)).size

    return { totalTrade, tradeChange, exports, imports, portCount }
  }, [filteredSummary, filteredPorts, latestYear, prevYear])

  /* ── Section 3: Trade trends by Year+TradeType (line chart) ─────── */
  const tradeTrendData = useMemo(() => {
    const byYearType = new Map()
    filteredSummaryNoYear.forEach((d) => {
      const key = `${d.Year}|${d.TradeType}`
      if (!byYearType.has(key)) byYearType.set(key, { year: d.Year, value: 0, TradeType: d.TradeType || 'Total' })
      byYearType.get(key).value += (d.TradeValue || 0)
    })
    return Array.from(byYearType.values()).sort((a, b) => a.year - b.year)
  }, [filteredSummaryNoYear])

  /* ── Section 4: Donut — Trade by Mode (latest year) ─────────────── */
  const modeDonutData = useMemo(() => {
    if (!latestYear) return []
    const latestData = filteredSummary.filter((d) => d.Year === latestYear)
    const byMode = new Map()
    latestData.forEach((d) => {
      const mode = d.Mode || 'Unknown'
      byMode.set(mode, (byMode.get(mode) || 0) + (d.TradeValue || 0))
    })
    return Array.from(byMode, ([label, value]) => ({ label, value }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [filteredSummary, latestYear])

  /* ── Section 5: Top 15 Ports (horizontal bar) ───────────────────── */
  const topPortsData = useMemo(() => {
    const byPort = new Map()
    filteredPorts.forEach((d) => {
      const port = d.Port || 'Unknown'
      byPort.set(port, (byPort.get(port) || 0) + (d.TradeValue || 0))
    })
    return Array.from(byPort, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15)
  }, [filteredPorts])

  /* ── Section 6: Mode composition by year (stacked bar) ──────────── */
  const modeByYearData = useMemo(() => {
    const byYearMode = new Map()
    const allModes = new Set()
    filteredSummaryNoYear.forEach((d) => {
      const mode = d.Mode || 'Unknown'
      allModes.add(mode)
      const key = d.Year
      if (!byYearMode.has(key)) byYearMode.set(key, { year: key })
      const row = byYearMode.get(key)
      row[mode] = (row[mode] || 0) + (d.TradeValue || 0)
    })
    // Ensure all modes exist on every row
    const modes = [...allModes].sort()
    const rows = Array.from(byYearMode.values()).sort((a, b) => a.year - b.year)
    rows.forEach((row) => {
      modes.forEach((m) => {
        if (!(m in row)) row[m] = 0
      })
    })
    return { data: rows, stackKeys: modes }
  }, [filteredSummaryNoYear])

  /* ── Section 7: Port detail table ───────────────────────────────── */
  const portTableData = useMemo(() => {
    const byPort = new Map()
    filteredPorts.forEach((d) => {
      const port = d.Port || 'Unknown'
      if (!byPort.has(port)) byPort.set(port, { Port: port, State: d.State || '—', Total: 0, Exports: 0, Imports: 0 })
      const row = byPort.get(port)
      row.Total += (d.TradeValue || 0)
      if (d.TradeType === 'Export') row.Exports += (d.TradeValue || 0)
      if (d.TradeType === 'Import') row.Imports += (d.TradeValue || 0)
    })
    return Array.from(byPort.values()).sort((a, b) => b.Total - a.Total)
  }, [filteredPorts])

  const portTableColumns = [
    { key: 'Port', label: 'Port', wrap: true },
    { key: 'State', label: 'State' },
    { key: 'Total', label: 'Total Trade', render: (v) => formatCurrency(v) },
    { key: 'Exports', label: 'Exports', render: (v) => formatCurrency(v) },
    { key: 'Imports', label: 'Imports', render: (v) => formatCurrency(v) },
  ]

  /* ── active filter count & tags ──────────────────────────────────── */
  const activeCount = yearFilter.length + (tradeTypeFilter ? 1 : 0) + modeFilter.length

  const activeTags = useMemo(() => {
    const tags = []
    yearFilter.forEach((v) => tags.push({
      group: 'Year', label: v,
      onRemove: () => setYearFilter((prev) => prev.filter((x) => x !== v)),
    }))
    if (tradeTypeFilter) tags.push({
      group: 'Trade Type', label: tradeTypeFilter,
      onRemove: () => setTradeTypeFilter(''),
    })
    modeFilter.forEach((v) => tags.push({
      group: 'Mode', label: v,
      onRemove: () => setModeFilter((prev) => prev.filter((x) => x !== v)),
    }))
    return tags
  }, [yearFilter, tradeTypeFilter, modeFilter])

  const resetFilters = () => {
    setYearFilter([])
    setTradeTypeFilter('')
    setModeFilter([])
  }

  /* ── render: loading ─────────────────────────────────────────────── */
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

  /* ── filter controls ─────────────────────────────────────────────── */
  const filterControls = (
    <>
      <FilterMultiSelect
        label="Year"
        value={yearFilter}
        options={filterOptions.year}
        onChange={setYearFilter}
      />
      <FilterSelect
        label="Trade Type"
        value={tradeTypeFilter}
        options={filterOptions.tradeType}
        onChange={setTradeTypeFilter}
      />
      <FilterMultiSelect
        label="Mode"
        value={modeFilter}
        options={filterOptions.mode}
        onChange={setModeFilter}
      />
    </>
  )

  /* ── hero ─────────────────────────────────────────────────────────── */
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

  /* ── axis formatters ─────────────────────────────────────────────── */
  const tradeMax = Math.max(...tradeTrendData.map((d) => d.value), 0)
  const portMax = Math.max(...topPortsData.map((d) => d.value), 0)

  return (
    <DashboardLayout
      hero={heroSection}
      filters={filterControls}
      onResetAll={resetFilters}
      activeCount={activeCount}
      activeTags={activeTags}
      filteredEmpty={!filteredSummary.length && !filteredPorts.length}
    >
      {/* Intro */}
      <SectionBlock>
        <div className="space-y-4">
          <p className="text-base text-text-secondary leading-relaxed">
            The U.S.&ndash;Mexico trade corridor is the largest bilateral surface freight relationship
            in North America. This page aggregates TransBorder data across all modes of surface
            transportation&mdash;truck, rail, pipeline, and vessel&mdash;to provide a national perspective
            on the cross-border freight market.
          </p>
          <p className="text-base text-text-secondary/70 leading-relaxed italic">
            For a detailed view of individual ports of entry, see the{' '}
            <Link to="/us-mexico/ports" className="text-brand-blue underline hover:text-brand-blue/80">
              U.S.&ndash;Mexico Ports
            </Link>{' '}
            page.
          </p>
        </div>
      </SectionBlock>

      {/* Port Map */}
      <SectionBlock alt>
        <ChartCard title="U.S.-Mexico Border Ports" subtitle="Ports of entry sized by trade value — click a port for details">
          {portCoordsError && (
            <div className="mb-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              Port coordinates failed to load ({portCoordsError}). Map markers may be missing.
            </div>
          )}
          <PortMap
            ports={mapPorts}
            formatValue={formatCurrency}
            center={[29.5, -104.0]}
            zoom={5}
            height="480px"
          />
        </ChartCard>
      </SectionBlock>

      {/* KPI StatCards */}
      <SectionBlock>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
          <StatCard
            label={`Total U.S.-Mexico Trade (${latestYear || '---'})`}
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
            label={`Active Ports (${latestYear || '---'})`}
            value={stats ? String(stats.portCount) : '---'}
            highlight icon={MapPin} delay={300}
          />
        </div>
      </SectionBlock>

      {/* Trade Trends (Line Chart) */}
      <SectionBlock alt>
        <ChartCard
          title="U.S.-Mexico Trade Trends"
          subtitle="Annual trade value by trade type"
          downloadData={{
            summary: { data: tradeTrendData, filename: 'us-mexico-trade-trends', columns: DL.tradeTrendSeries },
            detail:  { data: filteredSummary, filename: 'us-mexico-trade-detail', columns: PAGE_TRANSBORDER_COLS },
          }}
        >
          <LineChart
            data={tradeTrendData}
            xKey="year"
            yKey="value"
            seriesKey="TradeType"
            formatY={getAxisFormatter(tradeMax, '$')}
            annotations={COVID_ANNOTATION}
          />
        </ChartCard>
      </SectionBlock>

      {/* Trade by Mode (Donut) */}
      <SectionBlock>
        <ChartCard
          title={`Trade by Mode (${latestYear || '---'})`}
          subtitle="Distribution of trade value across transportation modes"
          downloadData={{
            summary: { data: modeDonutData, filename: 'us-mexico-trade-by-mode', columns: DL.modeRank },
          }}
        >
          <DonutChart
            data={modeDonutData}
            nameKey="label"
            valueKey="value"
            formatValue={formatCurrency}
          />
        </ChartCard>
      </SectionBlock>

      {/* Top 15 Ports (Horizontal Bar) */}
      <SectionBlock alt>
        <ChartCard
          title="Top 15 Ports by Trade Value"
          subtitle="Ports of entry ranked by total trade"
          downloadData={{
            summary: { data: topPortsData, filename: 'us-mexico-top-ports', columns: DL.portRank },
          }}
        >
          <BarChart
            data={topPortsData}
            xKey="label"
            yKey="value"
            horizontal
            formatY={getAxisFormatter(portMax, '$')}
            color={CHART_COLORS[0]}
          />
        </ChartCard>
      </SectionBlock>

      {/* Mode Composition by Year (Stacked Bar) */}
      <SectionBlock>
        <ChartCard
          title="Mode Composition by Year"
          subtitle="How trade value is distributed across modes over time"
          downloadData={{
            summary: { data: modeByYearData.data, filename: 'us-mexico-mode-by-year' },
          }}
        >
          <StackedBarChart
            data={modeByYearData.data}
            xKey="year"
            stackKeys={modeByYearData.stackKeys}
            formatY={getAxisFormatter(tradeMax, '$')}
          />
        </ChartCard>
      </SectionBlock>

      {/* Port Detail Table */}
      <SectionBlock alt>
        <ChartCard
          title="Port Detail"
          subtitle="Trade values by port of entry"
          downloadData={{
            summary: { data: portTableData, filename: 'us-mexico-port-detail', columns: DL.portDetail },
            detail:  { data: filteredPorts, filename: 'us-mexico-ports-raw', columns: PAGE_PORT_COLS },
          }}
        >
          <DataTable
            columns={portTableColumns}
            data={portTableData}
          />
        </ChartCard>
      </SectionBlock>
    </DashboardLayout>
  )
}
