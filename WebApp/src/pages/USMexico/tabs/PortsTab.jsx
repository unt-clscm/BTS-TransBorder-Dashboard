/**
 * USMexico Ports Tab — Port map, rankings, trends, mode breakdown, and detail table.
 * This is the primary port-focused view, emphasizing US-wide vs Texas comparison.
 */
import { useMemo, useState, useEffect } from 'react'
import { formatCurrency, getAxisFormatter } from '@/lib/transborderHelpers'
import { CHART_COLORS, formatWeight, getMetricField, getMetricFormatter, getMetricLabel, hasSurfaceExports, isAllSurfaceExports } from '@/lib/chartColors'
import WeightCaveatBanner from '@/components/ui/WeightCaveatBanner'
import { usePortCoordinates, buildMapPorts } from '@/hooks/usePortMapData'
import SectionBlock from '@/components/ui/SectionBlock'
import ChartCard from '@/components/ui/ChartCard'
import LineChart from '@/components/charts/LineChart'
import BarChart from '@/components/charts/BarChart'
import StackedBarChart from '@/components/charts/StackedBarChart'
import DonutChart from '@/components/charts/DonutChart'
import DataTable from '@/components/ui/DataTable'
import InsightCallout from '@/components/ui/InsightCallout'
import PortMap from '@/components/maps/PortMap'
import YearRangeFilter from '@/components/filters/YearRangeFilter'
import TopNSelector from '@/components/filters/TopNSelector'
import { TrendingDown, Globe, Star } from 'lucide-react'
import { useTexasOverlay, useTexasPorts, TEXAS_COLOR } from '@/hooks/useTexasOverlay'
import { DL, PAGE_PORT_COLS, PAGE_TRANSBORDER_COLS } from '@/lib/downloadColumns'
import { ANNOTATIONS_MODERN as HISTORICAL_ANNOTATIONS } from '@/lib/annotations'

export default function PortsTab({
  filteredPorts,
  filteredPortsNoYear,
  filteredSummary,
  filteredSummaryNoYear,
  containerizationTrade,
  latestYear,
  metric = 'value',
  showTexas = true,
}) {
  const { portCoords, portCoordsError } = usePortCoordinates()

  /* ── metric derived values ─────────────────────────────────────────── */
  const valueField = getMetricField(metric)
  const fmtValue = getMetricFormatter(metric)
  const metricLabel = getMetricLabel(metric)
  const weightAllNA = metric === 'weight' && isAllSurfaceExports(filteredPorts)
  const weightPartial = !weightAllNA && metric === 'weight' && hasSurfaceExports(filteredPorts)

  /* ── Texas overlay data ─────────────────────────────────────────────── */
  const _txOverlay = useTexasOverlay(filteredPorts, valueField, showTexas)
  const txPorts = useTexasPorts(filteredPorts, showTexas)

  // Texas trade trend data (for overlay line on the trade trends chart)
  const txTradeTrendData = useMemo(() => {
    if (!showTexas) return []
    const byYearType = new Map()
    filteredPortsNoYear.forEach((d) => {
      if (d.State !== 'Texas') return
      const key = `${d.Year}|${d.TradeType}`
      if (!byYearType.has(key)) byYearType.set(key, { year: d.Year, value: 0, TradeType: `Texas ${d.TradeType || 'Total'}` })
      byYearType.get(key).value += (d[valueField] || 0)
    })
    return Array.from(byYearType.values()).sort((a, b) => a.year - b.year)
  }, [filteredPortsNoYear, valueField, showTexas])

  // Texas trade balance (for overlay line)
  const txTradeBalanceData = useMemo(() => {
    if (!showTexas) return []
    const byYear = new Map()
    filteredPortsNoYear.forEach((d) => {
      if (d.State !== 'Texas' || !d.Year) return
      if (!byYear.has(d.Year)) byYear.set(d.Year, { year: d.Year, Exports: 0, Imports: 0 })
      const row = byYear.get(d.Year)
      if (d.TradeType === 'Export') row.Exports += d[valueField] || 0
      else if (d.TradeType === 'Import') row.Imports += d[valueField] || 0
    })
    return Array.from(byYear.values())
      .map((d) => ({ year: d.year, value: d.Exports - d.Imports, BalanceSeries: 'Texas' }))
      .sort((a, b) => a.year - b.year)
  }, [filteredPortsNoYear, valueField, showTexas])

  // Texas mode breakdown (for callout text)
  const txModeBreakdown = useMemo(() => {
    if (!showTexas || !latestYear) return null
    const txLatest = filteredPorts.filter((d) => d.State === 'Texas' && d.Year === latestYear)
    const total = txLatest.reduce((s, d) => s + (d[valueField] || 0), 0)
    const byMode = new Map()
    txLatest.forEach((d) => {
      const mode = d.Mode || 'Unknown'
      byMode.set(mode, (byMode.get(mode) || 0) + (d[valueField] || 0))
    })
    const top = [...byMode.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
    return { total, top, byMode }
  }, [filteredPorts, latestYear, valueField, showTexas])

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
  const mapPorts = useMemo(() => {
    if (!showTexas || !portCoords) return buildMapPorts(filteredPorts, portCoords)
    const isTexasPort = (d) => {
      const code = d.PortCode?.replace(/\D/g, '')
      return portCoords[code]?.state === 'Texas'
    }
    const txRows = filteredPorts.filter(isTexasPort)
    const otherRows = filteredPorts.filter((d) => !isTexasPort(d))
    return [...buildMapPorts(otherRows, portCoords, 'Other'), ...buildMapPorts(txRows, portCoords, 'Texas')]
  }, [filteredPorts, portCoords, showTexas])

  const portMapGroupColors = showTexas ? {
    Texas: { fill: TEXAS_COLOR, stroke: '#8a3d00' },
    Other: { fill: '#0056a9', stroke: '#003d75' },
  } : null

  const portMapLegendGroups = showTexas ? [
    { label: 'Texas Port', color: TEXAS_COLOR },
    { label: 'Other U.S. Port', color: '#0056a9' },
  ] : null

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

  /* ── Texas mode comparison ────────────────────────────────────────── */
  const txModeCompareData = useMemo(() => {
    if (!showTexas || !txModeBreakdown?.byMode || !modeDonutData.length) return []
    return modeDonutData
      .map((d) => {
        const txVal = txModeBreakdown.byMode.get(d.label) || 0
        const pct = d.value > 0 ? ((txVal / d.value) * 100).toFixed(0) : 0
        return { label: d.label, value: txVal, pct }
      })
      .filter((d) => d.value > 0)
  }, [showTexas, txModeBreakdown, modeDonutData])

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

  /* ── Texas mode composition by year (stacked bar — Texas only) ──── */
  const txModeByYearData = useMemo(() => {
    if (!showTexas) return null
    const byYearMode = new Map()
    const allModes = new Set()
    filteredPortsNoYear.forEach((d) => {
      if (d.State !== 'Texas') return
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
      .filter((d) => d.year >= trendYearRange.startYear && d.year <= trendYearRange.endYear)
    rows.forEach((row) => modes.forEach((m) => { if (!(m in row)) row[m] = 0 }))
    return rows.length ? { data: rows, stackKeys: modes } : null
  }, [showTexas, filteredPortsNoYear, valueField, trendYearRange])

  /* ── port detail table ────────────────────────────────────────────── */
  const portTableData = useMemo(() => {
    const byPort = new Map()
    filteredPorts.forEach((d) => {
      const port = d.Port || 'Unknown'
      if (!byPort.has(port)) byPort.set(port, { Port: port, State: d.State || '—', Total: 0, Exports: 0, Imports: 0, WeightLb: null })
      const row = byPort.get(port)
      row.Total += (d[valueField] || 0)
      if (d.TradeType === 'Export') row.Exports += (d[valueField] || 0)
      if (d.TradeType === 'Import') row.Imports += (d[valueField] || 0)
      if (d.WeightLb != null) row.WeightLb = (row.WeightLb || 0) + d.WeightLb
    })
    return Array.from(byPort.values()).sort((a, b) => b.Total - a.Total)
  }, [filteredPorts, valueField])

  const portTableColumns = [
    { key: 'Port', label: 'Port' },
    { key: 'State', label: 'State' },
    { key: 'Total', label: `Total ${metricLabel}`, render: (v) => fmtValue(v) },
    { key: 'Exports', label: 'Exports', render: (v) => fmtValue(v) },
    { key: 'Imports', label: 'Imports', render: (v) => fmtValue(v) },
    { key: 'WeightLb', label: 'Weight (lb)', render: (v) => formatWeight(v) },
  ]

  /* ── Trade balance by year (exports minus imports) ─────────────── */
  const tradeBalanceData = useMemo(() => {
    const byYear = new Map()
    filteredSummaryNoYear.forEach((d) => {
      if (!d.Year) return
      if (!byYear.has(d.Year)) byYear.set(d.Year, { year: d.Year, Exports: 0, Imports: 0 })
      const row = byYear.get(d.Year)
      if (d.TradeType === 'Export') row.Exports += d[valueField] || 0
      else if (d.TradeType === 'Import') row.Imports += d[valueField] || 0
    })
    return Array.from(byYear.values())
      .map((d) => ({ year: d.year, value: d.Exports - d.Imports }))
      .sort((a, b) => a.year - b.year)
  }, [filteredSummaryNoYear, valueField])

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

      {/* Weight caveat banner */}
      {(weightAllNA || weightPartial) && (
        <SectionBlock>
          <div className="max-w-4xl mx-auto">
            <WeightCaveatBanner allNA={weightAllNA} />
          </div>
        </SectionBlock>
      )}

      {/* Port Map */}
      <SectionBlock alt>
        <ChartCard title="U.S.-Mexico Border Ports" subtitle={`Ports of entry sized by ${metricLabel.toLowerCase()}`}>
          {portCoordsError && (
            <div className="mb-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              Port coordinates failed to load ({portCoordsError}). Map markers may be missing.
            </div>
          )}
          <PortMap ports={mapPorts} formatValue={fmtValue} center={[29.5, -104.0]} zoom={5} height="480px" groupColors={portMapGroupColors} legendGroups={portMapLegendGroups} />
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
          <LineChart data={showTexas ? [...tradeTrendData, ...txTradeTrendData.filter(d => d.year >= trendYearRange.startYear && d.year <= trendYearRange.endYear)] : tradeTrendData} xKey="year" yKey="value" seriesKey="TradeType" formatY={getAxisFormatter(tradeMax, metric === 'weight' ? '' : '$')} formatValue={fmtValue} annotations={HISTORICAL_ANNOTATIONS} />
        </ChartCard>
      </SectionBlock>

      {/* Trade Balance — always in dollars */}
      <SectionBlock alt>
        <ChartCard title="U.S.–Mexico Trade Balance" subtitle="Exports minus imports — negative values indicate a trade deficit with Mexico">
          <LineChart data={showTexas ? [...tradeBalanceData.map(d => ({ ...d, BalanceSeries: 'U.S. Total' })), ...txTradeBalanceData] : tradeBalanceData} xKey="year" yKey="value" seriesKey={showTexas ? 'BalanceSeries' : undefined} formatValue={formatCurrency} showArea={!showTexas} annotations={HISTORICAL_ANNOTATIONS} />
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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ChartCard
            title={`Trade by Mode (${latestYear || '---'})`}
            subtitle={showTexas
              ? `National totals — Texas share shown in labels; orange bars indicate Texas handles ≥60%`
              : `Distribution of ${metricLabel.toLowerCase()} across transportation modes`}
            downloadData={{ summary: { data: modeDonutData, filename: 'us-mexico-trade-by-mode', columns: DL.modeRank } }}
          >
            <BarChart
              data={modeDonutData}
              xKey="label"
              yKey="value"
              horizontal
              formatValue={fmtValue}
              colorAccessor={(d) => {
                if (showTexas) {
                  const txRow = txModeCompareData.find((t) => t.label === d.label)
                  const pct = txRow ? Number(txRow.pct) : 0
                  return pct >= 60 ? TEXAS_COLOR : CHART_COLORS[modeDonutData.indexOf(d) % CHART_COLORS.length]
                }
                return CHART_COLORS[modeDonutData.indexOf(d) % CHART_COLORS.length]
              }}
              labelAccessor={showTexas ? (d) => {
                const txRow = txModeCompareData.find((t) => t.label === d.label)
                return txRow ? `${fmtValue(d.value)}  ·  TX: ${txRow.pct}%` : fmtValue(d.value)
              } : undefined}
            />
          </ChartCard>
          <ChartCard
            title={showTexas && txModeByYearData ? 'Texas Mode Composition by Year' : 'Mode Composition by Year'}
            subtitle={showTexas && txModeByYearData
              ? `How Texas's ${metricLabel.toLowerCase()} is split across modes — toggle off to see national`
              : `How ${metricLabel.toLowerCase()} is distributed across modes over time`}
            headerRight={<YearRangeFilter years={allYears} startYear={trendYearRange.startYear} endYear={trendYearRange.endYear} onChange={setTrendYearRange} />}
            downloadData={{ summary: { data: (showTexas && txModeByYearData ? txModeByYearData.data : modeByYearData.data), filename: showTexas ? 'texas-mode-by-year' : 'us-mexico-mode-by-year' } }}
          >
            <StackedBarChart
              data={showTexas && txModeByYearData ? txModeByYearData.data : modeByYearData.data}
              xKey="year"
              stackKeys={showTexas && txModeByYearData ? txModeByYearData.stackKeys : modeByYearData.stackKeys}
              formatY={getAxisFormatter(tradeMax, metric === 'weight' ? '' : '$')}
              formatValue={fmtValue}
            />
          </ChartCard>
        </div>
        {showTexas && txModeCompareData.length > 0 && (() => {
          const pipeline = txModeCompareData.find((d) => d.label === 'Pipeline')
          const ftz = txModeCompareData.find((d) => d.label === 'Foreign Trade Zones (FTZs)')
          const truck = txModeCompareData.find((d) => d.label === 'Truck')
          if (!truck) return null
          const specialModes = [pipeline && `Pipeline (${pipeline.pct}%)`, ftz && `FTZ (${ftz.pct}%)`].filter(Boolean)
          return (
            <div className="mt-6">
              <InsightCallout
                finding={`Texas handles ${truck.pct}% of all Truck freight — and is even more dominant in specialized modes: ${specialModes.join(' and ')}. These reflect Texas's unique energy infrastructure and border geography.`}
                icon={Star}
                variant="texas"
              />
            </div>
          )
        })()}
      </SectionBlock>

      {/* Top N Ports */}
      <SectionBlock>
        <ChartCard
          title={`Top ${portTopN} Ports by ${metricLabel}`}
          subtitle={`Ports of entry ranked by total ${metricLabel.toLowerCase()}`}
          headerRight={<TopNSelector value={portTopN} onChange={setPortTopN} />}
          downloadData={{ summary: { data: topPortsData, filename: 'us-mexico-top-ports', columns: DL.portRank } }}
        >
          <BarChart data={topPortsData} xKey="label" yKey="value" horizontal formatY={getAxisFormatter(portMax, metric === 'weight' ? '' : '$')} formatValue={fmtValue} color={CHART_COLORS[0]} colorAccessor={showTexas ? (d) => txPorts.has(d.label) ? TEXAS_COLOR : CHART_COLORS[0] : undefined} />
        </ChartCard>
        {showTexas && topPortsData.length > 0 && (() => {
          const txCount = topPortsData.filter((d) => txPorts.has(d.label)).length
          const txValue = topPortsData.filter((d) => txPorts.has(d.label)).reduce((s, d) => s + d.value, 0)
          const total = topPortsData.reduce((s, d) => s + d.value, 0)
          const pct = total > 0 ? ((txValue / total) * 100).toFixed(0) : 0
          return txCount > 0 ? (
            <div className="mt-4 max-w-7xl mx-auto">
              <InsightCallout
                finding={`${txCount} of the top ${topPortsData.length} ports are in Texas (shown in burnt orange), accounting for ${pct}% of the total across these ports.`}
                icon={Star}
                variant="texas"
              />
            </div>
          ) : null
        })()}
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

      {/* Containerization & Re-Export Analysis */}
      {containerizationTrade?.length > 0 && (() => {
        // Containerization by mode (donut)
        const CONT_LABELS = { '0': 'Not Containerized', '1': 'Containerized', 'X': 'Not Applicable', 'U': 'Unknown' }
        const contByType = new Map()
        containerizationTrade.forEach((d) => {
          const label = CONT_LABELS[d.ContCode] || d.ContCode
          contByType.set(label, (contByType.get(label) || 0) + (d[valueField] || 0))
        })
        const contDonutData = Array.from(contByType, ([label, value]) => ({ label, value }))
          .filter((d) => d.value > 0)
          .sort((a, b) => b.value - a.value)

        // Re-exports: DF=2 as share of total exports
        const DF_LABELS = { '1': 'Domestic Origin', '2': 'Re-Exports (Foreign Origin)', 'U': 'Imports (N/A)' }
        const dfByType = new Map()
        containerizationTrade.forEach((d) => {
          if (d.TradeType !== 'Export') return
          const label = DF_LABELS[d.DF] || d.DF
          dfByType.set(label, (dfByType.get(label) || 0) + (d[valueField] || 0))
        })
        const dfDonutData = Array.from(dfByType, ([label, value]) => ({ label, value }))
          .filter((d) => d.value > 0)
          .sort((a, b) => b.value - a.value)

        // Containerized trade trend
        const contByYear = new Map()
        containerizationTrade.forEach((d) => {
          if (d.ContCode !== '1') return
          if (!d.Year) return
          contByYear.set(d.Year, (contByYear.get(d.Year) || 0) + (d[valueField] || 0))
        })
        const contTrend = Array.from(contByYear, ([year, value]) => ({ year, value })).sort((a, b) => a.year - b.year)

        // Texas containerized trade trend
        const txContTrend = showTexas
          ? Array.from(
              containerizationTrade
                .filter((d) => d.ContCode === '1' && txPorts.has(d.Port) && d.Year)
                .reduce((m, d) => {
                  m.set(d.Year, (m.get(d.Year) || 0) + (d[valueField] || 0))
                  return m
                }, new Map()),
              ([year, value]) => ({ year, value })
            ).sort((a, b) => a.year - b.year)
          : []

        return (
          <SectionBlock alt>
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-2.5 mb-5">
                <Globe size={20} className="text-brand-blue" />
                <h3 className="text-xl font-bold text-text-primary">Logistics Structure</h3>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ChartCard title="Containerization Status" subtitle="Share of U.S.-Mexico trade by containerization — most surface freight moves non-containerized">
                  <DonutChart data={contDonutData} nameKey="label" valueKey="value" formatValue={fmtValue} />
                </ChartCard>
                <ChartCard title="Export Origin: Domestic vs Re-Exports" subtitle="U.S. exports to Mexico — are goods made in the U.S. or passing through from elsewhere?">
                  <DonutChart data={dfDonutData} nameKey="label" valueKey="value" formatValue={fmtValue} />
                </ChartCard>
              </div>
              {contTrend.length > 2 && (
                <div className="mt-6">
                  <ChartCard title="Containerized Trade Growth" subtitle={`${metricLabel} of containerized freight crossing the U.S.-Mexico border by year`}>
                    <LineChart
                      data={showTexas && txContTrend.length > 0
                        ? [...contTrend.map((d) => ({ ...d, Series: 'National' })), ...txContTrend.map((d) => ({ ...d, Series: 'Texas' }))]
                        : contTrend}
                      xKey="year"
                      yKey="value"
                      seriesKey={showTexas && txContTrend.length > 0 ? 'Series' : undefined}
                      formatValue={fmtValue}
                      showArea={!(showTexas && txContTrend.length > 0)}
                      annotations={HISTORICAL_ANNOTATIONS}
                      colorOverrides={showTexas && txContTrend.length > 0 ? { Texas: TEXAS_COLOR } : undefined}
                    />
                  </ChartCard>
                </div>
              )}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <InsightCallout
                  finding="About 96% of U.S.-Mexico surface freight moves non-containerized — truck trailers and rail cars dominate. Containerized trade is small but has tripled since 2007, mostly on rail."
                  context="Containerization matters for port infrastructure planning: container handling needs different equipment than trailer-based trade."
                />
                <InsightCallout
                  finding="Roughly 22% of U.S. exports to Mexico are actually re-exports — goods that originated in a third country, passed through the U.S., and were then shipped south."
                  context="This means the U.S. functions partly as a distribution hub for Mexico, not just a manufacturer."
                  variant="highlight"
                />
              </div>
              {showTexas && (() => {
                const txCont = containerizationTrade.filter((d) => txPorts.has(d.Port))
                const txTotal = txCont.reduce((s, d) => s + (d[valueField] || 0), 0)
                const natTotal = containerizationTrade.reduce((s, d) => s + (d[valueField] || 0), 0)
                const sharePct = natTotal > 0 ? ((txTotal / natTotal) * 100).toFixed(0) : 0

                // Texas containerization rate
                const txContainerized = txCont.filter((d) => d.ContCode === '1').reduce((s, d) => s + (d[valueField] || 0), 0)
                const txContRate = txTotal > 0 ? ((txContainerized / txTotal) * 100).toFixed(1) : 0

                // Texas re-export share (exports only)
                const txExports = txCont.filter((d) => d.TradeType === 'Export')
                const txTotalExports = txExports.reduce((s, d) => s + (d[valueField] || 0), 0)
                const txReExports = txExports.filter((d) => d.DF === '2').reduce((s, d) => s + (d[valueField] || 0), 0)
                const txReExportPct = txTotalExports > 0 ? ((txReExports / txTotalExports) * 100).toFixed(0) : null

                if (!txTotal) return null
                return (
                  <div className="mt-4">
                    <InsightCallout
                      finding={`Texas ports handle ${sharePct}% of all U.S.-Mexico logistics freight. Only ${txContRate}% of Texas freight is containerized — even lower than the national average — reflecting truck and pipeline dominance.${txReExportPct !== null ? ` Texas's re-export share is ${txReExportPct}% (vs ~22% nationally), consistent with its role as a direct manufacturing and energy gateway.` : ''}`}
                      icon={Star}
                      variant="texas"
                    />
                  </div>
                )
              })()}
            </div>
          </SectionBlock>
        )
      })()}

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
          <DataTable columns={portTableColumns} data={portTableData} rowClassAccessor={showTexas ? (row) => row.State === 'Texas' ? 'bg-[#bf5700]/[0.06] font-medium' : '' : undefined} />
        </ChartCard>
      </SectionBlock>
    </>
  )
}
