/**
 * USMexico Ports Tab — Port map, rankings, trends, mode breakdown, and detail table.
 * This is the primary port-focused view, emphasizing US-wide vs Texas comparison.
 */
import { useMemo, useState, useEffect } from 'react'
import { formatCurrency, getAxisFormatter } from '@/lib/transborderHelpers'
import { CHART_COLORS, formatWeight, getMetricField, getMetricFormatter, getMetricLabel } from '@/lib/chartColors'
import { usePortCoordinates, buildMapPorts } from '@/hooks/usePortMapData'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import LineChart from '@/components/charts/LineChart'
import DonutChart from '@/components/charts/DonutChart'
import BarChart from '@/components/charts/BarChart'
import StackedBarChart from '@/components/charts/StackedBarChart'
import DataTable from '@/components/ui/DataTable'
import InsightCallout from '@/components/ui/InsightCallout'
import PortMap from '@/components/maps/PortMap'
import YearRangeFilter from '@/components/filters/YearRangeFilter'
import TopNSelector from '@/components/filters/TopNSelector'
import { TrendingDown, Globe } from 'lucide-react'
import { DL, PAGE_PORT_COLS, PAGE_TRANSBORDER_COLS } from '@/lib/downloadColumns'

const HISTORICAL_ANNOTATIONS = [
  { x: 2008.5, x2: 2009.5, label: '2008 Financial Crisis', color: 'rgba(245,158,11,0.08)', labelColor: '#b45309' },
  { x: 2019.5, x2: 2020.5, label: 'COVID-19', color: 'rgba(217,13,13,0.08)', labelColor: '#d90d0d' },
]

export default function PortsTab({
  filteredPorts,
  filteredPortsNoYear,
  filteredSummary,
  filteredSummaryNoYear,
  latestYear,
  metric = 'value',
}) {
  const { portCoords, portCoordsError } = usePortCoordinates()

  /* ── metric derived values ─────────────────────────────────────────── */
  const valueField = getMetricField(metric)
  const fmtValue = getMetricFormatter(metric)
  const metricLabel = getMetricLabel(metric)

  /* ── chart-level state ─────────────────────────────────────────────── */
  const allYears = useMemo(() => {
    const ys = new Set()
    filteredSummaryNoYear.forEach((d) => { if (d.Year) ys.add(d.Year) })
    return [...ys].sort((a, b) => a - b)
  }, [filteredSummaryNoYear])

  const [trendYearRange, setTrendYearRange] = useState({ startYear: 0, endYear: 9999 })
  const [portTopN, setPortTopN] = useState(20)
  const [portTrendTopN, setPortTrendTopN] = useState(5)

  useEffect(() => {
    if (allYears.length) {
      setTrendYearRange({ startYear: allYears[0], endYear: allYears[allYears.length - 1] })
    }
  }, [allYears])

  /* ── map markers ──────────────────────────────────────────────────── */
  const mapPorts = useMemo(
    () => buildMapPorts(filteredPorts, portCoords),
    [filteredPorts, portCoords],
  )

  /* ── trade trends by Year+TradeType (line chart) ──────────────────── */
  const tradeTrendData = useMemo(() => {
    const byYearType = new Map()
    filteredSummaryNoYear.forEach((d) => {
      const key = `${d.Year}|${d.TradeType}`
      if (!byYearType.has(key)) byYearType.set(key, { year: d.Year, value: 0, TradeType: d.TradeType || 'Total' })
      byYearType.get(key).value += (d[valueField] || 0)
    })
    return Array.from(byYearType.values())
      .sort((a, b) => a.year - b.year)
      .filter(d => d.year >= trendYearRange.startYear && d.year <= trendYearRange.endYear)
  }, [filteredSummaryNoYear, valueField, trendYearRange])

  /* ── donut — trade by mode (latest year) ──────────────────────────── */
  const modeDonutData = useMemo(() => {
    if (!latestYear) return []
    const latestData = filteredSummary.filter((d) => d.Year === latestYear)
    const byMode = new Map()
    latestData.forEach((d) => {
      const mode = d.Mode || 'Unknown'
      byMode.set(mode, (byMode.get(mode) || 0) + (d[valueField] || 0))
    })
    return Array.from(byMode, ([label, value]) => ({ label, value }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [filteredSummary, latestYear, valueField])

  /* ── top N ports (horizontal bar) ──────────────────────────────────── */
  const topPortsData = useMemo(() => {
    const byPort = new Map()
    filteredPorts.forEach((d) => {
      const port = d.Port || 'Unknown'
      byPort.set(port, (byPort.get(port) || 0) + (d[valueField] || 0))
    })
    return Array.from(byPort, ([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, portTopN)
  }, [filteredPorts, valueField, portTopN])

  /* ── top N port trends (multi-series line) ──────────────────────────── */
  const topPortTrendData = useMemo(() => {
    const byPort = new Map()
    filteredPortsNoYear.forEach((d) => {
      const port = d.Port || 'Unknown'
      byPort.set(port, (byPort.get(port) || 0) + (d[valueField] || 0))
    })
    const topN = [...byPort.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, portTrendTopN)
      .map(([name]) => name)
    const topNSet = new Set(topN)

    const byYearPort = new Map()
    filteredPortsNoYear.forEach((d) => {
      const port = d.Port || 'Unknown'
      if (!topNSet.has(port)) return
      const key = `${d.Year}|${port}`
      if (!byYearPort.has(key)) byYearPort.set(key, { year: d.Year, value: 0, Port: port })
      byYearPort.get(key).value += (d[valueField] || 0)
    })
    return Array.from(byYearPort.values())
      .sort((a, b) => a.year - b.year || a.Port.localeCompare(b.Port))
      .filter(d => d.year >= trendYearRange.startYear && d.year <= trendYearRange.endYear)
  }, [filteredPortsNoYear, valueField, portTrendTopN, trendYearRange])

  /* ── mode composition by year (stacked bar) ───────────────────────── */
  const modeByYearData = useMemo(() => {
    const byYearMode = new Map()
    const allModes = new Set()
    filteredSummaryNoYear.forEach((d) => {
      const mode = d.Mode || 'Unknown'
      allModes.add(mode)
      const key = d.Year
      if (!byYearMode.has(key)) byYearMode.set(key, { year: key })
      const row = byYearMode.get(key)
      row[mode] = (row[mode] || 0) + (d[valueField] || 0)
    })
    const modes = [...allModes].sort()
    const rows = Array.from(byYearMode.values())
      .sort((a, b) => a.year - b.year)
      .filter(d => d.year >= trendYearRange.startYear && d.year <= trendYearRange.endYear)
    rows.forEach((row) => modes.forEach((m) => { if (!(m in row)) row[m] = 0 }))
    return { data: rows, stackKeys: modes }
  }, [filteredSummaryNoYear, valueField, trendYearRange])

  /* ── port detail table ────────────────────────────────────────────── */
  const portTableData = useMemo(() => {
    const byPort = new Map()
    filteredPorts.forEach((d) => {
      const port = d.Port || 'Unknown'
      if (!byPort.has(port)) byPort.set(port, { Port: port, State: d.State || '—', Total: 0, Exports: 0, Imports: 0, WeightLb: 0 })
      const row = byPort.get(port)
      row.Total += (d.TradeValue || 0)
      if (d.TradeType === 'Export') row.Exports += (d.TradeValue || 0)
      if (d.TradeType === 'Import') row.Imports += (d.TradeValue || 0)
      row.WeightLb += (d.WeightLb || 0)
    })
    return Array.from(byPort.values()).sort((a, b) => b.Total - a.Total)
  }, [filteredPorts])

  const portTableColumns = [
    { key: 'Port', label: 'Port' },
    { key: 'State', label: 'State' },
    { key: 'Total', label: 'Total Trade ($)', render: (v) => formatCurrency(v) },
    { key: 'Exports', label: 'Exports ($)', render: (v) => formatCurrency(v) },
    { key: 'Imports', label: 'Imports ($)', render: (v) => formatCurrency(v) },
    { key: 'WeightLb', label: 'Weight (lb)', render: (v) => v ? formatWeight(v) : '—' },
  ]

  /* ── Trade balance by year (exports minus imports) ─────────────── */
  const tradeBalanceData = useMemo(() => {
    const byYear = new Map()
    filteredSummaryNoYear.forEach((d) => {
      if (!d.Year) return
      if (!byYear.has(d.Year)) byYear.set(d.Year, { year: d.Year, Exports: 0, Imports: 0 })
      const row = byYear.get(d.Year)
      if (d.TradeType === 'Export') row.Exports += d.TradeValue || 0
      else if (d.TradeType === 'Import') row.Imports += d.TradeValue || 0
    })
    return Array.from(byYear.values())
      .map((d) => ({ year: d.year, value: d.Exports - d.Imports }))
      .sort((a, b) => a.year - b.year)
  }, [filteredSummaryNoYear])

  const tradeMax = Math.max(...tradeTrendData.map((d) => d.value), 0)
  const portMax = Math.max(...topPortsData.map((d) => d.value), 0)
  const portTrendMax = Math.max(...topPortTrendData.map((d) => d.value), 0)

  return (
    <>
      {/* Narrative Intro */}
      <SectionBlock>
        <div className="max-w-4xl mx-auto">
          <p className="text-lg text-text-secondary leading-relaxed">
            U.S.–Mexico surface freight trade exceeded <strong>$840 billion</strong> in 2024, making Mexico
            the United States' largest trading partner. Roughly <strong>66% of this trade</strong> flows
            through Texas border ports, with Laredo alone handling more freight than any other land port
            on either the Mexican or Canadian border.
          </p>
        </div>
      </SectionBlock>

      {/* Port Map */}
      <SectionBlock alt>
        <ChartCard title="U.S.-Mexico Border Ports" subtitle={`Ports of entry sized by ${metricLabel.toLowerCase()}`}>
          {portCoordsError && (
            <div className="mb-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              Port coordinates failed to load ({portCoordsError}). Map markers may be missing.
            </div>
          )}
          <PortMap ports={mapPorts} formatValue={fmtValue} center={[29.5, -104.0]} zoom={5} height="480px" />
        </ChartCard>
      </SectionBlock>

      <SectionBlock>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-7xl mx-auto">
          <InsightCallout
            finding="Texas handles as much U.S.-Mexico trade as all other border states combined — and then some."
            context="California, Arizona, and New Mexico share the remaining ~34%."
          />
          <InsightCallout
            finding="Truck moves ~80% of U.S.–Mexico surface freight by value, a share that has remained remarkably stable since 2007."
            variant="highlight"
            icon={Globe}
          />
        </div>
      </SectionBlock>

      {/* Trade Trends */}
      <SectionBlock>
        <ChartCard
          title="U.S.-Mexico Trade Trends"
          subtitle={`Annual ${metricLabel.toLowerCase()} by trade type`}
          headerRight={<YearRangeFilter years={allYears} startYear={trendYearRange.startYear} endYear={trendYearRange.endYear} onChange={setTrendYearRange} />}
          downloadData={{
            summary: { data: tradeTrendData, filename: 'us-mexico-trade-trends', columns: DL.tradeTrendSeries },
            detail: { data: filteredSummary, filename: 'us-mexico-trade-detail', columns: PAGE_TRANSBORDER_COLS },
          }}
        >
          <LineChart data={tradeTrendData} xKey="year" yKey="value" seriesKey="TradeType" formatY={getAxisFormatter(tradeMax, metric === 'weight' ? '' : '$')} formatValue={fmtValue} annotations={HISTORICAL_ANNOTATIONS} />
        </ChartCard>
      </SectionBlock>

      {/* Trade Balance — always in dollars */}
      <SectionBlock alt>
        <ChartCard title="U.S.–Mexico Trade Balance" subtitle="Exports minus imports — negative values indicate a trade deficit with Mexico">
          <LineChart data={tradeBalanceData} xKey="year" yKey="value" formatValue={formatCurrency} showArea annotations={HISTORICAL_ANNOTATIONS} />
        </ChartCard>
        <div className="mt-4 max-w-7xl mx-auto">
          <InsightCallout
            finding="The U.S. trade deficit with Mexico has grown from -$74B in 2007 to over -$190B in 2024, driven by growing imports of manufactured goods, vehicles, and electronics."
            icon={TrendingDown}
            variant="warning"
          />
        </div>
      </SectionBlock>

      {/* Trade by Mode */}
      <SectionBlock alt>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title={`Trade by Mode (${latestYear || '---'})`}
            subtitle={`Distribution of ${metricLabel.toLowerCase()} across transportation modes`}
            downloadData={{ summary: { data: modeDonutData, filename: 'us-mexico-trade-by-mode', columns: DL.modeRank } }}
          >
            <DonutChart data={modeDonutData} nameKey="label" valueKey="value" formatValue={fmtValue} />
          </ChartCard>
          <ChartCard
            title="Mode Composition by Year"
            subtitle={`How ${metricLabel.toLowerCase()} is distributed across modes over time`}
            headerRight={<YearRangeFilter years={allYears} startYear={trendYearRange.startYear} endYear={trendYearRange.endYear} onChange={setTrendYearRange} />}
            downloadData={{ summary: { data: modeByYearData.data, filename: 'us-mexico-mode-by-year' } }}
          >
            <StackedBarChart data={modeByYearData.data} xKey="year" stackKeys={modeByYearData.stackKeys} formatY={getAxisFormatter(tradeMax, metric === 'weight' ? '' : '$')} formatValue={fmtValue} />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* Top N Ports */}
      <SectionBlock>
        <ChartCard
          title={`Top ${portTopN} Ports by ${metricLabel}`}
          subtitle={`Ports of entry ranked by total ${metricLabel.toLowerCase()}`}
          headerRight={<TopNSelector value={portTopN} onChange={setPortTopN} />}
          downloadData={{ summary: { data: topPortsData, filename: 'us-mexico-top-ports', columns: DL.portRank } }}
        >
          <BarChart data={topPortsData} xKey="label" yKey="value" horizontal formatY={getAxisFormatter(portMax, metric === 'weight' ? '' : '$')} formatValue={fmtValue} color={CHART_COLORS[0]} />
        </ChartCard>
      </SectionBlock>

      {/* Top N Port Trends */}
      <SectionBlock alt>
        <ChartCard
          title={`Top ${portTrendTopN} Port Trends`}
          subtitle={`Annual ${metricLabel.toLowerCase()} for the largest ports`}
          headerRight={<><TopNSelector value={portTrendTopN} onChange={setPortTrendTopN} /><YearRangeFilter years={allYears} startYear={trendYearRange.startYear} endYear={trendYearRange.endYear} onChange={setTrendYearRange} /></>}
          downloadData={{
            summary: { data: topPortTrendData, filename: 'us-mexico-top5-port-trends', columns: { year: 'Year', value: metricLabel, Port: 'Port' } },
            detail: { data: filteredPortsNoYear, filename: 'us-mexico-ports-detail', columns: PAGE_PORT_COLS },
          }}
        >
          <LineChart data={topPortTrendData} xKey="year" yKey="value" seriesKey="Port" formatY={getAxisFormatter(portTrendMax, metric === 'weight' ? '' : '$')} formatValue={fmtValue} annotations={HISTORICAL_ANNOTATIONS} />
        </ChartCard>
      </SectionBlock>

      {/* Port Detail Table */}
      <SectionBlock>
        <ChartCard
          title="All Ports"
          subtitle="Port-level trade summary with exports, imports, and weight"
          downloadData={{
            summary: { data: portTableData, filename: 'us-mexico-port-detail', columns: DL.portDetail },
            detail: { data: filteredPorts, filename: 'us-mexico-ports-raw', columns: PAGE_PORT_COLS },
          }}
        >
          <DataTable columns={portTableColumns} data={portTableData} />
        </ChartCard>
      </SectionBlock>
    </>
  )
}
