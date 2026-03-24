import { useMemo, useState, useEffect } from 'react'
import { DollarSign, MapPin, Award, Truck } from 'lucide-react'
import { useTransborderStore } from '@/stores/transborderStore'
import { formatCurrency, buildFilterOptions, getAxisFormatter } from '@/lib/transborderHelpers'
import { CHART_COLORS } from '@/lib/chartColors'
import { MEXICAN_CROSSINGS } from '@/lib/portUtils'
import DashboardLayout from '@/components/layout/DashboardLayout'
import FilterMultiSelect from '@/components/filters/FilterMultiSelect'
import FilterSelect from '@/components/filters/FilterSelect'
import HeroStardust from '@/components/ui/HeroStardust'
import StatCard from '@/components/ui/StatCard'
import ChartCard from '@/components/ui/ChartCard'
import SectionBlock from '@/components/ui/SectionBlock'
import BarChart from '@/components/charts/BarChart'
import LineChart from '@/components/charts/LineChart'
import DataTable from '@/components/ui/DataTable'
import PortMap from '@/components/maps/PortMap'
import DatasetError from '@/components/ui/DatasetError'
import { DL, PAGE_PORT_COLS } from '@/lib/downloadColumns'

/* ── COVID annotation ─────────────────────────────────────────────── */
const COVID_ANNOTATION = [{ x: 2019.5, x2: 2020.5, label: 'COVID-19', color: 'rgba(217,13,13,0.08)', labelColor: '#d90d0d' }]

export default function USMexicoPortsPage() {
  const { usMexicoPorts, loading, datasetErrors, loadDataset } = useTransborderStore()

  /* ── lazy-load on mount ──────────────────────────────────────────── */
  useEffect(() => {
    loadDataset('usMexicoPorts')
  }, [loadDataset])

  /* ── port coordinates (fetched once from static JSON) ──────────── */
  const [portCoords, setPortCoords] = useState(null)
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/port_coordinates.json`)
      .then((r) => r.json())
      .then(setPortCoords)
      .catch(() => setPortCoords({}))
  }, [])

  /* ── local filter state ──────────────────────────────────────────── */
  const [yearFilter, setYearFilter] = useState([])
  const [tradeTypeFilter, setTradeTypeFilter] = useState('')
  const [modeFilter, setModeFilter] = useState([])
  const [stateFilter, setStateFilter] = useState([])

  /* ── base data ───────────────────────────────────────────────────── */
  const portsData = useMemo(() => usMexicoPorts || [], [usMexicoPorts])

  /* ── filter options ──────────────────────────────────────────────── */
  const filterOptions = useMemo(() => {
    const opts = buildFilterOptions(portsData, ['Year', 'TradeType', 'Mode', 'State'])
    return {
      year: (opts.Year || []).map(String),
      tradeType: opts.TradeType || [],
      mode: opts.Mode || [],
      state: opts.State || [],
    }
  }, [portsData])

  /* ── filtered data ───────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let data = portsData
    if (yearFilter.length) data = data.filter((d) => yearFilter.includes(String(d.Year)))
    if (tradeTypeFilter) data = data.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter.length) data = data.filter((d) => modeFilter.includes(d.Mode))
    if (stateFilter.length) data = data.filter((d) => stateFilter.includes(d.State))
    return data
  }, [portsData, yearFilter, tradeTypeFilter, modeFilter, stateFilter])

  /* ── filteredNoYear (for trend charts) ───────────────────────────── */
  const filteredNoYear = useMemo(() => {
    let data = portsData
    if (tradeTypeFilter) data = data.filter((d) => d.TradeType === tradeTypeFilter)
    if (modeFilter.length) data = data.filter((d) => modeFilter.includes(d.Mode))
    if (stateFilter.length) data = data.filter((d) => stateFilter.includes(d.State))
    return data
  }, [portsData, tradeTypeFilter, modeFilter, stateFilter])

  /* ── latest year ─────────────────────────────────────────────────── */
  const latestYear = useMemo(() => {
    if (!filtered.length) return null
    return Math.max(...filtered.map((d) => d.Year).filter(Number.isFinite))
  }, [filtered])

  /* ── KPI StatCards ───────────────────────────────────────────────── */
  const stats = useMemo(() => {
    if (!filtered.length || !latestYear) return null
    const latest = filtered.filter((d) => d.Year === latestYear)

    const totalTrade = latest.reduce((s, d) => s + (d.TradeValue || 0), 0)
    const portCount = new Set(latest.map((d) => d.Port).filter(Boolean)).size

    // Top port by trade value
    const byPort = new Map()
    latest.forEach((d) => {
      const port = d.Port || 'Unknown'
      byPort.set(port, (byPort.get(port) || 0) + (d.TradeValue || 0))
    })
    const sortedPorts = [...byPort.entries()].sort((a, b) => b[1] - a[1])
    const topPortName = sortedPorts.length ? sortedPorts[0][0] : '---'

    // Top mode by trade value
    const byMode = new Map()
    latest.forEach((d) => {
      const mode = d.Mode || 'Unknown'
      byMode.set(mode, (byMode.get(mode) || 0) + (d.TradeValue || 0))
    })
    const sortedModes = [...byMode.entries()].sort((a, b) => b[1] - a[1])
    const topMode = sortedModes.length ? sortedModes[0][0] : '---'

    return { totalTrade, portCount, topPortName, topMode }
  }, [filtered, latestYear])

  /* ── Section 4: Ports ranked by trade value (horizontal bar) ────── */
  const portRankData = useMemo(() => {
    const byPort = new Map()
    filtered.forEach((d) => {
      const port = d.Port || 'Unknown'
      byPort.set(port, (byPort.get(port) || 0) + (d.TradeValue || 0))
    })
    return Array.from(byPort, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 20)
  }, [filtered])

  /* ── Section 5: Top 5 port trends (multi-series line) ───────────── */
  const topPortTrendData = useMemo(() => {
    // Identify top 5 ports by total trade across all years (no year filter)
    const byPort = new Map()
    filteredNoYear.forEach((d) => {
      const port = d.Port || 'Unknown'
      byPort.set(port, (byPort.get(port) || 0) + (d.TradeValue || 0))
    })
    const top5 = [...byPort.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name)

    const top5Set = new Set(top5)

    // Aggregate by year + port
    const byYearPort = new Map()
    filteredNoYear.forEach((d) => {
      const port = d.Port || 'Unknown'
      if (!top5Set.has(port)) return
      const key = `${d.Year}|${port}`
      if (!byYearPort.has(key)) byYearPort.set(key, { year: d.Year, value: 0, Port: port })
      byYearPort.get(key).value += (d.TradeValue || 0)
    })

    return Array.from(byYearPort.values()).sort((a, b) => a.year - b.year || a.Port.localeCompare(b.Port))
  }, [filteredNoYear])

  /* ── Section 6: Port detail table ───────────────────────────────── */
  const portTableData = useMemo(() => {
    const byPort = new Map()
    filtered.forEach((d) => {
      const port = d.Port || 'Unknown'
      if (!byPort.has(port)) byPort.set(port, { Port: port, State: d.State || '---', Total: 0, Exports: 0, Imports: 0 })
      const row = byPort.get(port)
      row.Total += (d.TradeValue || 0)
      if (d.TradeType === 'Export') row.Exports += (d.TradeValue || 0)
      if (d.TradeType === 'Import') row.Imports += (d.TradeValue || 0)
    })
    return Array.from(byPort.values()).sort((a, b) => b.Total - a.Total)
  }, [filtered])

  const portTableColumns = [
    { key: 'Port', label: 'Port', wrap: true },
    { key: 'State', label: 'State' },
    { key: 'Total', label: 'Total Trade', render: (v) => formatCurrency(v) },
    { key: 'Exports', label: 'Exports', render: (v) => formatCurrency(v) },
    { key: 'Imports', label: 'Imports', render: (v) => formatCurrency(v) },
  ]

  /* ── Map markers (aggregate trade by port, join coordinates) ────── */
  const mapPorts = useMemo(() => {
    if (!portCoords) return []
    const byPort = new Map()
    filtered.forEach((d) => {
      if (!d.Port) return
      const code = d.PortCode?.replace(/\D/g, '')
      if (!byPort.has(d.Port)) {
        const coords = portCoords[code]
        byPort.set(d.Port, {
          name: d.Port,
          lat: coords?.lat ?? null,
          lng: coords?.lon ?? null,
          value: 0,
          portCode: d.PortCode,
        })
      }
      byPort.get(d.Port).value += d.TradeValue || 0
    })
    return Array.from(byPort.values()).filter((p) => p.lat != null)
  }, [filtered, portCoords])

  /* ── active filter count & tags ──────────────────────────────────── */
  const activeCount = yearFilter.length + (tradeTypeFilter ? 1 : 0) + modeFilter.length + stateFilter.length

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
    stateFilter.forEach((v) => tags.push({
      group: 'State', label: v,
      onRemove: () => setStateFilter((prev) => prev.filter((x) => x !== v)),
    }))
    return tags
  }, [yearFilter, tradeTypeFilter, modeFilter, stateFilter])

  const resetFilters = () => {
    setYearFilter([])
    setTradeTypeFilter('')
    setModeFilter([])
    setStateFilter([])
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
          <p className="text-base text-text-secondary">Loading port data...</p>
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
      <FilterMultiSelect
        label="State"
        value={stateFilter}
        options={filterOptions.state}
        onChange={setStateFilter}
        searchable
      />
    </>
  )

  /* ── hero ─────────────────────────────────────────────────────────── */
  const heroSection = (
    <div className="gradient-blue text-white relative overflow-visible">
      <HeroStardust seed={59} animate />
      <div className="container-chrome py-10 md:py-14 relative">
        <h2 className="text-2xl md:text-3xl font-bold text-balance text-white">
          U.S.&ndash;Mexico Ports of Entry
        </h2>
        <p className="text-white/70 mt-2 text-base">
          Port-level analysis of TransBorder surface freight crossing the U.S.&ndash;Mexico border
          (2007&ndash;{latestYear || '...'}).
        </p>
      </div>
    </div>
  )

  /* ── axis formatters ─────────────────────────────────────────────── */
  const barMax = Math.max(...portRankData.map((d) => d.value), 0)
  const trendMax = Math.max(...topPortTrendData.map((d) => d.value), 0)

  return (
    <DashboardLayout
      hero={heroSection}
      filters={filterControls}
      onResetAll={resetFilters}
      activeCount={activeCount}
      activeTags={activeTags}
      filteredEmpty={!filtered.length}
    >
      {/* Intro */}
      <SectionBlock>
        <p className="text-base text-text-secondary leading-relaxed">
          U.S.&ndash;Mexico border ports of entry are the gateways through which surface freight
          moves between the two countries. This page provides a port-level breakdown of trade
          volumes, modal composition, and trends over time.
        </p>
      </SectionBlock>

      {/* KPI StatCards */}
      <SectionBlock alt>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
          <StatCard
            label={`Total Port Trade (${latestYear || '---'})`}
            value={stats ? formatCurrency(stats.totalTrade) : '---'}
            highlight variant="primary" icon={DollarSign} delay={0}
          />
          <StatCard
            label={`Active Ports (${latestYear || '---'})`}
            value={stats ? String(stats.portCount) : '---'}
            highlight icon={MapPin} delay={100}
          />
          <StatCard
            label={`Top Port (${latestYear || '---'})`}
            value={stats?.topPortName || '---'}
            highlight icon={Award} delay={200}
          />
          <StatCard
            label={`Top Mode (${latestYear || '---'})`}
            value={stats?.topMode || '---'}
            highlight icon={Truck} delay={300}
          />
        </div>
      </SectionBlock>

      {/* Interactive port map */}
      <SectionBlock>
        <ChartCard title="Port Locations" subtitle="U.S.–Mexico border ports of entry — bubble size reflects trade value">
          <PortMap
            ports={mapPorts}
            mexicanCrossings={MEXICAN_CROSSINGS}
            formatValue={formatCurrency}
            center={[29.5, -104.0]}
            zoom={5}
            height="520px"
          />
        </ChartCard>
      </SectionBlock>

      {/* Ports ranked by trade value (horizontal bar) */}
      <SectionBlock alt>
        <ChartCard
          title="Ports Ranked by Trade Value"
          subtitle="Top 20 ports of entry by total freight value"
          downloadData={{
            summary: { data: portRankData, filename: 'us-mexico-ports-ranked', columns: DL.portRank },
          }}
        >
          <BarChart
            data={portRankData}
            xKey="label"
            yKey="value"
            horizontal
            formatY={getAxisFormatter(barMax, '$')}
            color={CHART_COLORS[0]}
          />
        </ChartCard>
      </SectionBlock>

      {/* Top 5 port trends (multi-series line) */}
      <SectionBlock>
        <ChartCard
          title="Top 5 Port Trends"
          subtitle="Annual trade value for the five largest ports"
          downloadData={{
            summary: { data: topPortTrendData, filename: 'us-mexico-top5-port-trends', columns: { year: 'Year', value: 'Trade Value ($)', Port: 'Port' } },
            detail:  { data: filteredNoYear, filename: 'us-mexico-ports-detail', columns: PAGE_PORT_COLS },
          }}
        >
          <LineChart
            data={topPortTrendData}
            xKey="year"
            yKey="value"
            seriesKey="Port"
            formatY={getAxisFormatter(trendMax, '$')}
            annotations={COVID_ANNOTATION}
          />
        </ChartCard>
      </SectionBlock>

      {/* Port detail table */}
      <SectionBlock alt>
        <ChartCard
          title="All Ports"
          subtitle="Port-level trade summary with exports and imports"
          downloadData={{
            summary: { data: portTableData, filename: 'us-mexico-all-ports', columns: DL.portDetail },
            detail:  { data: filtered, filename: 'us-mexico-ports-raw', columns: PAGE_PORT_COLS },
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
